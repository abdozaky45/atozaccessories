import slugify from "slugify";
import _ from "lodash";
import ProductModel from "../../Model/Product/ProductModel";
import { extractMediaId } from "../CategoryService/CategoryService";
import { paginate } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import Fuse from "fuse.js";
import { sortProductEnum } from "../../Utils/SortProduct";
import mongoose, { Types } from "mongoose";
import { ProductOrder } from "../../Model/Order/Iorder";
import IProduct from "../../Model/Product/Iproduct";
import OrderModel from "../../Model/Order/OrderModel";
import { orderStatusType } from "../../Utils/OrderStatusType";
import AuthModel from "../../Model/User/auth/AuthModel";

export const createProduct = async (productData: IProduct) => {
  const product = await ProductModel.create(productData);
  return product;
};
export const findProductById = async (id: string | Types.ObjectId) => {
  const product = ProductModel.findOne({ _id: id, isDeleted: false });
  return product;
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

  if (
    productData.productName &&
    productData.productName !== product.productName
  ) {
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
    // if (!product.albumImages) {
    product.albumImages = [];
    // }

    albumImages.forEach((imageUrl: string) => {
      const mediaId = extractMediaId(imageUrl);
      if (mediaId) {
        product.albumImages!.push({
          mediaUrl: imageUrl,
          mediaId: mediaId,
        });
        updates = true;
      }
    });
  }
  return updates ? product : null;
};

export const deleteOneProduct = async (_id: string | Types.ObjectId) => {
  const product = await ProductModel.findByIdAndUpdate(_id, {
    isDeleted: true,
  });
  return product;
};
export const findAllProducts = async (page: number) => {
  const products = await paginate(
    ProductModel.find({ isDeleted: false }).sort({ createdAt: -1 }),
    page,
    "categoryName image slug",
    SchemaTypesReference.Category
  );
  return products;
};
export const findAllSaleProducts = async (page: number) => {
  const products = await paginate(
    ProductModel.find({ isSale: true, isDeleted: false }).sort({
      createdAt: -1,
    }),
    page,
    "categoryName image slug",
    SchemaTypesReference.Category
  );
  return products;
};
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
    discountPercentage = (discount / price) * 100;
    isSale = true;
  }
  return { discount, discountPercentage, isSale };
};
export const productSearch = async (querySearch: string) => {
  const products = await ProductModel.find({ isDeleted: false });
  const fuse = new Fuse(products, {
    keys: ["productName", "productDescription"],
    threshold: 0.3,
  });
  const results = fuse.search(querySearch).map((result) => result.item);
  return results;
};
export const findProductBySort = async (sortBy: string, page: number) => {
  let sortCriteria = {};
  switch (sortBy) {
    case sortProductEnum.newest:
      sortCriteria = { createdAt: -1 };
      break;
    case sortProductEnum.priceLowToHigh:
      sortCriteria = { price: -1 };
      break;
    case sortProductEnum.priceHighToLow:
      sortCriteria = { price: 1 };
      break;
    default:
      sortCriteria = { createdAt: -1 };
      break;
  }
  const products = await paginate(
    ProductModel.find({ isDeleted: false }).sort(sortCriteria),
    page,
    "categoryName image slug",
    SchemaTypesReference.Category
  );
  return products;
};
export const findProductByPriceRange = async (
  priceRange: string,
  page: number
) => {
  let priceCriteria: any = { isDeleted: false };
  switch (priceRange) {
    case sortProductEnum.priceUnder100:
      priceCriteria = {
        $and: [{ isDeleted: false }, { price: { $lte: 100 } }],
      };
      break;
    case sortProductEnum.priceBetween100and500:
      priceCriteria = {
        $and: [{ isDeleted: false }, { price: { $gte: 100, $lte: 500 } }],
      };
      break;
    case sortProductEnum.priceBetween500and1000:
      priceCriteria = {
        $and: [{ isDeleted: false }, { price: { $gte: 500, $lte: 1000 } }],
      };
      break;
    case sortProductEnum.priceAbove1000:
      priceCriteria = {
        $and: [{ isDeleted: false }, { price: { $gte: 1000 } }],
      };
      break;
    default:
      priceCriteria = { isDeleted: false };
      break;
  }
  const products = await paginate(
    ProductModel.find(priceCriteria),
    page,
    "-_id categoryName image slug",
    SchemaTypesReference.Category
  );
  return products;
};
export const findProductBySoldOut = async (page: number) => {
  const products = await paginate(
    ProductModel.find({ isSoldOut: true, isDeleted: false }).sort({
      createdAt: -1,
    }),
    page,
    "categoryName image slug",
    SchemaTypesReference.Category
  );
  return products;
};
export const findProducts = async (
  sort: string,
  priceRange: string,
  page: number
) => {
  const perPage = 20;
  const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
  const skip = (currentPage - 1) * perPage;

  const pipeline: any[] = [];

  pipeline.push({ $match: { isDeleted: false } });

  pipeline.push({
    $addFields: {
      finalPrice: {
        $cond: {
          if: { $gt: ["$salePrice", 0] },
          then: "$salePrice",
          else: "$price",
        },
      },
    },
  });

  if (priceRange) {
    let priceFilter = {};
    switch (priceRange) {
      case sortProductEnum.priceUnder100:
        priceFilter = { $lte: 100 };
        break;
      case sortProductEnum.priceBetween100and500:
        priceFilter = { $gte: 100, $lte: 500 };
        break;
      case sortProductEnum.priceBetween500and1000:
        priceFilter = { $gte: 500, $lte: 1000 };
        break;
      case sortProductEnum.priceAbove1000:
        priceFilter = { $gte: 1000 };
        break;
    }
    pipeline.push({ $match: { finalPrice: priceFilter } });
  }

  let sortCriteria: any = { createdAt: -1 };

  if (sort) {
    switch (sort) {
      case sortProductEnum.newest:
        sortCriteria = { createdAt: -1 };
        break;
      case sortProductEnum.priceLowToHigh:
        sortCriteria = { finalPrice: -1 };
        break;
      case sortProductEnum.priceHighToLow:
        sortCriteria = { finalPrice: 1 };
        break;
    }
  }
  pipeline.push({ $sort: sortCriteria });

  pipeline.push({
    $lookup: {
      from: "categories",
      localField: "category",
      foreignField: "_id",
      as: "category",
    },
  });
  pipeline.push({ $unwind: "$category" });
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: perPage }],
      totalItems: [{ $count: "count" }],
    },
  });
  const result = await ProductModel.aggregate(pipeline).exec();
  const data = result[0].data;
  const totalItems = result[0].totalItems[0]?.count || 0;
  const totalPages = Math.ceil(totalItems / perPage);

  return {
    data,
    totalItems,
    totalPages,
    currentPage,
  };
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
      const quantityChange = increaseStock
        ? orderProduct.quantity
        : -orderProduct.quantity;

      if (increaseStock) {
        product.soldItems = (product.soldItems ?? 0) - quantityChange;
        product.availableItems = (product.availableItems ?? 0) + quantityChange;
      } else {
        product.soldItems = (product.soldItems ?? 0) + Math.abs(quantityChange);
        product.availableItems =
          (product.availableItems ?? 0) - Math.abs(quantityChange);
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

export const findAllProductsByCategory = async (
  sort: string,
  priceRange: string,
  page: number,
  categoryId: string | Types.ObjectId
) => {
  if (!categoryId) {
    throw new Error("categoryId is required");
  }

  const perPage = 20;
  const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
  const skip = (currentPage - 1) * perPage;

  const pipeline: any[] = [];

  pipeline.push({
    $match: {
      isDeleted: false,
      category: new mongoose.Types.ObjectId(categoryId),
    },
  });

  pipeline.push({
    $addFields: {
      finalPrice: {
        $cond: {
          if: { $gt: ["$salePrice", 0] },
          then: "$salePrice",
          else: "$price",
        },
      },
    },
  });

  if (priceRange) {
    let priceFilter = {};
    switch (priceRange) {
      case sortProductEnum.priceUnder100:
        priceFilter = { $lte: 100 };
        break;
      case sortProductEnum.priceBetween100and500:
        priceFilter = { $gte: 100, $lte: 500 };
        break;
      case sortProductEnum.priceBetween500and1000:
        priceFilter = { $gte: 500, $lte: 1000 };
        break;
      case sortProductEnum.priceAbove1000:
        priceFilter = { $gte: 1000 };
        break;
    }
    pipeline.push({ $match: { finalPrice: priceFilter } });
  }

  let sortCriteria: any = { createdAt: -1 };

  if (sort) {
    switch (sort) {
      case sortProductEnum.newest:
        sortCriteria = { createdAt: -1 };
        break;
      case sortProductEnum.priceLowToHigh:
        sortCriteria = { finalPrice: -1 };
        break;
      case sortProductEnum.priceHighToLow:
        sortCriteria = { finalPrice: 1 };
        break;
    }
  }
  pipeline.push({ $sort: sortCriteria });

  pipeline.push({
    $lookup: {
      from: "categories",
      localField: "category",
      foreignField: "_id",
      as: "category",
    },
  });
  pipeline.push({ $unwind: "$category" });
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: perPage }],
      totalItems: [{ $count: "count" }],
    },
  });

  const result = await ProductModel.aggregate(pipeline).exec();
  const data = result[0].data;
  const totalItems = result[0].totalItems[0]?.count || 0;
  const totalPages = Math.ceil(totalItems / perPage);

  return {
    data,
    totalItems,
    totalPages,
    currentPage,
  };
};

export const getAnalytics = async () => {
  const totalRevenue = await OrderModel.aggregate([
    { $match: { status: orderStatusType.delivered } },
    { $group: { _id: null, total: { $sum: "$price" } } },
  ]);
  const totalOrders = await OrderModel.countDocuments();
  const totalCustomers = await AuthModel.countDocuments();
  const totalProducts = await ProductModel.countDocuments();

  return {
    totalRevenue: totalRevenue[0]?.total ?? 0,
    totalOrders,
    totalCustomers,
    totalProducts,
  };
};
export const getAvailableItems = async (productIds: [string]) => {
  const products = await ProductModel.find(
    { _id: { $in: productIds } },
    { _id: 1, availableItems: 1 }
  );
  return products;
};
