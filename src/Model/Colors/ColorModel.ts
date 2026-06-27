import { Schema, model } from "mongoose";
import IColor from "./Icolor";
import { RequiredUniqueString, RequiredString } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";

const ColorSchema = new Schema<IColor>({
  name: RequiredUniqueString,
  hex: RequiredString,
});

const ColorModel = model(SchemaTypesReference.Color, ColorSchema);
export default ColorModel;
