import { Types } from "mongoose";
export interface WishlistInterfaceModel {
  user: Types.ObjectId | string;
  productId: Types.ObjectId | string;
  createdAt: number;
}
