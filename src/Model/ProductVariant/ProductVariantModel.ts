import { Schema, model } from "mongoose";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import { RefType, RequiredNumber } from "../../Utils/Schemas";
import IProductVariant from "./IproductVariant";

const ProductVariantSchema = new Schema<IProductVariant>({
  product: RefType(SchemaTypesReference.Product, true),
  // color/size are optional: a "simple" product (no options) is a single variant
  // with both null. They default to null (see RefType), so the unique compound
  // index below treats {product, null, null} as one allowed combination.
  color: RefType(SchemaTypesReference.Color, false),
  size: RefType(SchemaTypesReference.Size, false),
  availableItems: RequiredNumber,
});

ProductVariantSchema.index({ product: 1, color: 1, size: 1 }, { unique: true });

const ProductVariantModel = model(SchemaTypesReference.ProductVariant, ProductVariantSchema);
export default ProductVariantModel;
