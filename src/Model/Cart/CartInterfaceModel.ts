import { Types } from "mongoose";

export interface ProductItem {
  productId: Types.ObjectId | string;
  quantity: number;
}
export interface BaseProductInterface {
  user: Types.ObjectId | string;
  items: ProductItem[];
  createdAt: number;
}
export interface CartInterfaceModel extends BaseProductInterface {}
