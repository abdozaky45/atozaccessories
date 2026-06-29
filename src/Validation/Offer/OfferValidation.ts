import joi from "joi";
import { baseSchema } from "../baseSchema";

const OFFER_TYPES = [
  "buy_x_get_cheapest_free",
  "spend_x_get_discount",
  "spend_x_get_free_shipping",
  "buy_x_get_free_shipping",
  "buy_x_get_half_price",
  "spend_x_get_free_item",
  "flash_sale",
];

const imageSchema = joi.object({
  mediaUrl: joi.string().required(),
});

const timingSchema = joi.object({
  startDate: joi.date().allow(null).optional(),
  endDate: joi.date().allow(null).optional(),
});

const conditionSchema = joi.object({
  minQuantity: joi.number().min(1).allow(null).optional(),
  minAmount: joi.number().min(0).allow(null).optional(),
  excludedCategories: joi.array().items(joi.string()).optional(),
});

const rewardSchema = joi.object({
  discountPercentage: joi.number().min(0).max(100).allow(null).optional(),
  freeItemMaxValue: joi.number().min(0).allow(null).optional(),
});

export const createOfferValidation = baseSchema.concat(
  joi.object({
    title: joi.string().required(),
    description: joi.string().allow("").optional(),
    isActive: joi.boolean().optional(),
    image: imageSchema.optional(),
    offerType: joi.string().valid(...OFFER_TYPES).required(),
    timing: timingSchema.optional(),
    condition: conditionSchema.optional(),
    reward: rewardSchema.optional(),
    targetProducts: joi.array().items(joi.string()).optional(),
    targetCategories: joi.array().items(joi.string()).optional(),
  }).required()
);

export const updateOfferValidation = baseSchema.concat(
  joi.object({
    id: joi.string().required(),
    title: joi.string().optional(),
    description: joi.string().allow("").optional(),
    isActive: joi.boolean().optional(),
    image: imageSchema.optional(),
    offerType: joi.string().valid(...OFFER_TYPES).optional(),
    timing: timingSchema.optional(),
    condition: conditionSchema.optional(),
    reward: rewardSchema.optional(),
    targetProducts: joi.array().items(joi.string()).optional(),
    targetCategories: joi.array().items(joi.string()).optional(),
  }).required()
);

export const deleteOfferValidation = baseSchema.concat(
  joi.object({
    id: joi.string().required(),
  }).required()
);

export const getOfferValidation = baseSchema.concat(
  joi.object({
    id: joi.string().required(),
  }).required()
);

export const listOffersValidation = baseSchema.concat(
  joi.object({
    page: joi.number().integer().min(1).optional(),
    limit: joi.number().integer().min(1).optional(),
    offerType: joi.string().valid(...OFFER_TYPES).optional(),
    search: joi.string().allow("").optional(),
    isActive: joi.alternatives()
      .try(joi.boolean(), joi.string().valid("true", "false"))
      .optional(),
  }).required()
);

export const toggleOfferValidation = baseSchema.concat(
  joi.object({
    id: joi.string().required(),
  }).required()
);
