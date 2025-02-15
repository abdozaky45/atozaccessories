import { Schema, model } from "mongoose"
import { NotRequiredBoolean, RequiredNumber, RequiredString } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import IShipping from "./Ishipping";
const ShippingSchema = new Schema<IShipping>({
    category: RequiredString,
    cost: RequiredNumber,
    isDeleted:NotRequiredBoolean
});
const ShippingModel = model(SchemaTypesReference.Shipping, ShippingSchema)
export default ShippingModel;