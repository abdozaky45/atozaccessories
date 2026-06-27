import joi from "joi";
import { baseSchema } from "../baseSchema";

const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const createColorValidation = baseSchema.concat(
  joi.object({
    name: joi.string().required(),
    hex: joi.string().pattern(hexPattern).required().messages({
      "string.pattern.base": "hex must be a valid hex color (e.g. #FF5733 or #F53)",
    }),
  }).required()
);

export const updateColorValidation = baseSchema.concat(
  joi.object({
    _id: joi.string().required(),
    name: joi.string().optional(),
    hex: joi.string().pattern(hexPattern).optional().messages({
      "string.pattern.base": "hex must be a valid hex color (e.g. #FF5733 or #F53)",
    }),
  }).required()
);

export const deleteColorValidation = baseSchema.concat(
  joi.object({
    _id: joi.string().required(),
  }).required()
);

export const getColorValidation = baseSchema.concat(
  joi.object({
    _id: joi.string().required(),
  }).required()
);

export const listColorsValidation = baseSchema.concat(
  joi.object({
    page: joi.number().integer().min(1).optional(),
    search: joi.string().optional(),
  }).required()
);
