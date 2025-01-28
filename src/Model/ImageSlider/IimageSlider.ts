import { Types } from "mongoose";
interface imageSlider {
  mediaUrl: string;
  mediaId: string;
  mediaType: string; // small, large
}
export default interface IimageSlider {
  images:{
    image1: imageSlider;
    image2: imageSlider;
  };
  createdBy: Types.ObjectId | string;
}
