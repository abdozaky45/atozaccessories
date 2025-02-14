import { Types } from "mongoose";
interface categoryImage {
    mediaUrl: string;
    mediaId: string;
  }
  export default interface ICategory {
    categoryName: string;
    image: categoryImage;
    slug: string;
    createdBy:Types.ObjectId | string;
    createdAt: number;
    isDeleted?: boolean;
  }
  