import joi from "joi";
import { baseSchema } from "../BaseSchema";
import { ShippingCategoryArray } from "../../Utils/Governorate/shippingCategoryEnum";
export const createShipping = baseSchema.concat(
    joi
        .object({
            category: joi.string().valid(...ShippingCategoryArray).required(),
            Cost: joi.number().required(),
        })
        .required()
);
export const updateShipping = baseSchema.concat(
    joi
        .object({
            id: joi.string().required(),
            category: joi.string().valid(...ShippingCategoryArray).optional(),
            Cost: joi.number().optional(),
        })
        .required()
);
