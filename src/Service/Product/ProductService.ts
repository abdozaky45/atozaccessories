import slugify from "slugify";
import _ from "lodash";
import ProductModel from "../../Model/Product/ProductModel";
import ProductVariantModel from "../../Model/ProductVariant/ProductVariantModel";
import { extractMediaId } from "../CategoryService/CategoryService";
import { paginate } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import Fuse from "fuse.js";
import mongoose, { Types } from "mongoose";
import { ProductOrder } from "../../Model/Order/Iorder";
import IProduct from "../../Model/Product/Iproduct";
import OrderModel from "../../Model/Order/OrderModel";
import { orderStatusType } from "../../Utils/OrderStatusType";
import AuthModel from "../../Model/User/auth/AuthModel";
import { deleteFromS3 } from "../../Utils/S3";
import CategoryModel from "../../Model/Categories/CategoryModel";
import WishListModel from "../../Model/Wishlist/WishlistModel";
import moment from "../../Utils/DateAndTime";

// ─── Product CRUD ────────────────────────────────────────────────────────────

export const createProduct = async (productData: IProduct) => {
  const product = await ProductModel.create(productData);
  return product;
};

export const findProductById = async (id: string | Types.ObjectId) => {
  const product = ProductModel.findOne({ _id: id, isDeleted: false });
  return product;
};

export const findProductByIdAdmin = async (id: string | Types.ObjectId) => {
  const product = await ProductModel.findById(id)
    .populate(SchemaTypesReference.Category, "categoryName image slug")
    .lean();
  if (!product) return null;
  const variants = await ProductVariantModel.find({ product: id })
    .populate(SchemaTypesReference.Color, "name hex")
    .populate(SchemaTypesReference.Size, "number order")
    .lean();
  return { ...product, variants };
};

export const findProductByIdPublic = async (id: string | Types.ObjectId) => {
  const product = await ProductModel.findOne({ _id: id, isDeleted: false })
    .select("-wholesalePrice")
    .populate(SchemaTypesReference.Category, "categoryName image slug")
    .lean();
  if (!product) return null;
  const variants = await ProductVariantModel.find({ product: id })
    .populate(SchemaTypesReference.Color, "name hex")
    .populate(SchemaTypesReference.Size, "number order")
    .lean();
  return { ...product, variants };
};

export const prepareProductUpdates = async (
  productData: any,
  product: IProduct,
  defaultImage: string,
  albumImages: string[]
) => {
  let updates = false;

  Object.keys(productData).forEach((key) => {
    const field = key as keyof IProduct;
    if (!_.isEqual(productData[field], product[field])) {
      (product[field] as any) = productData[field];
      updates = true;
    }
  });

  if (productData.availableItems !== undefined) {
    product.isSoldOut = productData.availableItems <= 0;
    updates = true;
  }

  if (productData.productName && productData.productName !== product.productName) {
    product.slug = slugify(product.productName);
    updates = true;
  }

  if (defaultImage && defaultImage !== product.defaultImage.mediaUrl) {
    const mediaId = extractMediaId(defaultImage);
    if (mediaId !== product.defaultImage.mediaId) {
      product.defaultImage.mediaUrl = defaultImage;
      product.defaultImage.mediaId = mediaId;
      updates = true;
    }
  }

  if (albumImages && Array.isArray(albumImages)) {
    product.albumImages = [];
    albumImages.forEach((imageUrl: string) => {
      const mediaId = extractMediaId(imageUrl);
      if (mediaId) {
        product.albumImages!.push({ mediaUrl: imageUrl, mediaId });
        updates = true;
      }
    });
  }

  return updates ? product : null;
};

export const deleteOneProduct = async (_id: string | Types.ObjectId) => {
  const product = await ProductModel.findByIdAndUpdate(_id, { isDeleted: true });
  return product;
};

export const hardDeleteProduct = async (productId: string) => {
  const product = await ProductModel.findById(productId);
  if (!product) return null;

  // Delete from S3 first — if this fails we stop and do not touch the DB
  if (product.defaultImage?.mediaUrl) {
    await deleteFromS3(product.defaultImage.mediaUrl);
  }
  if (product.albumImages?.length) {
    for (const img of product.albumImages) {
      await deleteFromS3(img.mediaUrl);
    }
  }

  await ProductVariantModel.deleteMany({ product: productId });
  await ProductModel.findByIdAndDelete(productId);
  return true;
};

// ─── Variant operations ───────────────────────────────────────────────────────

export const createVariants = async (
  productId: Types.ObjectId | string,
  variants: Array<{ color: string; size: string; availableItems: number }>
) => {
  if (!variants?.length) return;
  const docs = variants.map((v) => ({
    product: productId,
    color: v.color,
    size: v.size,
    availableItems: v.availableItems,
  }));
  await ProductVariantModel.insertMany(docs);
};

export const upsertVariants = async (
  productId: Types.ObjectId | string,
  variants: Array<{ _id?: string; color: string; size: string; availableItems: number }>
) => {
  if (!variants?.length) return;
  for (const v of variants) {
    if (v._id) {
      await ProductVariantModel.findByIdAndUpdate(v._id, {
        color: v.color,
        size: v.size,
        availableItems: v.availableItems,
      });
    } else {
      await ProductVariantModel.create({
        product: productId,
        color: v.color,
        size: v.size,
        availableItems: v.availableItems,
      });
    }
  }
};

export const deleteVariantById = async (variantId: string) => {
  const variant = await ProductVariantModel.findByIdAndDelete(variantId);
  return variant;
};

// ─── Unified GET — users ─────────────────────────────────────────────────────

export interface ProductFilters {
  category?: string;
  isBestSeller?: boolean;
  isSale?: boolean;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  size?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export const getProducts = async (filters: ProductFilters) => {
  const { category, isBestSeller, isSale, minPrice, maxPrice, color, size, sort, page = 1, limit = 20 } = filters;

  const matchFilter: any = { isDeleted: false };

  // Always restrict to products whose category is not soft-deleted
  const activeCategoryDocs = await CategoryModel.find({ isDeleted: false }, { _id: 1 }).lean();
  const activeCategoryIds = activeCategoryDocs.map((c) => c._id);

  if (category) {
    const catId = new mongoose.Types.ObjectId(category);
    const isActive = activeCategoryIds.some((id) => id.toString() === catId.toString());
    if (!isActive) return { products: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    matchFilter.category = catId;
  } else {
    matchFilter.category = { $in: activeCategoryIds };
  }

  if (isBestSeller !== undefined) matchFilter.isBestSeller = isBestSeller;
  if (isSale !== undefined) matchFilter.isSale = isSale;
  if (minPrice !== undefined || maxPrice !== undefined) {
    matchFilter.finalPrice = {};
    if (minPrice !== undefined) matchFilter.finalPrice.$gte = minPrice;
    if (maxPrice !== undefined) matchFilter.finalPrice.$lte = maxPrice;
  }

  if (color || size) {
    const variantFilter: any = {};
    if (color) variantFilter.color = new mongoose.Types.ObjectId(color);
    if (size) variantFilter.size = new mongoose.Types.ObjectId(size);
    const matchingProductIds = await ProductVariantModel.find(variantFilter).distinct("product");
    matchFilter._id = { $in: matchingProductIds };
  }

  const sortCriteria = buildSortCriteria(sort);
  const skip = (page - 1) * limit;
  const total = await ProductModel.countDocuments(matchFilter);
  const totalPages = Math.ceil(total / limit);

  const products = await ProductModel.find(matchFilter)
    .select("-wholesalePrice")
    .sort(sortCriteria)
    .skip(skip)
    .limit(limit)
    .populate(SchemaTypesReference.Category, "categoryName image slug")
    .lean();

  const productsWithVariants = await attachVariants(products);

  return {
    products: productsWithVariants,
    pagination: { total, page, limit, totalPages },
  };
};

// ─── Admin GET ────────────────────────────────────────────────────────────────

export interface AdminProductFilters extends ProductFilters {
  isDeleted?: boolean;
}

export const getAdminProducts = async (filters: AdminProductFilters) => {
  const { category, isBestSeller, minPrice, maxPrice, color, size, isDeleted, sort, page = 1, limit = 20 } = filters;

  const matchFilter: any = { isDeleted: isDeleted !== undefined ? isDeleted : false };

  if (category) matchFilter.category = new mongoose.Types.ObjectId(category);
  if (isBestSeller !== undefined) matchFilter.isBestSeller = isBestSeller;
  if (minPrice !== undefined || maxPrice !== undefined) {
    matchFilter.finalPrice = {};
    if (minPrice !== undefined) matchFilter.finalPrice.$gte = minPrice;
    if (maxPrice !== undefined) matchFilter.finalPrice.$lte = maxPrice;
  }

  if (color || size) {
    const variantFilter: any = {};
    if (color) variantFilter.color = new mongoose.Types.ObjectId(color);
    if (size) variantFilter.size = new mongoose.Types.ObjectId(size);
    const matchingProductIds = await ProductVariantModel.find(variantFilter).distinct("product");
    matchFilter._id = { $in: matchingProductIds };
  }

  const sortCriteria = buildSortCriteria(sort);
  const skip = (page - 1) * limit;
  const total = await ProductModel.countDocuments(matchFilter);
  const totalPages = Math.ceil(total / limit);

  const products = await ProductModel.find(matchFilter)
    .sort(sortCriteria)
    .skip(skip)
    .limit(limit)
    .populate(SchemaTypesReference.Category, "categoryName image slug")
    .lean();

  const productsWithVariants = await attachVariants(products);

  return {
    products: productsWithVariants,
    pagination: { total, page, limit, totalPages },
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildSortCriteria = (sort?: string): Record<string, 1 | -1> => {
  if (sort === "price") return { finalPrice: 1 };
  if (sort === "soldItems") return { soldItems: -1 };
  return { createdAt: -1 };
};

const attachVariants = async (products: any[]) => {
  if (!products.length) return products;
  const productIds = products.map((p) => p._id);
  const variants = await ProductVariantModel.find({ product: { $in: productIds } })
    .populate(SchemaTypesReference.Color, "name hex")
    .populate(SchemaTypesReference.Size, "number order")
    .lean();

  const variantsByProductId = variants.reduce<Record<string, any[]>>((acc, v: any) => {
    const pid = v.product.toString();
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(v);
    return acc;
  }, {});

  return products.map((p) => ({ ...p, variants: variantsByProductId[p._id.toString()] || [] }));
};

// ─── Price helpers ────────────────────────────────────────────────────────────

export const ratioCalculatePrice = async (price: number, salePrice: number) => {
  let discount = 0;
  let discountPercentage = 0;
  let isSale = false;
  if (!salePrice || salePrice === 0) {
    discount = 0;
    discountPercentage = 0;
    isSale = false;
  } else if (salePrice < price) {
    discount = price - salePrice;
    discountPercentage = Math.round((discount / price) * 100 * 100) / 100;
    isSale = true;
  }
  return { discount, discountPercentage, isSale };
};

// ─── Search ───────────────────────────────────────────────────────────────────

export const productSearch = async (querySearch: string) => {
  const products = await ProductModel.find({ isDeleted: false });
  const fuse = new Fuse(products, {
    keys: ["productName", "productDescription"],
    threshold: 0.3,
  });
  const results = fuse.search(querySearch).map((result) => result.item);
  return results;
};

// ─── Legacy helpers (used by order/stock system) ──────────────────────────────

export const findAllProducts = async (page: number) => {
  const products = await paginate(
    ProductModel.find({ isDeleted: false }).sort({ createdAt: -1 }),
    page,
    "categoryName image slug",
    SchemaTypesReference.Category
  );
  return products;
};

export const retrieveProducts = async (productIds: any) => {
  const foundProducts = await ProductModel.find({
    _id: { $in: productIds },
    isDeleted: false,
  });
  return foundProducts;
};

export const updateStock = async (
  orderProducts: ProductOrder[],
  productRecord: Record<string, IProduct & { _id: Types.ObjectId }> | any,
  increaseStock: boolean
) => {
  const bulkOperations: any[] = [];
  for (const orderProduct of orderProducts) {
    let productIdString: string;

    if (typeof orderProduct.productId === "string") {
      productIdString = orderProduct.productId;
    } else if ("_id" in orderProduct.productId) {
      productIdString = orderProduct.productId._id.toString();
    } else {
      console.error("Invalid productId type:", orderProduct.productId);
      continue;
    }
    const product = productRecord[productIdString];
    if (product && orderProduct.quantity !== undefined) {
      const quantityChange = increaseStock ? orderProduct.quantity : -orderProduct.quantity;

      if (increaseStock) {
        product.soldItems = (product.soldItems ?? 0) - quantityChange;
        product.availableItems = (product.availableItems ?? 0) + quantityChange;
      } else {
        product.soldItems = (product.soldItems ?? 0) + Math.abs(quantityChange);
        product.availableItems = (product.availableItems ?? 0) - Math.abs(quantityChange);
      }
      if (product.availableItems <= 0) {
        product.isSoldOut = true;
      } else if (product.availableItems > 0 && increaseStock) {
        product.isSoldOut = false;
      }

      bulkOperations.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              soldItems: product.soldItems,
              availableItems: product.availableItems,
              isSoldOut: product.isSoldOut,
            },
          },
        },
      });
    } else {
      console.log("Skipping Product due to missing data.");
    }
  }

  if (bulkOperations.length > 0) {
    try {
      await ProductModel.bulkWrite(bulkOperations);
    } catch (error) {
      console.error("Error performing bulk update:", error);
    }
  } else {
    console.log("No operations to perform.");
  }
};

export const getAnalytics = async () => {
  const TZ = "Africa/Cairo";

  // ─── Products ─────────────────────────────────────────────────────────────
  const totalProducts = await ProductModel.countDocuments({ isDeleted: false });
  const soldOutProducts = await ProductModel.countDocuments({ isDeleted: false, isSoldOut: true });

  const topSellingDocs = await ProductModel.find({ isDeleted: false })
    .sort({ soldItems: -1 })
    .limit(5)
    .select("productName finalPrice soldItems defaultImage discount discountPercentage")
    .lean();
  const topSelling = topSellingDocs.map((p) => ({
    ...p,
    discountPercentage:
      p.discountPercentage !== undefined && p.discountPercentage !== null
        ? Math.round(p.discountPercentage)
        : p.discountPercentage,
  }));

  const mostWishlisted = await WishListModel.aggregate([
    { $group: { _id: "$productId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: ProductModel.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        _id: 0,
        count: 1,
        product: {
          _id: "$product._id",
          productName: "$product.productName",
          finalPrice: "$product.finalPrice",
          defaultImage: "$product.defaultImage",
        },
      },
    },
  ]);

  const priceTotals = await ProductModel.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        totalFinalPrice: { $sum: { $ifNull: ["$finalPrice", 0] } },
        totalWholesalePrice: { $sum: { $ifNull: ["$wholesalePrice", 0] } },
      },
    },
  ]);

  // ─── Categories ───────────────────────────────────────────────────────────
  const totalCategories = await CategoryModel.countDocuments({ isDeleted: false });

  // ─── Orders ───────────────────────────────────────────────────────────────
  const totalOrders = await OrderModel.countDocuments();

  const startOfToday = moment().startOf("day").toDate();
  const endOfToday = moment().endOf("day").toDate();

  // todaySales = revenue from today's orders (cancelled excluded); todayOrders = all of today's orders
  const todaySalesAgg = await OrderModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        status: { $ne: orderStatusType.cancelled },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  const todayOrders = await OrderModel.countDocuments({
    createdAt: { $gte: startOfToday, $lte: endOfToday },
  });

  // totalRevenue = all-time revenue excluding cancelled orders
  const totalRevenueAgg = await OrderModel.aggregate([
    { $match: { status: { $ne: orderStatusType.cancelled } } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  // averageOrderValue = across completed (delivered) orders only
  const averageOrderAgg = await OrderModel.aggregate([
    { $match: { status: orderStatusType.delivered } },
    { $group: { _id: null, avg: { $avg: "$totalAmount" } } },
  ]);

  const statusAgg = await OrderModel.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const byStatus: Record<string, number> = {};
  statusAgg.forEach((s) => {
    byStatus[s._id] = s.count;
  });

  // last7Days = daily revenue and order count for the past 7 days (cancelled excluded from revenue)
  const sevenDaysAgo = moment().subtract(6, "days").startOf("day").toDate();
  const last7Agg = await OrderModel.aggregate([
    {
      $match: {
        createdAt: { $gte: sevenDaysAgo, $lte: endOfToday },
        status: { $ne: orderStatusType.cancelled },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
  ]);
  const last7Map = last7Agg.reduce<Record<string, { revenue: number; orders: number }>>(
    (acc, d) => {
      acc[d._id] = { revenue: d.revenue, orders: d.orders };
      return acc;
    },
    {}
  );
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = moment().subtract(i, "days").format("YYYY-MM-DD");
    const entry = last7Map[date];
    last7Days.push({ date, revenue: entry?.revenue ?? 0, orders: entry?.orders ?? 0 });
  }

  // ─── Customers ────────────────────────────────────────────────────────────
  const totalCustomers = await AuthModel.countDocuments();

  return {
    products: {
      total: totalProducts,
      soldOut: soldOutProducts,
      topSelling,
      mostWishlisted,
      totalFinalPrice: priceTotals[0]?.totalFinalPrice ?? 0,
      totalWholesalePrice: priceTotals[0]?.totalWholesalePrice ?? 0,
    },
    categories: {
      total: totalCategories,
    },
    orders: {
      total: totalOrders,
      todaySales: todaySalesAgg[0]?.total ?? 0,
      todayOrders,
      totalRevenue: totalRevenueAgg[0]?.total ?? 0,
      averageOrderValue: averageOrderAgg[0]?.avg ?? 0,
      byStatus,
      last7Days,
    },
    customers: {
      total: totalCustomers,
    },
  };
};

export const getAvailableItems = async (productIds: [string]) => {
  const products = await ProductModel.find(
    { _id: { $in: productIds } },
    { _id: 1, availableItems: 1 }
  );
  return products;
};
