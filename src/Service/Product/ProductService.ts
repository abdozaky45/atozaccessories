import ProductInterFaceModel from "../../Model/Product/ProductInterFaceModel";
import ProductModel from "../../Model/Product/ProductModel";

export const createProduct = async (productData: ProductInterFaceModel) => {
  const product = await ProductModel.create(productData);
  return product;
};