import slugify from "slugify";
import _ from "lodash";
// @ts-ignore
import ProductInterFaceModel from "../../Model/Product/ProductInterFaceModel";
import ProductModel from "../../Model/Product/ProductModel";
import { extractMediaId } from "../CategoryService/CategoryService";
import { paginate } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";

export const createProduct = async (productData: ProductInterFaceModel) => {
  const product = await ProductModel.create(productData);
  return product;
};
export const findProductById = async (id: string) => {
  const product = await ProductModel.findById(id);
  return product;
};
export const prepareProductUpdates = async (
  productData: any,
  product: ProductInterFaceModel,
  defaultImage: string,
  albumImages: string[]
) => {
  let updates = false;
  Object.keys(productData).forEach((key) => {
    const field = key as keyof ProductInterFaceModel;
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
