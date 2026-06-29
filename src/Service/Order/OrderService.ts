import mongoose, { Types } from "mongoose";
import OrderModel from "../../Model/Order/OrderModel";
import { ProductOrder, UserInfoSnapshot, ShippingSnapshot } from "../../Model/Order/Iorder";
import ProductVariantModel from "../../Model/ProductVariant/ProductVariantModel";
import ProductModel from "../../Model/Product/ProductModel";
import OfferModel from "../../Model/Offers/OfferModel";
import ShippingModel from "../../Model/Shipping/ShippingModel";
import UserModel from "../../Model/User/UserInformation/UserModel";
import { findUserInformationById } from "../User/AuthService";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import { orderStatusType } from "../../Utils/OrderStatusType";
import { ApiError } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";

// ─── Utility ──────────────────────────────────────────────────────────────────

// Product-level `availableItems` is a denormalized mirror of the SUM of its
// variants' stock, and `isSoldOut` follows from it. We recompute both from the
// variants (the source of truth) after any stock change so the aggregate can
// never drift — e.g. from free-item lines, partial cancels, or concurrent orders.
// This makes cancel/restore return the totals to exactly the variant sum.
export const updateProductSoldOutStatus = async (productIds: Types.ObjectId[]) => {
  for (const productId of productIds) {
    const [agg] = await ProductVariantModel.aggregate([
      { $match: { product: productId } },
      { $group: { _id: null, total: { $sum: "$availableItems" } } },
    ]);
    const total = agg?.total ?? 0;
    await ProductModel.findByIdAndUpdate(productId, {
      availableItems: total,
      isSoldOut: total <= 0,
    });
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
  /** True if ANY free-shipping offer's conditions are met — independent of the
   *  single "best offer" pick and of the (address-derived) shipping cost. Used by
   *  the cart preview, which knows the cart but not yet the shipping address. */
  freeShippingQualifies: boolean;
  /** Money the customer saved via the cart offer (flash savings excluded). */
  cartOfferSaved: number;
  /** Money the customer saved via flash-sale discounts. */
  flashSaved: number;
}

const calculateOrderOffers = async (
  products: ProductOrder[],
  shippingCost: number
): Promise<OfferResult> => {
  const baseResult: OfferResult = {
    appliedOffer: null,
    appliedFlashOffers: [],
    finalProducts: products,
    discount: 0,
    freeShipping: false,
    freeShippingQualifies: false,
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
  // Tracked separately from the "best offer" pick so the cart preview can show
  // "Free shipping" without needing the shipping cost to win the value ranking.
  let freeShippingQualifies = false;

  for (const offer of activeOffers) {
    if (offer.offerType === "flash_sale") continue;

    let saved = 0;

    switch (offer.offerType) {
      // Buy N items, get the cheapest item free. Items in excludedCategories are
      // outside the offer: they neither help qualify nor can become the free item.
      case "buy_x_get_cheapest_free": {
        if (offer.condition.minQuantity == null) break;
        let eligible = nonFlashProducts;
        if ((offer.condition as any).excludedCategories?.length) {
          const productIds = nonFlashProducts.map((p) => p.productId);
          const excluded = await ProductModel.find({
            _id: { $in: productIds },
            category: { $in: (offer.condition as any).excludedCategories },
          }).select("_id");
          const excludedSet = new Set(excluded.map((p) => (p._id as Types.ObjectId).toString()));
          eligible = nonFlashProducts.filter((p) => !excludedSet.has(p.productId.toString()));
        }
        const eligibleQty = eligible.reduce((s, p) => s + p.quantity, 0);
        if (eligibleQty < offer.condition.minQuantity || !eligible.length) break;
        saved = cheapestProduct(eligible).itemPrice;
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
        freeShippingQualifies = true;
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
        if (qualifyingQty >= offer.condition.minQuantity) {
          freeShippingQualifies = true;
          saved = shippingCost;
        }
        break;
      }

      // Buy one item, get the cheapest other item at 50% off
      case "buy_x_get_half_price": {
        if (offer.condition.minQuantity == null || nonFlashQty < offer.condition.minQuantity) break;
        if (nonFlashQty < 2) break; // need at least two items so there is an "other"
        saved = round2(cheapestProduct(nonFlashProducts).itemPrice / 2);
        break;
      }

      // Spend X, get the most valuable cart item worth <= Y free (one unit).
      // No customer choice: we auto-pick the priciest eligible item so the gift is
      // as close as possible to the admin-set value (freeItemMaxValue).
      case "spend_x_get_free_item": {
        if (offer.condition.minAmount == null || nonFlashSubTotal < offer.condition.minAmount) break;
        const maxValue = offer.reward.freeItemMaxValue ?? 0;
        const eligible = nonFlashProducts.filter((p) => p.itemPrice <= maxValue);
        if (!eligible.length) break; // nothing in the cart qualifies as the gift
        // Most expensive eligible item; one unit becomes free.
        saved = eligible.reduce((max, p) => (p.itemPrice > max.itemPrice ? p : max)).itemPrice;
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

  if (bestOffer && bestSaved > 0) {
    appliedOffer = bestOffer._id as Types.ObjectId;
    cartOfferSaved = bestSaved;

    switch (bestOffer.offerType) {
      // Order-level discounts (line prices are left intact; the discount field carries the value)
      case "buy_x_get_cheapest_free":
      case "spend_x_get_discount":
      case "buy_x_get_half_price":
      // One eligible cart unit becomes free — applied as an order-level discount.
      case "spend_x_get_free_item":
        discount = bestSaved;
        break;

      case "spend_x_get_free_shipping":
      case "buy_x_get_free_shipping":
        freeShipping = true;
        break;
    }
  }

  // ── Step 5: Assemble the final product list ──────────────────────────────────
  const finalProducts = products.map(applyFlash);

  return {
    appliedOffer,
    appliedFlashOffers,
    finalProducts,
    discount,
    freeShipping,
    freeShippingQualifies,
    cartOfferSaved,
    flashSaved,
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

// Sale counter only. The aggregate `availableItems` is recomputed from the
// variants by updateProductSoldOutStatus, so it is intentionally NOT touched here.
// Free lines (itemPrice === 0) never counted as a sale, so they aren't undone.
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
      // Cancel/restore: undo the sale count.
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
      // On order: count the sale. The aggregate availableItems is recomputed from
      // the variants by updateProductSoldOutStatus, so it isn't touched here.
      update: { $inc: { soldItems: qty } },
    },
  }));
};

// ─── Stock <-> status invariant ─────────────────────────────────────────────────
//
// Inventory is "reserved" (deducted from variants, counted as sold) for the whole
// time an order is active. The moment it leaves the active set its stock is given
// back exactly once. These are the only two restored states:
const STOCK_RESTORED_STATES: orderStatusType[] = [orderStatusType.cancelled, orderStatusType.deleted];
const isStockRestored = (status: string): boolean =>
  STOCK_RESTORED_STATES.includes(status as orderStatusType);

const orderProductIds = (order: any): Types.ObjectId[] =>
  [...new Set((order.products as ProductOrder[]).map((p) => p.productId.toString()))].map(
    (id) => new Types.ObjectId(id)
  );

// Give inventory back and undo the sale counters (cancel / delete).
const restoreOrderStock = async (order: any, session: any): Promise<void> => {
  await ProductVariantModel.bulkWrite(buildVariantRestoreOps(order.products as ProductOrder[]), { session });
  const deductOps = buildSoldItemsDeductOps(order.products as ProductOrder[]);
  if (deductOps.length) {
    await ProductModel.bulkWrite(deductOps, { session });
  }
};

// Re-claim inventory when a restored order becomes active again (e.g. an admin
// un-cancels). Verifies availability first so we never go negative / oversell.
const reserveOrderStock = async (order: any, session: any): Promise<void> => {
  for (const p of order.products as ProductOrder[]) {
    const variant = await ProductVariantModel.findById(p.variantId).session(session);
    if (!variant || variant.availableItems < p.quantity) {
      throw new ApiError(400, `Not enough stock to reactivate order for product: ${p.productName}`);
    }
  }
  await ProductVariantModel.bulkWrite(buildVariantDeductOps(order.products as ProductOrder[]), { session });
  const incrOps = buildSoldItemsIncrOps(order.products as ProductOrder[]);
  if (incrOps.length) {
    await ProductModel.bulkWrite(incrOps, { session });
  }
};

// ─── Legacy order compatibility (read-path) ─────────────────────────────────────
//
// Orders created before the snapshot migration stored `userInformation` and
// `shipping` as ObjectId references and kept a single `price` field instead of the
// subTotal / discount / shippingCost / totalAmount breakdown. The current schema
// treats those fields as embedded snapshots and never populates them, so legacy
// orders would otherwise return raw ObjectIds and missing totals. The helpers below
// resolve them on read (non-destructive) so the admin endpoints stay correct even
// before the one-time migration script (src/Scripts/migrateLegacyOrders.ts) is run.

const isLegacyOrder = (order: any): boolean =>
  !!order && (order.price !== undefined || !order.shipping || order.shipping.name === undefined);

export const normalizeLegacyOrders = async (orders: any[]): Promise<any[]> => {
  const legacy = orders.filter(isLegacyOrder);
  if (!legacy.length) return orders;

  const shippingIds = [...new Set(legacy.map((o) => o.shipping).filter(Boolean).map(String))];
  const userInfoIds = [...new Set(legacy.map((o) => o.userInformation).filter(Boolean).map(String))];

  const [shippingDocs, userInfoDocs] = await Promise.all([
    shippingIds.length ? ShippingModel.find({ _id: { $in: shippingIds } }).lean() : [],
    userInfoIds.length ? UserModel.find({ _id: { $in: userInfoIds } }).lean() : [],
  ]);

  const shippingMap = new Map(shippingDocs.map((s: any) => [s._id.toString(), s]));
  const userInfoMap = new Map(userInfoDocs.map((u: any) => [u._id.toString(), u]));

  return orders.map((order) => {
    if (!isLegacyOrder(order)) return order;

    const shipDoc: any = order.shipping ? shippingMap.get(order.shipping.toString()) : null;
    const uiDoc: any = order.userInformation ? userInfoMap.get(order.userInformation.toString()) : null;

    const shipping = { name: shipDoc?.category ?? "", cost: shipDoc?.cost ?? 0 };
    const userInformation = uiDoc
      ? {
          firstName: uiDoc.firstName,
          lastName: uiDoc.lastName,
          address: uiDoc.address,
          primaryPhone: uiDoc.primaryPhone,
          secondaryPhone: uiDoc.secondaryPhone,
          country: uiDoc.country,
          postalCode: uiDoc.postalCode,
        }
      : order.userInformation;

    const subTotal = order.subTotal ?? order.price ?? 0;
    const discount = order.discount ?? 0;
    const freeShipping = order.freeShipping ?? false;
    const shippingCost = order.shippingCost ?? shipping.cost;
    const { price, ...rest } = order;

    return {
      ...rest,
      userInformation,
      shipping,
      subTotal,
      discount,
      freeShipping,
      shippingCost,
      totalAmount: order.totalAmount ?? subTotal - discount + (freeShipping ? 0 : shippingCost),
      appliedOffer: order.appliedOffer ?? null,
      appliedFlashOffers: order.appliedFlashOffers ?? [],
      _legacy: true,
    };
  });
};

export const normalizeLegacyOrder = async (order: any): Promise<any> =>
  order ? (await normalizeLegacyOrders([order]))[0] : order;

// ─── Shared item resolution ─────────────────────────────────────────────────────
//
// Single source of truth for turning a cart line into a priced ProductOrder.
// Used by BOTH previewOrder and createOrder so the two can never drift apart.
//
// A line may identify its item by:
//   • variantId — the exact variant the customer picked (colour/size). Preferred.
//   • productId — a "quick add" from a card with no variant chosen. We resolve the
//     product's variant server-side (prefer one with enough stock, else any), which
//     covers simple products that own a single backfilled variant.
const buildOrderProducts = async (
  items: Array<{ variantId?: string; productId?: string; quantity: number }>
): Promise<ProductOrder[]> => {
  const orderProducts: ProductOrder[] = [];

  for (const item of items) {
    const withRefs = (q: any) =>
      q
        .populate({ path: SchemaTypesReference.Color, select: "name" })
        .populate({ path: SchemaTypesReference.Size, select: "number" });

    let variant: any = null;
    if (item.variantId) {
      variant = await withRefs(ProductVariantModel.findById(item.variantId));
    } else if (item.productId) {
      // Prefer a variant that can satisfy the requested quantity; fall back to any.
      variant =
        (await withRefs(
          ProductVariantModel.findOne({
            product: item.productId,
            availableItems: { $gte: item.quantity },
          })
        )) ||
        (await withRefs(ProductVariantModel.findOne({ product: item.productId })));
    }

    if (!variant) {
      throw new ApiError(404, `${ErrorMessages.VARIANT_NOT_FOUND}: ${item.variantId ?? item.productId}`);
    }

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

  return orderProducts;
};

// ─── Order service ─────────────────────────────────────────────────────────────

class OrderService {
  // ── CREATE ──────────────────────────────────────────────────────────────────

  async createOrder(data: {
    authUserId: string | Types.ObjectId;
    userInformationId: string;
    products: Array<{ variantId?: string; productId?: string; quantity: number }>;
  }) {
    // Step 1 & 2 — Validate variants/products and build snapshots
    const orderProducts = await buildOrderProducts(data.products);

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
    const offerResult = await calculateOrderOffers(orderProducts, shippingCost);
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
    const order = await OrderModel.findById(orderId)
      .populate([{ path: "products.productId", select: "defaultImage productName" }])
      .lean();
    if (!order) return order;
    return normalizeLegacyOrder(order);
  }

  async getUserOrders(userId: Types.ObjectId | string) {
    const orders = await OrderModel.find({ user: userId })
      .populate([{ path: "products.productId", select: "defaultImage" }])
      .sort({ createdAt: -1 })
      .lean();
    return normalizeLegacyOrders(orders);
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
      .lean();

    const normalizedOrders = await normalizeLegacyOrders(orders);

    return { totalItems, totalPages, currentPage: page, orders: normalizedOrders };
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

      await restoreOrderStock(order, session);

      order.status = orderStatusType.cancelled;
      await order.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    await updateProductSoldOutStatus(orderProductIds(order));

    return order;
  }

  // ── ADMIN: move into a stock-restored state (cancel / delete) ──────────────────
  //
  // Restores inventory exactly once: only when the order is leaving an ACTIVE state.
  // If it is already restored (e.g. cancelling an already-deleted order) the status
  // is just re-labelled with no stock change. Re-applying the same state is rejected
  // so callers don't trigger duplicate side-effects (e.g. a second cancellation email).
  private async moveToRestoredState(orderId: string, target: orderStatusType) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);

    if (order.status === target) {
      throw new ApiError(400, `Order is already ${target}`);
    }

    const shouldRestoreStock = !isStockRestored(order.status);

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      if (shouldRestoreStock) {
        await restoreOrderStock(order, session);
      }

      order.status = target;
      await order.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    if (shouldRestoreStock) {
      await updateProductSoldOutStatus(orderProductIds(order));
    }

    return order;
  }

  // ── ADMIN CANCEL ──────────────────────────────────────────────────────────────

  async adminCancelOrder(orderId: string) {
    return this.moveToRestoredState(orderId, orderStatusType.cancelled);
  }

  // ── ADMIN DELETE ──────────────────────────────────────────────────────────────

  async adminDeleteOrder(orderId: string) {
    return this.moveToRestoredState(orderId, orderStatusType.deleted);
  }

  // ── PREVIEW ───────────────────────────────────────────────────────────────────

  async previewOrder(data: {
    userInformationId: string;
    items: Array<{ variantId?: string; productId?: string; quantity: number }>;
  }) {
    // Step 1 & 2 — Validate variants/products and build items array
    // (same resolution path as createOrder — no side effects)
    const orderProducts = await buildOrderProducts(data.items);

    // Step 4 — Get shipping cost from user information
    const userInfo = await findUserInformationById(data.userInformationId);
    if (!userInfo) throw new ApiError(404, ErrorMessages.USER_INFORMATION_NOT_FOUND);

    const shipping = userInfo.shipping as any;
    const shippingCost = shipping?.cost ?? 0;

    // Step 5 — Apply same offer logic as createOrder (no side effects)
    const offerResult = await calculateOrderOffers(orderProducts, shippingCost);
    const { appliedOffer, appliedFlashOffers, finalProducts, discount, freeShipping, cartOfferSaved, flashSaved } =
      offerResult;

    // Step 6 — Recalculate subTotal from final (flash-discounted + free-gift) products
    const finalSubTotal = round2(finalProducts.reduce((sum, p) => sum + p.totalPrice, 0));
    const totalAmount = round2(finalSubTotal - discount + (freeShipping ? 0 : shippingCost));

    // Per-line "listed" price = the live, current price BEFORE any flash discount
    // (finalPrice ?? price). This is what the summary shows on each row, so the
    // rows always reconcile to subTotal + flashSaved — even when the customer's
    // cart still holds a stale price snapshot taken before a sale began.
    // finalProducts is products.map(applyFlash), so it stays index-aligned with
    // orderProducts (the pre-flash list).
    const responseItems = finalProducts.map((p, i) => ({
      ...p,
      listedUnitPrice: orderProducts[i].itemPrice,
      listedLineTotal: orderProducts[i].totalPrice,
    }));

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
      items: responseItems,
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

  // ── CART PREVIEW (public: no auth, no address) ────────────────────────────────
  //
  // A lightweight sibling of previewOrder for the cart page. It reuses the exact
  // same offer engine (calculateOrderOffers) so cart and checkout never drift —
  // but with no shipping address yet, the shipping COST is unknown. We therefore:
  //   • compute the address-independent parts accurately (flash + monetary offers),
  //   • surface free-shipping as a separate "qualifies" flag (shown as "Free"),
  //   • return a merchandise total only; the final total/shipping resolve at
  //     checkout, which stays the single source of truth.
  async previewCart(data: {
    items: Array<{ variantId?: string; productId?: string; quantity: number }>;
  }) {
    const orderProducts = await buildOrderProducts(data.items);

    // Shipping cost is unknown here → 0. Free-shipping offers therefore can't win
    // the monetary "best offer" ranking (saved 0); their qualification is reported
    // separately via freeShippingQualifies.
    const offerResult = await calculateOrderOffers(orderProducts, 0);
    const {
      appliedOffer,
      appliedFlashOffers,
      finalProducts,
      discount,
      freeShippingQualifies,
      cartOfferSaved,
      flashSaved,
    } = offerResult;

    const finalSubTotal = round2(finalProducts.reduce((sum, p) => sum + p.totalPrice, 0));
    // Merchandise only — shipping is added at checkout (or waived if free).
    const merchandiseTotal = round2(finalSubTotal - discount);

    const responseItems = finalProducts.map((p, i) => ({
      ...p,
      listedUnitPrice: orderProducts[i].itemPrice,
      listedLineTotal: orderProducts[i].totalPrice,
    }));

    let appliedOfferData:
      | { _id: Types.ObjectId; title: string; offerType: string; savedAmount: number }
      | null = null;
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

    const flashOffersData = appliedFlashOffers.length
      ? await OfferModel.find({ _id: { $in: appliedFlashOffers } }).select("title offerType")
      : [];

    return {
      items: responseItems,
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
      freeShipping: freeShippingQualifies,
      totalSaved: round2(cartOfferSaved + flashSaved),
      merchandiseTotal,
    };
  }

  // ── UPDATE STATUS (admin: confirmed / shipped / delivered / ordered) ───────────

  async updateOrderStatus(orderId: string, status: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new ApiError(404, ErrorMessages.ORDER_NOT_FOUND);

    if (order.status === status) return order; // no-op

    // Reactivating a cancelled/deleted order (-> any active status) must re-claim
    // its inventory, otherwise the stock that was given back on cancel is oversold.
    const reactivating = isStockRestored(order.status) && !isStockRestored(status);
    if (!reactivating) {
      order.status = status;
      await order.save();
      return order;
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await reserveOrderStock(order, session);

      order.status = status;
      await order.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    await updateProductSoldOutStatus(orderProductIds(order));

    return order;
  }
}

export default new OrderService();
