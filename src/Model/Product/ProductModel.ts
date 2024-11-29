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
  price: RequiredNumber,
  salePrice: NotRequiredNumber,
  expiredSale: NotRequiredNumber,
  isExpiredSale: NotRequiredBoolean,
  discount: NotRequiredNumber,
  availableItems: RequiredNumber,
  soldItems: NotRequiredNumber,
  category: RefType(SchemaTypesReference.Category, true),
  createdBy: RefType(SchemaTypesReference.User, true),
  slug: RequiredString,
  defaultImage:ImageSchema,
  albumImages: [ImageSchema],
  createdAt: RequiredNumber,
  updatedAt: RequiredNumber,
});
const ProductModel = model(SchemaTypesReference.Product, ProductSchema);
export default ProductModel;
