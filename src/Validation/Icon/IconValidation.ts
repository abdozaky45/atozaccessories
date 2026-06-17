import joi from "joi";
import { baseSchema } from "../baseSchema";

export const createIconValidation = baseSchema.concat(
  joi.object({
    key: joi.string().required(),
    svg: joi.string().min(1).required(),
    isActive: joi.boolean().optional(),
  }).required()
);

export const updateIconValidation = baseSchema.concat(
  joi.object({
    _id: joi.string().required(),
    key: joi.string().optional(),
    svg: joi.string().min(1).optional(),
    isActive: joi.boolean().optional(),
  }).required()
);

export const deleteIconValidation = baseSchema.concat(
  joi.object({
    _id: joi.string().required(),
  }).required()
);

export const getIconValidation = baseSchema.concat(
  joi.object({
    _id: joi.string().required(),
  }).required()
);

export const listIconsValidation = baseSchema.concat(
  joi.object({
    page: joi.number().integer().min(1).optional(),
  }).required()
);
