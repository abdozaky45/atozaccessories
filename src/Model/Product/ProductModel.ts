import { Schema, model, Types } from "mongoose";
import ProductInterFaceModel from "./ProductInterFaceModel";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import {
  ImageSchema,
  NotRequiredBoolean,
  NotRequiredNumber,
  RefType,
  RequiredNumber,
  RequiredString,
} from "../../Utils/Schemas";
const ProductSchema = new Schema<ProductInterFaceModel>({
  productName: RequiredString,
  productDescription: RequiredString,
  availableItems: RequiredNumber,
  price: RequiredNumber,
  salePrice: NotRequiredNumber,
  discount: NotRequiredNumber,
  discountPercentage: NotRequiredNumber,
  soldItems: NotRequiredNumber,
  isSoldOut: NotRequiredBoolean,
  expiredSale: NotRequiredNumber,
  isExpiredSale: NotRequiredBoolean,
  category: RefType(SchemaTypesReference.Category, true),
  createdBy: RefType(SchemaTypesReference.User, true),
  slug: RequiredString,
  defaultImage: ImageSchema,
  albumImages: { type: [ImageSchema], required: false },
  createdAt: RequiredNumber,
  updatedAt: RequiredNumber,
});
ProductSchema.pre("save", function (next) {
  const product = this as ProductInterFaceModel;
  if (product.salePrice && product.salePrice < product.price) {
    product.discount = product.price - product.salePrice;
    product.discountPercentage = (product.discount / product.price) * 100;
  } else {
    product.discount = 0;
    product.discountPercentage = 0;
  }
  next();
});
ProductSchema.virtual("finalPrice").get(function () {
  const product = this as ProductInterFaceModel;
  const discountAmount =
    (product.price * (product.discountPercentage || 0)) / 100;
  const finalPrice = product.price - discountAmount;
  return finalPrice.toFixed(2);
});
ProductSchema.methods.isStock = function (requiredQuantity: number) {
  return this.availableItems >= requiredQuantity ? true : false;
};
const ProductModel = model(SchemaTypesReference.Product, ProductSchema);
export default ProductModel;
