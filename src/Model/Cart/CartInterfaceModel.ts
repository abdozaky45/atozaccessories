import { Types } from "mongoose";

export interface CartItems {
  productId:  Types.ObjectId | string;
  quantity: number;
}
export default interface CartInterfaceModel {
  user?: Types.ObjectId | string;
  items: CartItems[];
  createdAt: number;
}