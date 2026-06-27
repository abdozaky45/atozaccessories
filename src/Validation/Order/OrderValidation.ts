import joi from 'joi';
import { orderStatusArray } from '../../Utils/OrderStatusType';
import { baseSchema } from '../baseSchema';

// ── User ──────────────────────────────────────────────────────────────────────

// A line identifies its item by variantId (exact variant chosen) OR productId
// (quick add — the backend resolves the product's variant). At least one required.
const orderLineSchema = joi.object({
  variantId: joi.string(),
  productId: joi.string(),
  quantity:  joi.number().integer().min(1).required(),
}).or('variantId', 'productId');

export const createOrderValidation = baseSchema.concat(
  joi.object({
    products: joi.array().items(orderLineSchema).min(1).required(),
    userId: joi.string().required(),
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
    items: joi.array().items(orderLineSchema).min(1).required(),
    userInformationId: joi.string().required(),
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
