import ProductInterFaceModel from "../../Model/Product/ProductInterFaceModel";
import ProductModel from "../../Model/Product/ProductModel";
import {
  deletePresignedURL,
  extractMediaId,
} from "../CategoryService/CategoryService";

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
  product: ProductInterFaceModel
) => {
  let updates = false;
  productData.productName = productData.productName || product.productName;
  productData.productDescription =
    productData.productDescription || product.productDescription;
  productData.availableItems =
    productData.availableItems || product.availableItems;
  productData.price = productData.price || product.price;
  productData.salePrice = productData.salePrice || product.salePrice;
  productData.expiredSale = productData.expiredSale || product.expiredSale;
  productData.category = productData.category || product.category;
  if (
    productData.defaultImage &&
    productData.defaultImage !== product.defaultImage.mediaUrl
  ) {
    const mediaId = extractMediaId(productData.defaultImage);
    if (mediaId !== product.defaultImage.mediaId) {
      await deletePresignedURL(product.defaultImage.mediaId);
    }
    product.defaultImage.mediaUrl = productData.defaultImage;
    product.defaultImage.mediaId = mediaId;
    updates = true;
  }
  if (productData.albumImages && productData.albumImages > 0) {
    
  }
};
