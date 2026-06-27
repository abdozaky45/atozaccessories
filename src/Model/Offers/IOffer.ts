import { Types } from "mongoose";

export type OfferStatus = "scheduled" | "active" | "expired";

export type OfferType =
  // ── Cart offers (one applied per order — the most valuable to the customer) ──
  | "buy_x_get_cheapest_free" // Buy N items, get the cheapest item free
  | "spend_x_get_discount" // Spend X, get Y% off the total
  | "spend_x_get_free_shipping" // Spend X, get free shipping
  | "buy_x_get_free_shipping" // Buy N items, get free shipping (supports excludedCategories)
  | "buy_x_get_half_price" // Buy one item, get the cheapest other item at 50% off
  | "spend_x_get_free_item" // Spend X, get a customer-chosen item worth <= Y for free
  // ── Homepage / flash offers (time-bounded) ──
  | "flash_sale"; // A specific product gets a big discount for a limited time

export default interface IOffer {
  title: string;
  description: string;
  isActive: boolean;
  status: OfferStatus;
  image?: {
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
