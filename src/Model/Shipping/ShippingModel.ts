import { Schema, model } from "mongoose"
import { RequiredNumber, RequiredUniqueString } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import IShipping from "./Ishipping";
const ShippingSchema = new Schema<IShipping>({
    category: RequiredUniqueString,
    cost: RequiredNumber
});
const ShippingModel = model(SchemaTypesReference.Shipping, ShippingSchema)
export default ShippingModel;