import { Types } from "mongoose";
export interface Iwishlist {
  user: Types.ObjectId | string;
  productId: Types.ObjectId | string;
  createdAt: number;
}
