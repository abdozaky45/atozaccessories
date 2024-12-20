import { Schema, model } from "mongoose"
import { RequiredNumber, RequiredUniqueString } from "../../Utils/Schemas";
import IShipping from "./IShipping";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
const ShippingSchema = new Schema<IShipping>({
    category: RequiredUniqueString,
    Cost: RequiredNumber
});
const ShippingModel = model(SchemaTypesReference.Shipping, ShippingSchema)
export default ShippingModel;