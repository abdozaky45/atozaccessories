import { Types } from "mongoose";
import UserInterfaceModel from "../User/UserInterfaceModel";
interface categoryImage {
    mediaUrl: string;
    mediaId: string;
  }
  export default interface CategoryInterFaceModel {
    categoryName: string;
    image: categoryImage;
    slug: string;
    createdBy:Types.ObjectId | string;
    createdAt: number;
  }
  