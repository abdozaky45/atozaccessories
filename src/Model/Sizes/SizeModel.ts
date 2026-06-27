import { Schema, model } from "mongoose";
import ISize from "./Isize";
import { RequiredUniqueString, RequiredNumber } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";

const SizeSchema = new Schema<ISize>({
  number: RequiredUniqueString,
  order: RequiredNumber,
});

const SizeModel = model(SchemaTypesReference.Size, SizeSchema);
export default SizeModel;
