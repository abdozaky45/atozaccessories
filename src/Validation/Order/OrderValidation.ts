import joi from 'joi';
import { orderStatusArray } from '../../Utils/OrderStatusType';
import { baseSchema } from '../baseSchema';

// ── User ──────────────────────────────────────────────────────────────────────

export const createOrderValidation = baseSchema.concat(
  joi.object({
    products: joi.array().items(
      joi.object({
        variantId: joi.string().required(),
        quantity:  joi.number().integer().min(1).required(),
      })
    ).min(1).required(),
    userId: joi.string().required(),
    // Optional: the variant the customer chose as their free item (spend_x_get_free_item)
    freeGiftVariantId: joi.string().optional(),
  }).required()
);

export const userOrderIdValidation = baseSchema.concat(
  joi.object({
    orderId: joi.string().required(),
  }).required()
);

export const getUserOrdersValidation = baseSchema.concat(
  joi.object({
    customerId: joi.string().required(),
  }).required()
);

export const previewOrderValidation = baseSchema.concat(
  joi.object({
    items: joi.array().items(
      joi.object({
        variantId: joi.string().required(),
        quantity:  joi.number().integer().min(1).required(),
      })
    ).min(1).required(),
    userInformationId: joi.string().required(),
    // Optional: the variant the customer chose as their free item (spend_x_get_free_item)
    freeGiftVariantId: joi.string().optional(),
  }).required()
);

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getAllOrdersValidation = baseSchema.concat(
  joi.object({
    page:    joi.number().required(),
    status:  joi.string().valid(...orderStatusArray).optional(),
    orderId: joi.string().optional(),
  }).required()
);

export const AdminOrderIdValidation = baseSchema.concat(
  joi.object({
    orderId: joi.string().required(),
  }).required()
);

export const updateOrderStatusValidation = baseSchema.concat(
  joi.object({
    orderId: joi.string().required(),
    status:  joi.string().valid(...orderStatusArray).required(),
  }).required()
);
