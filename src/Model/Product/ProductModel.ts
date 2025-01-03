import { Schema, model } from "mongoose";
import IProduct from "./Iproduct";
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
const ProductSchema = new Schema<IProduct>(
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
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
ProductSchema.methods.isStock = function (requiredQuantity: number) {
  return this.availableItems >= requiredQuantity;
};
const ProductModel = model(SchemaTypesReference.Product, ProductSchema);
export default ProductModel;
