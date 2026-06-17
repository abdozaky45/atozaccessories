import mongoose, { Types } from "mongoose";
import OrderModel from "../../Model/Order/OrderModel";
import { ProductOrder, UserInfoSnapshot, ShippingSnapshot } from "../../Model/Order/Iorder";
import ProductVariantModel from "../../Model/ProductVariant/ProductVariantModel";
import ProductModel from "../../Model/Product/ProductModel";
import OfferModel from "../../Model/Offers/OfferModel";
import { findUserInformationById } from "../User/AuthService";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import { orderStatusType } from "../../Utils/OrderStatusType";
import { ApiError } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";

// ─── Utility ──────────────────────────────────────────────────────────────────

export const updateProductSoldOutStatus = async (productIds: Types.ObjectId[]) => {
  for (const productId of productIds) {
    const hasStock = await ProductVariantModel.exists({
      product: productId,
      availableItems: { $gt: 0 },
    });
    await ProductModel.findByIdAndUpdate(productId, { isSoldOut: !hasStock });
  }
};

// ─── Offer calculation ────────────────────────────────────────────────────────

interface OfferResult {
  appliedOffer: Types.ObjectId | null;
  finalProducts: ProductOrder[];
  discount: number;
  freeShipping: boolean;
}

const cheapestProduct = (list: ProductOrder[]): ProductOrder =>
  list.reduce((min, p) => (p.itemPrice < min.itemPrice ? p : min));

const calculateOrderOffers = async (
  products: ProductOrder[],
  subTotal: number,
  shippingCost: number
): Promise<OfferResult> => {
  const noOffer: OfferResult = { appliedOffer: null, finalProducts: products, discount: 0, freeShipping: false };

  const activeOffers = await OfferModel.find({ isActive: true, status: "active" });
  if (!activeOffers.length) return noOffer;

  // ── Step 1: Separate deal_of_day from the rest ────────────────────────────────
  const dealOfDayOffer = activeOffers.find((o) => o.offerType === "deal_of_day");

  let dealSaved = 0;
  let dealTargetSet = new Set<string>();
  let nonDealProducts = products;
  let nonDealSubTotal = subTotal;

  if (dealOfDayOffer?.targetProducts?.length) {
    dealTargetSet = new Set(dealOfDayOffer.targetProducts.map((p: any) => p.toString()));
    const dealProducts = products.filter((p) => dealTargetSet.has(p.productId.toString()));
    nonDealProducts = products.filter((p) => !dealTargetSet.has(p.productId.toString()));
    nonDealSubTotal = nonDealProducts.reduce((sum, p) => sum + p.totalPrice, 0);

    if (dealProducts.length > 0) {
      const pct = (dealOfDayOffer.reward.discountPercentage ?? 0) / 100;
      dealSaved = dealProducts.reduce((sum, p) => sum + p.itemPrice * pct * p.quantity, 0);
    }
  }

  // ── Step 2: Evaluate all other offers against nonDealProducts ─────────────────
  let bestOtherOffer: any = null;
  let bestOtherSaved = 0;

  for (const offer of activeOffers) {
    if (offer.offerType === "deal_of_day") continue;

    let saved = 0;
    const totalQty = nonDealProducts.reduce((s, p) => s + p.quantity, 0);

    switch (offer.offerType) {
      case "buy_x_get_cheapest_free": {
        if (offer.condition.minQuantity == null || totalQty < offer.condition.minQuantity) break;
        if (!nonDealProducts.length) break;
        saved = cheapestProduct(nonDealProducts).itemPrice;
        break;
      }

      case "spend_x_get_discount": {
        if (offer.condition.minAmount == null || nonDealSubTotal < offer.condition.minAmount) break;
        saved = nonDealSubTotal * (offer.reward.discountPercentage ?? 0) / 100;
        break;
      }

      case "spend_x_get_free_shipping": {
        if (offer.condition.minAmount == null || nonDealSubTotal < offer.condition.minAmount) break;
        saved = shippingCost;
        break;
      }

      case "buy_x_get_free_shipping": {
        if (offer.condition.minQuantity == null) break;
        let countable = totalQty;
        if ((offer.condition as any).excludedCategories?.length) {
          const productIds = nonDealProducts.map((p) => p.productId);
          const excluded = await ProductModel.find({
            _id: { $in: productIds },
            category: { $in: (offer.condition as any).excludedCategories },
          }).select("_id");
          const excludedSet = new Set(excluded.map((p) => (p._id as Types.ObjectId).toString()));
          countable = nonDealProducts
            .filter((p) => !excludedSet.has(p.productId.toString()))
            .reduce((s, p) => s + p.quantity, 0);
        }
        if (countable >= offer.condition.minQuantity) saved = shippingCost;
        break;
      }

      case "buy_x_get_half_price": {
        if (offer.condition.minQuantity == null || totalQty < offer.condition.minQuantity) break;
        if (!nonDealProducts.length) break;
        saved = cheapestProduct(nonDealProducts).itemPrice / 2;
        break;
      }

      case "spend_x_get_free_item": {
        if (offer.condition.minAmount == null || nonDealSubTotal < offer.condition.minAmount) break;
        saved = offer.reward.freeItemMaxValue ?? 0;
        break;
      }

      case "flash_sale": {
        if (offer.reward.discountPercentage == null) break;
        let matchList = nonDealProducts;
        if ((offer as any).targetCategories?.length) {
          const productIds = nonDealProducts.map((p) => p.productId);
          const matching = await ProductModel.find({
            _id: { $in: productIds },
            category: { $in: (offer as any).targetCategories },
          }).select("_id");
          const matchSet = new Set(matching.map((p) => (p._id as Types.ObjectId).toString()));
          matchList = nonDealProducts.filter((p) => matchSet.has(p.productId.toString()));
        }
        saved = matchList.reduce(
          (sum, p) => sum + p.itemPrice * (offer.reward.discountPercentage! / 100) * p.quantity,
          0
        );
        break;
      }
    }

    if (saved > bestOtherSaved) {
      bestOtherSaved = saved;
      bestOtherOffer = offer;
    }
  }

  // ── Step 3: Pick the winner ───────────────────────────────────────────────────
  const useDealOfDay = dealSaved > 0 && dealSaved >= bestOtherSaved && dealOfDayOffer;

  if (!useDealOfDay && !bestOtherOffer) return noOffer;

  // ── Step 4: Apply the winning offer and return modified products ───────────────

  if (useDealOfDay && dealOfDayOffer) {
    const pct = (dealOfDayOffer.reward.discountPercentage ?? 0) / 100;
    const finalProducts = products.map((p) => {
      if (!dealTargetSet.has(p.productId.toString())) return p;
      const newItemPrice = p.itemPrice * (1 - pct);
      return { ...p, itemPrice: newItemPrice, totalPrice: newItemPrice * p.quantity };
    });
    return { appliedOffer: dealOfDayOffer._id as Types.ObjectId, finalProducts, discount: 0, freeShipping: false };
  }

  // Apply other offer
  const winner = bestOtherOffer;

  switch (winner.offerType) {
    case "buy_x_get_cheapest_free": {
      const cheapest = cheapestProduct(nonDealProducts);
      const finalProducts = products.map((p) => {
        if (p.variantId.toString() !== cheapest.variantId.toString()) return p;
        return { ...p, itemPrice: 0, totalPrice: 0 };
      });
      return { appliedOffer: winner._id, finalProducts, discount: 0, freeShipping: false };
    }

    case "spend_x_get_discount":
      return { appliedOffer: winner._id, finalProducts: products, discount: bestOtherSaved, freeShipping: false };

    case "spend_x_get_free_shipping":
    case "buy_x_get_free_shipping":
      return { appliedOffer: winner._id, finalProducts: products, discount: 0, freeShipping: true };

    case "buy_x_get_half_price": {
      const cheapest = cheapestProduct(nonDealProducts);
      const newItemPrice = cheapest.itemPrice / 2;
      const finalProducts = products.map((p) => {
        if (p.variantId.toString() !== cheapest.variantId.toString()) return p;
        return { ...p, itemPrice: newItemPrice, totalPrice: newItemPrice * p.quantity };
      });
      return { appliedOffer: winner._id, finalProducts, discount: 0, freeShipping: false };
    }

    case "spend_x_get_free_item":
      return { appliedOffer: winner._id, finalProducts: products, discount: bestOtherSaved, freeShipping: false };

    case "flash_sale": {
      const pct = (winner.reward.discountPercentage ?? 0) / 100;
      let matchSet: Set<string> | null = null;
      if (winner.targetCategories?.length) {
        const productIds = nonDealProducts.map((p: any) => p.productId);
        const matching = await ProductModel.find({
          _id: { $in: productIds },
          category: { $in: winner.targetCategories },
        }).select("_id");
        matchSet = new Set(matching.map((p) => (p._id as Types.ObjectId).toString()));
      }
      const finalProducts = products.map((p) => {
        if (matchSet && !matchSet.has(p.productId.toString())) return p;
        const newItemPrice = p.itemPrice * (1 - pct);
        return { ...p, itemPrice: newItemPrice, totalPrice: newItemPrice * p.quantity };
      });
      return { appliedOffer: winner._id, finalProducts, discount: 0, freeShipping: false };
    }

    default:
      return noOffer;
  }
};

// ─── Stock helpers ────────────────────────────────────────────────────────────

const buildVariantRestoreOps = (products: ProductOrder[]) =>
  products.map((p) => ({
    updateOne: {
      filter: { _id: p.variantId },
      update: { $inc: { availableItems: p.quantity } },
    },
  }));

const buildVariantDeductOps = (products: ProductOrder[]) =>
  products.map((p) => ({
    updateOne: {
      filter: { _id: p.variantId },
      update: { $inc: { availableItems: -p.quantity } },
    },
  }));

const buildSoldItemsDeductOps = (products: ProductOrder[]) => {
  const map = new Map<string, number>();
  for (const p of products) {
    if (p.itemPrice > 0) {
      const pid = p.productId.toString();
      map.set(pid, (map.get(pid) ?? 0) + p.quantity);
    }
  }
  return Array.from(map.entries()).map(([productId, qty]) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(productId) },
      update: { $inc: { soldItems: -qty } },
    },
  }));
};

const buildSoldItemsIncrOps = (products: ProductOrder[]) => {
  const map = new Map<string, number>();
  for (const p of products) {
    if (p.itemPrice > 0) {
      const pid = p.productId.toString();
      map.set(pid, (map.get(pid) ?? 0) + p.quantity);
    }
  }
  return Array.from(map.entries()).map(([productId, qty]) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(productId) },
      update: { $inc: { soldItems: qty } },
    },
  }));
};

// ─── Order service ─────────────────────────────────────────────────────────────

class OrderService {
  // ── CREATE ──────────────────────────────────────────────────────────────────

  async createOrder(data: {
    authUserId: string | Types.ObjectId;
    userInformationId: string;
    products: Array<{ variantId: string; quantity: number }>;
  }) {
    // Step 1 & 2 — Validate variants/products and build snapshots
    const orderProducts: ProductOrder[] = [];

    for (const item of data.products) {
      const variant = await ProductVariantModel.findById(item.variantId)
        .populate({ path: SchemaTypesReference.Color, select: "name" })
        .populate({ path: SchemaTypesReference.Size, select: "number" });

      if (!variant) throw new ApiError(404, `${ErrorMessages.VARIANT_NOT_FOUND}: ${item.variantId}`);

      const product = await ProductModel.findOne({ _id: variant.product, isDeleted: false });
      if (!product) throw new ApiError(404, ErrorMessages.PRODUCT_NOT_FOUND);

      if (variant.availableItems < item.quantity) {
        throw new ApiError(400, `Not enough stock for product: ${product.productName}`);
      }

      orderProducts.push({
        productId: variant.product as Types.ObjectId,
        variantId: variant._id as Types.ObjectId,
        quantity: item.quantity,
        productName: product.productName,
        itemPrice: product.finalPrice ?? product.price,
        totalPrice: (product.finalPrice ?? product.price) * item.quantity,
        size: (variant.size as any)?.number ?? "",
        color: (variant.color as any)?.name ?? "",
      });
    }

    // Step 3 — subTotal
    const subTotal = orderProducts.reduce((sum, p) => sum + p.totalPrice, 0);

    // Step 4 & 5 — Snapshots
    const userInfo = await findUserInformationById(data.userInformationId);
    if (!userInfo) throw new ApiError(404, ErrorMessages.USER_INFORMATION_NOT_FOUND);

    const shipping = userInfo.shipping as any;
    const shippingSnapshot: ShippingSnapshot = {
      name: shipping.category ?? "",
      cost: shipping.cost ?? 0,
    };
    const shippingCost = shippingSnapshot.cost;

    const userInfoSnapshot: UserInfoSnapshot = {
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      address: userInfo.address,
      primaryPhone: userInfo.primaryPhone,
      secondaryPhone: userInfo.secondaryPhone,
      country: userInfo.country,
      postalCode: userInfo.postalCode,
    };

    // Step 6 — Calculate and apply offers
    const offerResult = await calculateOrderOffers(orderProducts, subTotal, shippingCost);
    const { appliedOffer, finalProducts, discount, freeShipping } = offerResult;

    // Step 7 — Recalculate subTotal from final (possibly price-modified) products
    const finalSubTotal = finalProducts.reduce((sum, p) => sum + p.totalPrice, 0);

    // Step 8 — totalAmount
    const totalAmount = finalSubTotal - discount + (freeShipping ? 0 : shippingCost);

    // Step 9 — Transaction
    const session = await mongoose.startSession();
    let newOrder: any;
    try {
      session.startTransaction();

      await ProductVariantModel.bulkWrite(buildVariantDeductOps(finalProducts), { session });

      const soldItemsOps = buildSoldItemsIncrOps(finalProducts);
      if (soldItemsOps.length) {
        await ProductModel.bulkWrite(soldItemsOps, { session });
      }

      [newOrder] = await OrderModel.create(
        [{
          user: data.authUserId,
          userInformation: userInfoSnapshot,
          shipping: shippingSnapshot,
          products: finalProducts,
          subTotal: finalSubTotal,
          discount,
          freeShipping,
          shippingCost,
          totalAmount,
          appliedOffer,
          status: orderStatusType.under_review,
        }],
        { session }
      );

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    // Step 10 — Outside transaction
    const uniqueProductIds = [
      ...new Set(finalProducts.map((p) => p.productId.toString())),
    ].map((id) => new Types.ObjectId(id));
    await updateProductSoldOutStatus(uniqueProductIds);

    return newOrder;
  }

  // ── READ ─────────────────────────────────────────────────────────────────────

  async getOrderById(orderId: Types.ObjectId | string) {
    const order = await OrderModel.findById(orderId).populate([
      { path: "products.productId", select: "defaultImage productName" },
    ]);
    return order;
  }

  async getUserOrders(userId: Types.ObjectId | string) {
    const orders = await OrderModel.find({ user: userId })
      .populate([{ path: "products.productId", select: "defaultImage" }])
      .sort({ createdAt: -1 });
    return orders;
  }

  async getAllOrders(page: number, status?: string, orderId?: string) {
    const limit = 20;
    page = !page || page < 1 || isNaN(page) ? 1 : page;
    const skip = limit * (page - 1);

    const filter: any = {};
    if (status) filter.status = status;
    if (orderId) {
      filter.$expr = {
        $regexMatch: { input: { $toString: "$_id" }, regex: orderId + "$" },
      };
    }

    const totalItems = await OrderModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);
    const orders = await OrderModel.find(filter)
      .populate([{ path: "products.productId", select: "defaultImage" }])
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return { totalItems, totalPages, currentPage: page, orders };
  }

  // ── USER CANCEL ───────────────────────────────────────────────────────────────

  async cancelOrder(orderId: string, userId: string) {
    const order = await OrderModel.findOne({ _id: orderId, user: userId });
    if (!order) throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);

    const cancellable = [orderStatusType.under_review, orderStatusType.confirmed];
    if (!cancellable.includes(order.status as orderStatusType)) {
      throw new ApiError(400, ErrorMessages.NOT_CANCELLED);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await ProductVariantModel.bulkWrite(buildVariantRestoreOps(order.products as ProductOrder[]), { session });

      const deductOps = buildSoldItemsDeductOps(order.products as ProductOrder[]);
      if (deductOps.length) {
        await ProductModel.bulkWrite(deductOps, { session });
      }

      order.status = orderStatusType.cancelled;
      await order.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    const uniqueProductIds = [
      ...new Set((order.products as ProductOrder[]).map((p) => p.productId.toString())),
    ].map((id) => new Types.ObjectId(id));
    await updateProductSoldOutStatus(uniqueProductIds);

    return order;
  }

  // ── ADMIN CANCEL ──────────────────────────────────────────────────────────────

  async adminCancelOrder(orderId: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);

    const stockAlreadyRestored = ["cancelled", "deleted"];
    const shouldRestoreStock = !stockAlreadyRestored.includes(order.status);

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      if (shouldRestoreStock) {
        await ProductVariantModel.bulkWrite(buildVariantRestoreOps(order.products as ProductOrder[]), { session });

        const deductOps = buildSoldItemsDeductOps(order.products as ProductOrder[]);
        if (deductOps.length) {
          await ProductModel.bulkWrite(deductOps, { session });
        }
      }

      order.status = orderStatusType.cancelled;
      await order.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    if (shouldRestoreStock) {
      const uniqueProductIds = [
        ...new Set((order.products as ProductOrder[]).map((p) => p.productId.toString())),
      ].map((id) => new Types.ObjectId(id));
      await updateProductSoldOutStatus(uniqueProductIds);
    }

    return order;
  }

  // ── ADMIN DELETE ──────────────────────────────────────────────────────────────

  async adminDeleteOrder(orderId: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);

    const stockAlreadyRestored = ["cancelled", "deleted"];
    const shouldRestoreStock = !stockAlreadyRestored.includes(order.status);

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      if (shouldRestoreStock) {
        await ProductVariantModel.bulkWrite(buildVariantRestoreOps(order.products as ProductOrder[]), { session });

        const deductOps = buildSoldItemsDeductOps(order.products as ProductOrder[]);
        if (deductOps.length) {
          await ProductModel.bulkWrite(deductOps, { session });
        }
      }

      order.status = orderStatusType.deleted;
      await order.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    if (shouldRestoreStock) {
      const uniqueProductIds = [
        ...new Set((order.products as ProductOrder[]).map((p) => p.productId.toString())),
      ].map((id) => new Types.ObjectId(id));
      await updateProductSoldOutStatus(uniqueProductIds);
    }

    return order;
  }

  // ── PREVIEW ───────────────────────────────────────────────────────────────────

  async previewOrder(data: {
    userInformationId: string;
    items: Array<{ variantId: string; quantity: number }>;
  }) {
    // Step 1 & 2 — Validate variants/products and build items array
    const orderProducts: ProductOrder[] = [];

    for (const item of data.items) {
      const variant = await ProductVariantModel.findById(item.variantId)
        .populate({ path: SchemaTypesReference.Color, select: "name" })
        .populate({ path: SchemaTypesReference.Size, select: "number" });

      if (!variant) throw new ApiError(404, `${ErrorMessages.VARIANT_NOT_FOUND}: ${item.variantId}`);

      const product = await ProductModel.findOne({ _id: variant.product, isDeleted: false });
      if (!product) throw new ApiError(404, ErrorMessages.PRODUCT_NOT_FOUND);

      if (variant.availableItems < item.quantity) {
        throw new ApiError(400, `Not enough stock for product: ${product.productName}`);
      }

      orderProducts.push({
        productId: variant.product as Types.ObjectId,
        variantId: variant._id as Types.ObjectId,
        quantity: item.quantity,
        productName: product.productName,
        itemPrice: product.finalPrice ?? product.price,
        totalPrice: (product.finalPrice ?? product.price) * item.quantity,
        size: (variant.size as any)?.number ?? "",
        color: (variant.color as any)?.name ?? "",
      });
    }

    // Step 3 — subTotal before any offer
    const originalSubTotal = orderProducts.reduce((sum, p) => sum + p.totalPrice, 0);

    // Step 4 — Get shipping cost from user information
    const userInfo = await findUserInformationById(data.userInformationId);
    if (!userInfo) throw new ApiError(404, ErrorMessages.USER_INFORMATION_NOT_FOUND);

    const shipping = userInfo.shipping as any;
    const shippingCost = shipping?.cost ?? 0;

    // Step 5 — Apply same offer logic as createOrder (no side effects)
    const offerResult = await calculateOrderOffers(orderProducts, originalSubTotal, shippingCost);
    const { appliedOffer, finalProducts, discount, freeShipping } = offerResult;

    // Step 6 — Recalculate subTotal from possibly price-modified products
    const finalSubTotal = finalProducts.reduce((sum, p) => sum + p.totalPrice, 0);
    const totalAmount = finalSubTotal - discount + (freeShipping ? 0 : shippingCost);

    // Build appliedOffer summary with savedAmount
    let appliedOfferData: {
      _id: Types.ObjectId;
      title: string;
      offerType: string;
      savedAmount: number;
    } | null = null;

    if (appliedOffer) {
      const savedAmount =
        (originalSubTotal - finalSubTotal) + discount + (freeShipping ? shippingCost : 0);
      const offerDoc = await OfferModel.findById(appliedOffer).select("title offerType");
      if (offerDoc) {
        appliedOfferData = {
          _id: offerDoc._id as Types.ObjectId,
          title: offerDoc.title,
          offerType: offerDoc.offerType,
          savedAmount,
        };
      }
    }

    return {
      items: finalProducts,
      subTotal: finalSubTotal,
      appliedOffer: appliedOfferData,
      discount,
      shippingCost,
      freeShipping,
      totalAmount,
    };
  }

  // ── UPDATE STATUS (admin: confirmed / shipped / delivered / ordered) ───────────

  async updateOrderStatus(orderId: string, status: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);
    order.status = status;
    await order.save();
    return order;
  }
}

export default new OrderService();
