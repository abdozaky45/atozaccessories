import { Schema, model } from "mongoose";
import IOffer, { OfferType, OfferStatus } from "./IOffer";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import { RequiredString, NotRequiredString } from "../../Utils/Schemas";

const OFFER_STATUSES: OfferStatus[] = ["scheduled", "active", "expired"];

const OFFER_TYPES: OfferType[] = [
  "buy_x_get_cheapest_free",
  "spend_x_get_discount",
  "spend_x_get_free_shipping",
  "buy_x_get_free_shipping",
  "buy_x_get_half_price",
  "spend_x_get_free_item",
  "flash_sale",
];

const OfferSchema = new Schema<IOffer>(
  {
    title: RequiredString,
    description: NotRequiredString,
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: OFFER_STATUSES, default: "scheduled" },
    // Image is optional — an offer can be created without one (not currently surfaced).
    image: {
      mediaKey: { type: String },
      mediaUrl: { type: String },
    },
    offerType: {
      type: String,
      required: true,
      enum: OFFER_TYPES,
    },
    timing: {
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    condition: {
      minQuantity: { type: Number, default: null },
      minAmount: { type: Number, default: null },
      excludedCategories: [{ type: Schema.Types.ObjectId, ref: SchemaTypesReference.Category }],
    },
    reward: {
      discountPercentage: { type: Number, default: null },
      freeItemMaxValue: { type: Number, default: null },
    },
    targetProducts: [{ type: Schema.Types.ObjectId, ref: SchemaTypesReference.Product }],
    targetCategories: [{ type: Schema.Types.ObjectId, ref: SchemaTypesReference.Category }],
  },
  { timestamps: true }
);

const OfferModel = model<IOffer>(SchemaTypesReference.Offer, OfferSchema);
export default OfferModel;
