import slugify from "slugify";
import _ from "lodash";
// @ts-ignore
import Iproduct from "../../Model/Product/Iproduct";
import ProductModel from "../../Model/Product/ProductModel";
import { extractMediaId } from "../CategoryService/CategoryService";
import { paginate } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import Fuse from "fuse.js";
import { sortProductEnum } from "../../Utils/SortProduct";

export const createProduct = async (productData: Iproduct) => {
  const product = await ProductModel.create(productData);
  return product;
};
export const findProductById = async (id: string) => {
  const product = await ProductModel.findById(id);
  return product;
};
export const prepareProductUpdates = async (
  productData: any,
  product: Iproduct,
  defaultImage: string,
  albumImages: string[]
) => {
  let updates = false;
  Object.keys(productData).forEach((key) => {
    const field = key as keyof Iproduct;
    if (!_.isEqual(productData[field], product[field])) {
      (product[field] as any) = productData[field];
      updates = true;
    }
  });
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
    }
  }

  if (albumImages) {
    albumImages.forEach((imageUrl: string, index: number) => {
      const existingImages = product.albumImages?.[index];
      if (existingImages && imageUrl !== existingImages.mediaUrl) {
        const mediaId = extractMediaId(imageUrl);
        if (mediaId !== existingImages.mediaId) {
          existingImages.mediaUrl = imageUrl;
          existingImages.mediaId = mediaId;
        }
      }
    });
  }
  return updates ? product : null;
};
export const deleteOneProduct = async (productId: string) => {
  const product = await ProductModel.deleteOne({ _id: productId });
  return product;
};
export const findAllProducts = async (page: number) => {
  const products = await paginate(
    ProductModel.find({}).sort({ createdAt: -1 }),
    page,
    "-_id categoryName image slug",
    SchemaTypesReference.Category
  );
  return products;
};
export const findAllSaleProducts = async (page: number) => {
  const products = await paginate(
    ProductModel.find({ isSale: true }).sort({ createdAt: -1 }),
    page,
    "-_id categoryName image slug",
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
  const products = await ProductModel.find({});
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
    ProductModel.find({}).sort(sortCriteria),
    page,
    "-_id categoryName image slug",
    SchemaTypesReference.Category
  );
  return products;
};
export const findProductByPriceRange=async(priceRange :string,page:number)=>{
  let priceCriteria = {};
  switch (priceRange) {
    case sortProductEnum.priceUnder100:
      priceCriteria = {price:{$lte:100}};
      break;
    case sortProductEnum.priceBetween100and500:
      priceCriteria = {price:{$gte:100,$lte:500}};
      break;
    case sortProductEnum.priceBetween500and1000:
      priceCriteria = {price:{$gte:500,$lte:1000}};
      break;
    case sortProductEnum.priceAbove1000:
      priceCriteria = {price:{$gte:1000}};
      break;
    default:
      priceCriteria = {};
      break;
  }
  const products = await paginate(
    ProductModel.find(priceCriteria),
    page,
    "-_id categoryName image slug",
    SchemaTypesReference.Category
  );
  return products;
}