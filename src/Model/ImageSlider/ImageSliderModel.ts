import { Schema, model } from "mongoose";
import IimageSlider from "./IimageSlider";
import {ImageSlider, RefType } from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
const ImageSliderSchema = new Schema<IimageSlider>({
  images:{
  image1: ImageSlider,
  image2: ImageSlider,
  },
  createdBy: RefType(SchemaTypesReference.User, true),
});
const ImageSliderModel = model(
  SchemaTypesReference.imageSlider,
  ImageSliderSchema
);
export default ImageSliderModel;
