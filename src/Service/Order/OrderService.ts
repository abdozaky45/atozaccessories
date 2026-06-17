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
//
// Two independent layers are combined for every order:
//
//   1. FLASH SALE (homepage offer) — a specific product gets a big, time-limited
//      discount. Flash-sale items are *excluded* from cart-offer qualification
//      (their price does not count toward spend thresholds and they are not
//      counted toward quantity thresholds), but their discounted price IS added
//      to the final order total.
//
//   2. CART OFFER (one per order) — every eligible cart offer is evaluated against
//      the NON-flash items only, and the single offer that saves the customer the
//      most money is applied.
//
// The result therefore stacks: flash discount (always) + best cart offer (one).

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const cheapestProduct = (list: ProductOrder[]): ProductOrder =>
  list.reduce((min, p) => (p.itemPrice < min.itemPrice ? p : min));

interface OfferResult {
  appliedOffer: Types.ObjectId | null;
  appliedFlashOffers: Types.ObjectId[];
  finalProducts: ProductOrder[];
  discount: number;
  freeShipping: boolean;
  /** Money the customer saved via the cart offer (flash savings excluded). */
  cartOfferSaved: number;
  /** Money the customer saved via flash-sale discounts. */
  flashSaved: number;
}

const calculateOrderOffers = async (
  products: ProductOrder[],
  shippingCost: number,
  freeGift: ProductOrder | null
): Promise<OfferResult> => {
  const baseResult: OfferResult = {
    appliedOffer: null,
    appliedFlashOffers: [],
    finalProducts: products,
    discount: 0,
    freeShipping: false,
    cartOfferSaved: 0,
    flashSaved: 0,
  };

  const activeOffers = await OfferModel.find({ isActive: true, status: "active" });
  if (!activeOffers.length) return baseResult;

  // ── Step 1: Flash sale — map each in-cart flash product to its best discount ──
  // Each flash offer targets specific products. If several flash offers target the
  // same product, the largest discount wins for that product.
  const flashOffers = activeOffers.filter((o) => o.offerType === "flash_sale");
  const flashByProduct = new Map<string, { pct: number; offerId: Types.ObjectId }>();

  for (const fo of flashOffers) {
    const pct = (fo.reward.discountPercentage ?? 0) / 100;
    if (pct <= 0 || !fo.targetProducts?.length) continue;
    for (const pid of fo.targetProducts) {
      const key = pid.toString();
      if (!products.some((p) => p.productId.toString() === key)) continue;
      const current = flashByProduct.get(key);
      if (!current || pct > current.pct) {
        flashByProduct.set(key, { pct, offerId: fo._id as Types.ObjectId });
      }
    }
  }

  const flashProductIds = new Set(flashByProduct.keys());
  const appliedFlashOffers = [
    ...new Set([...flashByProduct.values()].map((v) => v.offerId.toString())),
  ].map((id) => new Types.ObjectId(id));

  // Split the cart: flash items are excluded from all cart-offer qualification.
  const nonFlashProducts = products.filter((p) => !flashProductIds.has(p.productId.toString()));
  const nonFlashSubTotal = round2(nonFlashProducts.reduce((s, p) => s + p.totalPrice, 0));
  const nonFlashQty = nonFlashProducts.reduce((s, p) => s + p.quantity, 0);

  // ── Step 2: Evaluate every cart offer against the non-flash items ─────────────
  let bestOffer: any = null;
  let bestSaved = 0;

  for (const offer of activeOffers) {
    if (offer.offerType === "flash_sale") continue;

    let saved = 0;

    switch (offer.offerType) {
      // Buy N items, get the cheapest item free
      case "buy_x_get_cheapest_free": {
        if (offer.condition.minQuantity == null || nonFlashQty < offer.condition.minQuantity) break;
        if (!nonFlashProducts.length) break;
        saved = cheapestProduct(nonFlashProducts).itemPrice;
        break;
      }

      // Spend X, get Y% off the (non-flash) total
      case "spend_x_get_discount": {
        if (offer.condition.minAmount == null || nonFlashSubTotal < offer.condition.minAmount) break;
        saved = round2(nonFlashSubTotal * ((offer.reward.discountPercentage ?? 0) / 100));
        break;
      }

      // Spend X, get free shipping
      case "spend_x_get_free_shipping": {
        if (offer.condition.minAmount == null || nonFlashSubTotal < offer.condition.minAmount) break;
        saved = shippingCost;
        break;
      }

      // Buy N items, get free shipping (items in excludedCategories count toward the
      // total but do NOT help qualify)
      case "buy_x_get_free_shipping": {
        if (offer.condition.minQuantity == null) break;
        let qualifyingQty = nonFlashQty;
        if ((offer.condition as any).excludedCategories?.length) {
          const productIds = nonFlashProducts.map((p) => p.productId);
          const excluded = await ProductModel.find({
            _id: { $in: productIds },
            category: { $in: (offer.condition as any).excludedCategories },
          }).select("_id");
          const excludedSet = new Set(excluded.map((p) => (p._id as Types.ObjectId).toString()));
          qualifyingQty = nonFlashProducts
            .filter((p) => !excludedSet.has(p.productId.toString()))
            .reduce((s, p) => s + p.quantity, 0);
        }
        if (qualifyingQty >= offer.condition.minQuantity) saved = shippingCost;
        break;
      }

      // Buy one item, get the cheapest other item at 50% off
      case "buy_x_get_half_price": {
        if (offer.condition.minQuantity == null || nonFlashQty < offer.condition.minQuantity) break;
        if (nonFlashQty < 2) break; // need at least two items so there is an "other"
        saved = round2(cheapestProduct(nonFlashProducts).itemPrice / 2);
        break;
      }

      // Spend X, get a customer-chosen item worth <= Y for free
      case "spend_x_get_free_item": {
        if (offer.condition.minAmount == null || nonFlashSubTotal < offer.condition.minAmount) break;
        if (!freeGift) break; // the customer must choose a free item
        const maxValue = offer.reward.freeItemMaxValue ?? 0;
        if (freeGift.itemPrice > maxValue) break; // chosen gift exceeds the allowed value
        saved = freeGift.itemPrice;
        break;
      }
    }

    if (saved > bestSaved) {
      bestSaved = saved;
      bestOffer = offer;
    }
  }

  // ── Step 3: Apply flash discounts to flash items (always) ─────────────────────
  const applyFlash = (p: ProductOrder): ProductOrder => {
    const flash = flashByProduct.get(p.productId.toString());
    if (!flash) return p;
    const newItemPrice = round2(p.itemPrice * (1 - flash.pct));
    return { ...p, itemPrice: newItemPrice, totalPrice: round2(newItemPrice * p.quantity) };
  };

  const flashSaved = round2(
    products.reduce((sum, p) => {
      const flash = flashByProduct.get(p.productId.toString());
      if (!flash) return sum;
      return sum + p.itemPrice * flash.pct * p.quantity;
    }, 0)
  );

  // ── Step 4: Apply the single best cart offer to the non-flash items ───────────
  let discount = 0;
  let freeShipping = false;
  let appliedOffer: Types.ObjectId | null = null;
  let cartOfferSaved = 0;
  let giftLine: ProductOrder | null = null;

  if (bestOffer && bestSaved > 0) {
    appliedOffer = bestOffer._id as Types.ObjectId;
    cartOfferSaved = bestSaved;

    switch (bestOffer.offerType) {
      // Order-level discounts (line prices are left intact; the discount field carries the value)
      case "buy_x_get_cheapest_free":
      case "spend_x_get_discount":
      case "buy_x_get_half_price":
        discount = bestSaved;
        break;

      case "spend_x_get_free_shipping":
      case "buy_x_get_free_shipping":
        freeShipping = true;
        break;

      // The chosen item is added to the order as a free line (price 0)
      case "spend_x_get_free_item":
        if (freeGift) {
          giftLine = { ...freeGift, itemPrice: 0, totalPrice: 0, isFreeGift: true };
        }
        break;
    }
  }

  // ── Step 5: Assemble the final product list ──────────────────────────────────
  const finalProducts = products.map(applyFlash);
  if (giftLine) finalProducts.push(giftLine);

  return {
    appliedOffer,
    appliedFlashOffers,
    finalProducts,
    discount,
    freeShipping,
    cartOfferSaved,
    flashSaved,
  };
};

// ─── Free-gift helper (for spend_x_get_free_item) ───────────────────────────────
//
// Builds a ProductOrder for the customer-chosen free item. itemPrice/totalPrice
// hold the item's ORIGINAL price so the offer can verify it is within the offer's
// freeItemMaxValue; the calculation zeroes the price if the offer actually applies.

const buildGiftProduct = async (variantId?: string): Promise<ProductOrder | null> => {
  if (!variantId) return null;

  const variant = await ProductVariantModel.findById(variantId)
    .populate({ path: SchemaTypesReference.Color, select: "name" })
    .populate({ path: SchemaTypesReference.Size, select: "number" });

  if (!variant) throw new ApiError(404, `${ErrorMessages.VARIANT_NOT_FOUND}: ${variantId}`);

  const product = await ProductModel.findOne({ _id: variant.product, isDeleted: false });
  if (!product) throw new ApiError(404, ErrorMessages.PRODUCT_NOT_FOUND);

  if (variant.availableItems < 1) {
    throw new ApiError(400, `Not enough stock for free gift: ${product.productName}`);
  }

  const unitPrice = product.finalPrice ?? product.price;

  return {
    productId: variant.product as Types.ObjectId,
    variantId: variant._id as Types.ObjectId,
    quantity: 1,
    productName: product.productName,
    itemPrice: unitPrice,
    totalPrice: unitPrice,
    size: (variant.size as any)?.number ?? "",
    color: (variant.color as any)?.name ?? "",
    isFreeGift: true,
  };
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
    freeGiftVariantId?: string;
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

    // Step 6 — Calculate and apply offers (flash sale + one best cart offer)
    const freeGift = await buildGiftProduct(data.freeGiftVariantId);
    const offerResult = await calculateOrderOffers(orderProducts, shippingCost, freeGift);
    const { appliedOffer, appliedFlashOffers, finalProducts, discount, freeShipping } = offerResult;

    // Step 7 — Recalculate subTotal from final (flash-discounted + free-gift) products
    const finalSubTotal = round2(finalProducts.reduce((sum, p) => sum + p.totalPrice, 0));

    // Step 8 — totalAmount
    const totalAmount = round2(finalSubTotal - discount + (freeShipping ? 0 : shippingCost));

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
          appliedFlashOffers,
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
    freeGiftVariantId?: string;
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

    // Step 4 — Get shipping cost from user information
    const userInfo = await findUserInformationById(data.userInformationId);
    if (!userInfo) throw new ApiError(404, ErrorMessages.USER_INFORMATION_NOT_FOUND);

    const shipping = userInfo.shipping as any;
    const shippingCost = shipping?.cost ?? 0;

    // Step 5 — Apply same offer logic as createOrder (no side effects)
    const freeGift = await buildGiftProduct(data.freeGiftVariantId);
    const offerResult = await calculateOrderOffers(orderProducts, shippingCost, freeGift);
    const { appliedOffer, appliedFlashOffers, finalProducts, discount, freeShipping, cartOfferSaved, flashSaved } =
      offerResult;

    // Step 6 — Recalculate subTotal from final (flash-discounted + free-gift) products
    const finalSubTotal = round2(finalProducts.reduce((sum, p) => sum + p.totalPrice, 0));
    const totalAmount = round2(finalSubTotal - discount + (freeShipping ? 0 : shippingCost));

    // Build appliedOffer summary with savedAmount
    let appliedOfferData: {
      _id: Types.ObjectId;
      title: string;
      offerType: string;
      savedAmount: number;
    } | null = null;

    if (appliedOffer) {
      const offerDoc = await OfferModel.findById(appliedOffer).select("title offerType");
      if (offerDoc) {
        appliedOfferData = {
          _id: offerDoc._id as Types.ObjectId,
          title: offerDoc.title,
          offerType: offerDoc.offerType,
          savedAmount: cartOfferSaved,
        };
      }
    }

    // Summaries of the flash-sale offers applied (independent of the cart offer)
    const flashOffersData = appliedFlashOffers.length
      ? await OfferModel.find({ _id: { $in: appliedFlashOffers } }).select("title offerType")
      : [];

    return {
      items: finalProducts,
      subTotal: finalSubTotal,
      appliedOffer: appliedOfferData,
      flashSale: {
        offers: flashOffersData.map((o) => ({
          _id: o._id as Types.ObjectId,
          title: o.title,
          offerType: o.offerType,
        })),
        savedAmount: flashSaved,
      },
      discount,
      shippingCost,
      freeShipping,
      totalSaved: round2(cartOfferSaved + flashSaved),
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
