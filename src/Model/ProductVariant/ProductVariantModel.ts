import { Schema, model } from "mongoose";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import { RefType, RequiredNumber } from "../../Utils/Schemas";
import IProductVariant from "./IproductVariant";

const ProductVariantSchema = new Schema<IProductVariant>({
  product: RefType(SchemaTypesReference.Product, true),
  color: RefType(SchemaTypesReference.Color, true),
  size: RefType(SchemaTypesReference.Size, true),
  availableItems: RequiredNumber,
});

ProductVariantSchema.index({ product: 1, color: 1, size: 1 }, { unique: true });

const ProductVariantModel = model(SchemaTypesReference.ProductVariant, ProductVariantSchema);
export default ProductVariantModel;
