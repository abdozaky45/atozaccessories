import joi from "joi";
import { baseSchema } from "../baseSchema";

export const createSizeValidation = baseSchema.concat(
  joi.object({
    number: joi.string().required(),
    order: joi.number().integer().min(1).required(),
  }).required()
);

export const updateSizeValidation = baseSchema.concat(
  joi.object({
    _id: joi.string().required(),
    number: joi.string().optional(),
    order: joi.number().integer().min(1).optional(),
  }).required()
);

export const deleteSizeValidation = baseSchema.concat(
  joi.object({
    _id: joi.string().required(),
  }).required()
);

export const getSizeValidation = baseSchema.concat(
  joi.object({
    _id: joi.string().required(),
  }).required()
);

export const listSizesValidation = baseSchema.concat(
  joi.object({
    page: joi.number().integer().min(1).optional(),
  }).required()
);
