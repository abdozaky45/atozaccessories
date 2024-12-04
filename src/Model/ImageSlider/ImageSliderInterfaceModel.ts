import { Types } from "mongoose";
interface imageSlider {
  mediaUrl: string;
  mediaId: string;
}
export default interface ImageSliderInterface {
  image: imageSlider;
  createdBy: Types.ObjectId | string;
}
