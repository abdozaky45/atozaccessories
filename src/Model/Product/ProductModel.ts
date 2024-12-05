import { Schema, model } from "mongoose";
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
import { NextFunction } from "express";
const ProductSchema = new Schema<ProductInterFaceModel>(
  {
    productName: RequiredString,
    productDescription: RequiredString,
    availableItems: RequiredNumber,
    price: RequiredNumber,
    salePrice: NotRequiredNumber,
    discount: NotRequiredNumber,
    discountPercentage: NotRequiredNumber,
    soldItems: NotRequiredNumber,
    isSoldOut: NotRequiredBoolean,
    isSale: NotRequiredBoolean,
    expiredSale: NotRequiredNumber,
    isExpiredSale: NotRequiredBoolean,
    category: RefType(SchemaTypesReference.Category, true),
    createdBy: RefType(SchemaTypesReference.User, true),
    slug: RequiredString,
    defaultImage: ImageSchema,
    albumImages: { type: [ImageSchema], required: false },
    createdAt: RequiredNumber,
    updatedAt: RequiredNumber,
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
ProductSchema.pre("save", function (next) {
  const product = this as ProductInterFaceModel;
  if (product.salePrice && product.salePrice < product.price) {
    product.discount = product.price - product.salePrice;
    product.discountPercentage = (product.discount / product.price) * 100;
    product.isSale = true;
  } else {
    product.discount = 0;
    product.discountPercentage = 0;
    product.isSale = false;
  }
  next();
});

ProductSchema.virtual("finalPrice").get(function () {
  const product = this as ProductInterFaceModel;
  const discount = product.price - (product.salePrice || 0);   //150 - 130 = 20
  const discountPercentage = (discount / product.price) * 100;  // 20 / 150 = 13.3333%
  const finalPrice = product.price - discount;

  return {
    finalPrice,
    discount,
    discountPercentage,
  };
});
ProductSchema.methods.isStock = function (requiredQuantity: number) {
  return this.availableItems >= requiredQuantity ? true : false;
};
const ProductModel = model(SchemaTypesReference.Product, ProductSchema);
export default ProductModel;
