import { Types } from "mongoose";

interface CartItems {
  productId:  Types.ObjectId | string;
  quantity: number;
}
export default interface CartInterfaceModel {
  user?: Types.ObjectId | string;
  items: CartItems[];
  Subtotal: number;
  Total: number;
  createdAt: number;
  updatedAt: number;
}