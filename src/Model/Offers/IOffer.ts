import { Types } from "mongoose";

export type OfferStatus = "scheduled" | "active" | "expired";

export type OfferType =
  | "buy_x_get_cheapest_free"
  | "spend_x_get_discount"
  | "spend_x_get_free_shipping"
  | "buy_x_get_free_shipping"
  | "buy_x_get_half_price"
  | "spend_x_get_free_item"
  | "deal_of_day"
  | "flash_sale";

export default interface IOffer {
  title: string;
  description: string;
  isActive: boolean;
  status: OfferStatus;
  image: {
    mediaKey: string;
    mediaUrl: string;
  };
  offerType: OfferType;
  timing: {
    startDate: Date | null;
    endDate: Date | null;
  };
  condition: {
    minQuantity: number | null;
    minAmount: number | null;
    excludedCategories: Types.ObjectId[];
  };
  reward: {
    discountPercentage: number | null;
    freeItemMaxValue: number | null;
  };
  targetProducts: Types.ObjectId[];
  targetCategories: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
