import { Types } from "mongoose";

export default interface IProductVariant {
  product: Types.ObjectId | string;
  color: Types.ObjectId | string;
  size: Types.ObjectId | string;
  availableItems: number;
}
