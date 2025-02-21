import { baseSchema } from "../baseSchema";
import joi from "joi";
export const createProductValidation = baseSchema.concat(
    joi.object({
        productName: joi.string().required(),
        productDescription: joi.string().required(),
        price: joi.number().required(),
        availableItems: joi.number().required(),
        categoryId: joi.string().required(),
        defaultImage: joi.string().required(),
        salePrice: joi.number().optional(),
        expiredSale: joi.number().optional(),
        albumImages: joi.array().items(joi.string()).optional(),
    }).required()
);
export const updateProductValidation = baseSchema.concat(
    joi.object({
        productId: joi.string().required(),
        productName: joi.string().optional(),
        productDescription: joi.string().optional(),
        price: joi.number().optional(),
        availableItems: joi.number().optional(),
        categoryId: joi.string().optional(),
        defaultImage: joi.string().optional(),
        salePrice: joi.number().optional(),
        expiredSale: joi.number().optional(),
        albumImages: joi.array().items(joi.string()).optional(),
    }).required()
);
export const deleteProductValidation = baseSchema.concat(
    joi.object({
        productId: joi.string().required(),
    }).required()
);
export const getProductBySoldOutValidation = baseSchema.concat(
    joi.object({
        page: joi.string().required(),
    }).required()
);
