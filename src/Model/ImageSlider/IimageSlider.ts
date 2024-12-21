import { Types } from "mongoose";
interface imageSlider {
  mediaUrl: string;
  mediaId: string;
}
export default interface IimageSlider {
  image: imageSlider;
  createdBy: Types.ObjectId | string;
}
