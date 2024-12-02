import slugify from "slugify";
import ProductInterFaceModel from "../../Model/Product/ProductInterFaceModel";
import ProductModel from "../../Model/Product/ProductModel";
import {
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
  let updates = true;
  product.productName = productData.productName || product.productName;
  product.slug = productData.productName
    ? slugify(product.productName)
    : product.slug;
  product.productDescription =
    productData.productDescription || product.productDescription;
  product.availableItems = productData.availableItems || product.availableItems;
  product.price = productData.price || product.price;
  product.salePrice = productData.salePrice || product.salePrice;
  product.expiredSale = productData.expiredSale || product.expiredSale;
  product.category = productData.category || product.category;
  if (
    productData.defaultImage &&
    productData.defaultImage !== product.defaultImage.mediaUrl
  ) {
    const mediaId = extractMediaId(productData.defaultImage);
    if (mediaId !== product.defaultImage.mediaId) {
      product.defaultImage.mediaUrl = productData.defaultImage;
      product.defaultImage.mediaId = mediaId;
    }
  }

  if (productData.albumImages) {
    productData.albumImages.forEach((imageUrl: string, index: number) => {
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
export const deleteOneProduct = async (productId:string) => {
  const product = await ProductModel.deleteOne({ _id: productId });
  return product;
};