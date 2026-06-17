import joi from "joi";
import { baseSchema } from "../baseSchema";

export const createCategoryValidation = baseSchema.concat(
  joi.object({
    categoryName: joi.string().required(),
    imageUrl: joi.string().required(),
    icon_id: joi.string().optional(),
  }).required()
);

export const updateCategoryValidation = baseSchema.concat(
  joi.object({
    id: joi.string().required(),
    categoryName: joi.string().optional(),
    imageUrl: joi.string().optional(),
    icon_id: joi.string().optional(),
  }).required()
);

export const deleteCategoryValidation = baseSchema.concat(
  joi.object({
    id: joi.string().required(),
  }).required()
);

export const hardDeleteCategoryValidation = baseSchema.concat(
  joi.object({
    id: joi.string().required(),
  }).required()
);
