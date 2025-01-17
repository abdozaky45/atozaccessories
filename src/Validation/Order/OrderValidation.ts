import joi from 'joi';
import { baseSchema } from '../BaseSchema';
import { orderStatusArray } from '../../Utils/OrderStatusType';
export const createOrderValidation = baseSchema.concat(
    joi.object({
        products: joi.array().items(
            joi.object({
                productId: joi.string().required(),
                quantity: joi.number().required(),
            })
        ).required(),
        shippingId: joi.string().required(),
        userId: joi.string().required(),
    }).required()
);
export const updateOrderStatusValidation = baseSchema.concat(
    joi.object({
        orderId: joi.string().required(),
        status: joi.string().valid(...orderStatusArray).required(),
    }).required()
);
export const getAllOrdersValidation = baseSchema.concat(
    joi.object({
        page: joi.number().required(),
        status: joi.string().optional(),
    }).required()
);