import { Schema, model } from "mongoose";
import ImageSliderInterface from "./ImageSliderInterfaceModel";
import { ImageSchema, RefType } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
const ImageSliderSchema = new Schema<ImageSliderInterface>({
  image: ImageSchema,
  createdBy: RefType(SchemaTypesReference.User, true),
});
const ImageSliderModel = model(
  SchemaTypesReference.imageSlider,
  ImageSliderSchema
);
export default ImageSliderModel;
