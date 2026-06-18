# Products Admin API

Documentation for every **admin** product endpoint.

All routes documented here are mounted under the base path **`/admin/products`** (see `src/app.ts` and `src/Utils/Routes/index.ts`).

> Public/user-facing product routes (`/products`, mounted via `ProductPublicRouter`) are intentionally **not** documented here.

---

## Authentication & Authorization

Every endpoint under `/admin/products` passes through two middlewares (configured in `src/app.ts`):

1. **`checkAuthority`** — requires a valid JWT.
   - Header required: `Authorization: Bearer <token>`
   - The token is verified, then matched against the user's stored `accessToken`.
   - On success, a `currentUser` object (`{ userInfo, token }`) is injected into `req.body`.
2. **`checkRole([ADMIN])`** — requires the authenticated user's role to be `ADMIN`.

Because of `checkRole([UserTypeEnum.ADMIN])`, **all endpoints below require an ADMIN role.**

### Common authentication/authorization errors

These can be returned by **any** endpoint below:

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 401 | `no token provided or in-valid Bearer Key` | No `Authorization` header present |
| 401 | `Invalid token or expired` | Token cannot be verified / is expired |
| 401 | `Invalid token payload` | Decoded token has no `_id` |
| 401 | `user token is invalid` | User not found, or stored `accessToken` does not match the provided token |
| 403 | `Forbidden: You must have the role to access this resource` | Authenticated user's role is not `ADMIN` |

### Response envelope

Successful responses use the `ApiResponse` envelope (`src/Utils/ErrorHandling/index.ts`):

```json
{
  "statusCode": 200,
  "data": { },
  "message": "Success",
  "success": true
}
```

Errors thrown via `ApiError` are formatted by the global error handler as:

```json
{
  "success": false,
  "message": "Product not found",
  "error": [],
  "stack": "..."
}
```

Validation errors (from the `Validation` middleware) are formatted as:

```json
{
  "statusCode": 400,
  "message": "Validation Error!",
  "errors": [ /* joi error details */ ],
  "success": false
}
```

> **Note on validation:** The `Validation` middleware merges `req.body`, `req.params`, and `req.query` into one object and validates it. All admin validation schemas extend `baseSchema`, which **requires a `currentUser` object** — this is injected automatically by `checkAuthority`, so it does not need to be sent by the client.

---

## Endpoints

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1 | GET | `/admin/products/analysis` | Dashboard analytics (products, categories, orders, customers) |
| 2 | GET | `/admin/products` | Paginated list of products (admin filters) |
| 3 | POST | `/admin/products` | Create a product (with optional variants) |
| 4 | GET | `/admin/products/:id` | Get a single product by id (with variants) |
| 5 | PUT | `/admin/products/:id` | Update a product (and upsert variants) |
| 6 | DELETE | `/admin/products/:id/hard` | Hard delete a product (DB + S3 + variants) |
| 7 | DELETE | `/admin/products/:productId/variants/:variantId` | Delete a single variant |
| 8 | DELETE | `/admin/products/:id` | Soft delete a product |

---

### 1. Get Analytics

**`GET /admin/products/analysis`**

**Description:** Returns an aggregated analytics dashboard covering products, categories, orders, and customers. No request validation is applied.

**Auth:** ADMIN (Bearer token).

**Request body:** None.

**Query parameters:** None.

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {
    "analysis": {
      "products": {
        "total": 124,
        "soldOut": 9,
        "topSelling": [
          {
            "_id": "665f0a2b3c4d5e6f7a8b9c0d",
            "productName": "Classic Watch",
            "finalPrice": 250,
            "soldItems": 320,
            "defaultImage": { "mediaUrl": "https://...", "mediaId": "abc123" },
            "discount": 50,
            "discountPercentage": 17
          }
        ],
        "mostWishlisted": [
          {
            "count": 42,
            "product": {
              "_id": "665f0a2b3c4d5e6f7a8b9c0d",
              "productName": "Classic Watch",
              "finalPrice": 250,
              "defaultImage": { "mediaUrl": "https://...", "mediaId": "abc123" }
            }
          }
        ],
        "totalFinalPrice": 30450,
        "totalWholesalePrice": 18200
      },
      "categories": { "total": 12 },
      "orders": {
        "total": 540,
        "todaySales": 1250,
        "todayOrders": 8,
        "totalRevenue": 98230,
        "averageOrderValue": 182.5,
        "byStatus": { "pending": 12, "delivered": 480, "cancelled": 20 },
        "last7Days": [
          { "date": "2026-06-12", "revenue": 1200, "orders": 6 },
          { "date": "2026-06-13", "revenue": 980, "orders": 5 }
        ]
      },
      "customers": { "total": 1320 }
    }
  },
  "message": "Success",
  "success": true
}
```

**Error responses:** Only the common auth/authorization errors above.

**Notes / business logic:**
- `topSelling`: top 5 non-deleted products sorted by `soldItems` descending; `discountPercentage` is rounded.
- `mostWishlisted`: top 5 products by wishlist count.
- `soldOut`: count of non-deleted products with `isSoldOut: true`.
- `todaySales` / `totalRevenue` / `last7Days` revenue exclude **cancelled** orders. `averageOrderValue` is computed across **delivered** orders only.
- Timezone used for date grouping is `Africa/Cairo`.

---

### 2. Get Admin Products List

**`GET /admin/products`**

**Description:** Returns a paginated list of products with their variants attached, populated with category info. Unlike the public list, this can include soft-deleted products and does not exclude soft-deleted categories.

**Auth:** ADMIN (Bearer token).

**Request body:** None (only the auto-injected `currentUser`).

**Query parameters** (validated by `adminGetProductsValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `category` | string | No | Category id to filter by |
| `isBestSeller` | boolean | No | Filter by best-seller flag |
| `minPrice` | number | No | Minimum `finalPrice` (inclusive) |
| `maxPrice` | number | No | Maximum `finalPrice` (inclusive) |
| `color` | string | No | Color id — matches products having a variant with this color |
| `size` | string | No | Size id — matches products having a variant with this size |
| `isDeleted` | boolean | No | If provided, filters by `isDeleted` value. Defaults to `false` when omitted |
| `sort` | string | No | One of `price`, `createdAt`, `soldItems` |
| `page` | number | No | Page number (default `1`) |
| `limit` | number | No | Page size (default `20`) |

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {
    "products": [
      {
        "_id": "665f0a2b3c4d5e6f7a8b9c0d",
        "productName": "Classic Watch",
        "productDescription": "A timeless piece.",
        "price": 300,
        "availableItems": 20,
        "salePrice": 250,
        "discount": 50,
        "discountPercentage": 16.67,
        "soldItems": 320,
        "isSoldOut": false,
        "isSale": true,
        "isBestSeller": true,
        "bestSellerManual": true,
        "wholesalePrice": 180,
        "finalPrice": 250,
        "category": {
          "_id": "665e...",
          "categoryName": "Watches",
          "image": { "mediaUrl": "https://...", "mediaId": "..." },
          "slug": "watches"
        },
        "slug": "Classic-Watch",
        "defaultImage": { "mediaUrl": "https://...", "mediaId": "abc123" },
        "albumImages": [{ "mediaUrl": "https://...", "mediaId": "def456" }],
        "createdAt": 1718000000000,
        "isDeleted": false,
        "variants": [
          {
            "_id": "665f...",
            "product": "665f0a2b3c4d5e6f7a8b9c0d",
            "color": { "_id": "...", "name": "Black", "hex": "#000000" },
            "size": { "_id": "...", "number": 42, "order": 3 },
            "availableItems": 5
          }
        ]
      }
    ],
    "pagination": { "total": 124, "page": 1, "limit": 20, "totalPages": 7 }
  },
  "message": "",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | Invalid query parameter (e.g. `sort` not in allowed set, non-numeric `page`) |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- Sorting: `price` → `finalPrice` ascending; `soldItems` → descending; otherwise (`createdAt` or unset) → `createdAt` descending.
- `color`/`size` filters resolve to product ids via the `ProductVariant` collection.
- Each product gets its variants attached (with color & size populated).

---

### 3. Create Product

**`POST /admin/products`**

**Description:** Creates a new product. Computes discount/sale fields, derives the slug from the product name, processes images, and optionally creates variants.

**Auth:** ADMIN (Bearer token).

**Request body** (validated by `createProductValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `productName` | string | Yes | Product name; also used to generate the `slug` |
| `productDescription` | string | Yes | Product description |
| `price` | number | Yes | Base price |
| `availableItems` | number | Yes | Stock quantity |
| `categoryId` | string | Yes | Category id; must reference an existing category |
| `defaultImage` | string | Yes | Default image URL (mediaId is derived from it) |
| `salePrice` | number | No | Sale price; drives discount calculation |
| `albumImages` | string[] | No | Array of image URLs |
| `wholesalePrice` | number | No | Must be less than the final selling price |
| `isBestSeller` | boolean | No | Defaults to `false` |
| `variants` | object[] | No | Array of variants (see schema below) |

**Variant object** (`variantSchema`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `_id` | string | No | Ignored on create |
| `color` | string | Yes | Color id |
| `size` | string | Yes | Size id |
| `availableItems` | number | Yes | Stock for this variant |

**Success response — `201 Created`:**

```json
{
  "statusCode": 201,
  "data": {
    "product": {
      "_id": "665f0a2b3c4d5e6f7a8b9c0d",
      "productName": "Classic Watch",
      "slug": "Classic-Watch",
      "productDescription": "A timeless piece.",
      "price": 300,
      "availableItems": 20,
      "salePrice": 250,
      "discount": 50,
      "discountPercentage": 16.67,
      "isSale": true,
      "wholesalePrice": 180,
      "isBestSeller": false,
      "finalPrice": 250,
      "category": "665e...",
      "defaultImage": { "mediaUrl": "https://...", "mediaId": "abc123" },
      "albumImages": [{ "mediaUrl": "https://...", "mediaId": "def456" }],
      "createdBy": "665d...",
      "createdAt": 1718000000000
    }
  },
  "message": "Product created successfully",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | Missing/invalid required field |
| 400 | `Category not found` | `categoryId` does not match an existing category |
| 400 | `wholesalePrice must be less than the final selling price` | `wholesalePrice >= finalPrice` |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- `slug` is generated from `productName` via `slugify`.
- `finalPrice` = `salePrice` if provided, otherwise `price`.
- `discount`, `discountPercentage`, `isSale` are computed: if `salePrice` is missing/0 → no sale; if `salePrice < price` → discount applied.
- `mediaId` for `defaultImage` and each album image is extracted from the URL.
- `createdBy` is set from the authenticated user (`currentUser.userInfo._id`).
- If `variants` are supplied, they are inserted into the `ProductVariant` collection (unique index on `product + color + size`).

---

### 4. Get Admin Product By Id

**`GET /admin/products/:id`**

**Description:** Returns a single product by id (regardless of `isDeleted`), with category populated and variants attached. No validation middleware is applied.

**Auth:** ADMIN (Bearer token).

**Path parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Product id |

**Request body:** None.

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {
    "product": {
      "_id": "665f0a2b3c4d5e6f7a8b9c0d",
      "productName": "Classic Watch",
      "productDescription": "A timeless piece.",
      "price": 300,
      "availableItems": 20,
      "salePrice": 250,
      "finalPrice": 250,
      "wholesalePrice": 180,
      "category": {
        "_id": "665e...",
        "categoryName": "Watches",
        "image": { "mediaUrl": "https://...", "mediaId": "..." },
        "slug": "watches"
      },
      "slug": "Classic-Watch",
      "defaultImage": { "mediaUrl": "https://...", "mediaId": "abc123" },
      "albumImages": [],
      "createdAt": 1718000000000,
      "isDeleted": false,
      "variants": [
        {
          "_id": "665f...",
          "product": "665f0a2b3c4d5e6f7a8b9c0d",
          "color": { "_id": "...", "name": "Black", "hex": "#000000" },
          "size": { "_id": "...", "number": 42, "order": 3 },
          "availableItems": 5
        }
      ]
    }
  },
  "message": "",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Product not found` | No product matches the given id |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- Uses `findById` (does **not** filter by `isDeleted`), so soft-deleted products can be retrieved.
- `wholesalePrice` is included (it is excluded only on public endpoints).

---

### 5. Update Product

**`PUT /admin/products/:id`**

**Description:** Updates an existing (non-deleted) product. Recomputes pricing fields, regenerates the slug if the name changes, manages images, and upserts variants.

**Auth:** ADMIN (Bearer token).

**Path parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Product id |

**Request body** (validated by `updateProductValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `productName` | string | No | New name; regenerates `slug` if changed |
| `productDescription` | string | No | New description |
| `price` | number | No | New base price |
| `availableItems` | number | No | New stock; updates `isSoldOut` |
| `categoryId` | string | No | New category id; must exist |
| `defaultImage` | string | No | New default image URL |
| `salePrice` | number | No | New sale price |
| `albumImages` | string[] | No | Replaces the album images |
| `wholesalePrice` | number | No | Must be less than the final selling price |
| `isBestSeller` | boolean | No | If `true`, also sets `bestSellerManual: true` |
| `variants` | object[] | No | Variants to upsert (see variant schema) |

> Note: although the listed fields are optional, the handler always reads `categoryId` and calls `findCategoryById`, so a missing/invalid `categoryId` results in `Category not found`.

**Variant object** (`variantSchema`): same as Create. When `_id` is present the variant is updated; otherwise a new variant is created for the product.

**Success response — `200 OK`** (when changes were applied or variants supplied):

```json
{
  "statusCode": 200,
  "data": {
    "product": {
      "_id": "665f0a2b3c4d5e6f7a8b9c0d",
      "productName": "Classic Watch",
      "finalPrice": 250,
      "discount": 50,
      "discountPercentage": 16.67,
      "isSale": true
    }
  },
  "message": "Product updated successfully",
  "success": true
}
```

**Success response — `200 OK`** (when nothing changed):

```json
{
  "statusCode": 200,
  "data": {},
  "message": "No changes to update",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | Invalid field type |
| 400 | `Product not found` | No non-deleted product matches the id |
| 400 | `Category not found` | `categoryId` does not match an existing category |
| 400 | `wholesalePrice must be less than the final selling price` | Effective `wholesalePrice >= finalPrice` |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- The target product is fetched with `isDeleted: false`, so soft-deleted products cannot be updated.
- Pricing is recomputed using effective values (new value if provided, otherwise existing): `finalPrice` = effective `salePrice` or effective `price`; discount fields recomputed when `price` or `salePrice` is provided.
- `availableItems` updates set `isSoldOut = availableItems <= 0`.
- Providing `albumImages` **replaces** the entire album (only URLs with a derivable mediaId are kept).
- Marking `isBestSeller: true` locks `bestSellerManual: true`.
- Variants are upserted: existing (`_id`) updated, new ones created.

---

### 6. Hard Delete Product

**`DELETE /admin/products/:id/hard`**

**Description:** Permanently deletes a product: removes its images from S3, deletes all its variants, then removes the product document.

**Auth:** ADMIN (Bearer token).

**Path parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Product id (validated as `id` by `hardDeleteValidation`) |

**Request body:** None.

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Product permanently deleted",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | `id` missing/invalid |
| 400 | `Product not found` | No product matches the id |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- Deletes `defaultImage` and all `albumImages` from S3 **first**; if S3 deletion fails the DB is not touched.
- Deletes all related `ProductVariant` documents, then deletes the product via `findByIdAndDelete`.
- This is irreversible (unlike the soft delete at endpoint 8).

---

### 7. Delete Variant

**`DELETE /admin/products/:productId/variants/:variantId`**

**Description:** Deletes a single product variant by its id.

**Auth:** ADMIN (Bearer token).

**Path parameters** (validated by `deleteVariantValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | string | Yes | Owning product id |
| `variantId` | string | Yes | Variant id to delete |

**Request body:** None.

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Variant deleted successfully",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | `productId` or `variantId` missing |
| 400 | `Variant not found` | No variant matches `variantId` |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- Deletion is keyed solely on `variantId` (`findByIdAndDelete`); `productId` is required by validation but not used as a filter in the query.

---

### 8. Soft Delete Product

**`DELETE /admin/products/:id`**

**Description:** Soft deletes a product by setting `isDeleted: true`. The document and its variants remain in the database.

**Auth:** ADMIN (Bearer token).

**Path parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Product id (validated by `deleteProductValidation`) |

**Request body:** None.

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Product deleted successfully",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | `id` missing/invalid |
| 400 | `Product not found` | No non-deleted product matches the id |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- Looks up the product with `isDeleted: false` first; an already soft-deleted product returns `Product not found`.
- Sets `isDeleted: true` (does not remove the document or its variants and does not touch S3).

---

## Route ordering note

In `ProductRouter`, named routes are declared **before** `/:id` to avoid the `:id` param capturing them:
- `/analysis` is matched before `/:id`.
- `/:id/hard` and `/:productId/variants/:variantId` are matched before the bare `/:id` delete.
