import { baseSchema } from "../baseSchema";
import joi from "joi";

// color/size are optional: a simple product is one variant with neither.
// availableItems is the single source of truth for stock and is always required.
const variantSchema = joi.object({
  _id: joi.string().optional(),
  color: joi.string().allow(null, "").optional(),
  size: joi.string().allow(null, "").optional(),
  availableItems: joi.number().min(0).required(),
});

export const createProductValidation = baseSchema.concat(
  joi.object({
    productName: joi.string().required(),
    productDescription: joi.string().required(),
    price: joi.number().required(),
    // Product-level stock is derived from the variants (sum), not supplied directly.
    availableItems: joi.number().optional(),
    categoryId: joi.string().required(),
    defaultImage: joi.string().required(),
    salePrice: joi.number().optional(),
    albumImages: joi.array().items(joi.string()).optional(),
    wholesalePrice: joi.number().optional(),
    isBestSeller: joi.boolean().optional(),
    // Every product has at least one variant (simple products included).
    variants: joi.array().items(variantSchema).min(1).required(),
  }).required()
);

export const updateProductValidation = baseSchema.concat(
  joi.object({
    id: joi.string().required(),
    productName: joi.string().optional(),
    productDescription: joi.string().optional(),
    price: joi.number().optional(),
    availableItems: joi.number().optional(),
    categoryId: joi.string().optional(),
    defaultImage: joi.string().optional(),
    salePrice: joi.number().optional(),
    albumImages: joi.array().items(joi.string()).optional(),
    wholesalePrice: joi.number().optional(),
    isBestSeller: joi.boolean().optional(),
    variants: joi.array().items(variantSchema).optional(),
  }).required()
);

export const deleteProductValidation = baseSchema.concat(
  joi.object({
    id: joi.string().required(),
  }).required()
);

export const hardDeleteValidation = baseSchema.concat(
  joi.object({
    id: joi.string().required(),
  }).required()
);

export const deleteVariantValidation = baseSchema.concat(
  joi.object({
    productId: joi.string().required(),
    variantId: joi.string().required(),
  }).required()
);

export const adminGetProductsValidation = baseSchema.concat(
  joi.object({
    category: joi.string().optional(),
    isBestSeller: joi.boolean().optional(),
    minPrice: joi.number().optional(),
    maxPrice: joi.number().optional(),
    color: joi.string().optional(),
    size: joi.string().optional(),
    isDeleted: joi.boolean().optional(),
    search: joi.string().trim().optional(),
    sort: joi.string().valid("price", "createdAt", "soldItems").optional(),
    page: joi.number().optional(),
    limit: joi.number().optional(),
  }).required()
);

export const getUserProductsValidation = joi.object({
  category: joi.string().optional(),
  isBestSeller: joi.boolean().optional(),
  minPrice: joi.number().optional(),
  maxPrice: joi.number().optional(),
  color: joi.string().optional(),
  size: joi.string().optional(),
  sort: joi.string().valid("price", "createdAt", "soldItems").optional(),
  page: joi.number().optional(),
  limit: joi.number().optional(),
});

export const getProductBySoldOutValidation = baseSchema.concat(
  joi.object({
    page: joi.string().required(),
  }).required()
);
