import { Schema, model } from "mongoose";
import IIcon from "./Iicon";
import { RequiredUniqueString, RequiredString } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";

const IconSchema = new Schema<IIcon>({
  key: RequiredUniqueString,
  svg: RequiredString,
  isActive: { type: Boolean, required: false, default: true },
});

const IconModel = model(SchemaTypesReference.Icon, IconSchema);
export default IconModel;
