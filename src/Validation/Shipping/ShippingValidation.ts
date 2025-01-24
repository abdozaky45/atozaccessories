import joi from "joi";
import { ShippingCategoryArray } from "../../Utils/Governorate/shippingCategoryEnum";
import { baseSchema } from "../baseSchema";
export const createShipping = baseSchema.concat(
    joi
        .object({
            category: joi.string().valid(...ShippingCategoryArray).required(),
            cost: joi.number().required(),
        })
        .required()
);
export const updateShipping = baseSchema.concat(
    joi
        .object({
            id: joi.string().required(),
            category: joi.string().valid(...ShippingCategoryArray).optional(),
            cost: joi.number().optional(),
        })
        .required()
);
export const validateShippingById = baseSchema.concat(
    joi.object({
        id: joi.string().required(),
    })
);
