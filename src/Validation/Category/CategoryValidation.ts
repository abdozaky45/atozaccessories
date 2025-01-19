import { baseSchema } from "../BaseSchema";
import joi from "joi";
export const createCategoryValidation = baseSchema.concat(
    joi.object({
        categoryName: joi.string().required(),
        imageUrl: joi.string().required(),
    }).required()
);
export const updateCategoryValidation = baseSchema.concat(
    joi.object({
        _id: joi.string().required(),
        categoryName: joi.string().optional(),
        imageUrl: joi.string().optional(),
    }).required()
);
export const deleteCategoryValidation = baseSchema.concat(
    joi.object({
        _id: joi.string().required(),
    }).required()
);