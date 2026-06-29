import { Types } from "mongoose";

export default interface IProductVariant {
  product: Types.ObjectId | string;
  color?: Types.ObjectId | string | null;
  size?: Types.ObjectId | string | null;
  availableItems: number;
}
