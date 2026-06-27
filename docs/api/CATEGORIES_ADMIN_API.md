# Categories Admin API

Documentation for every **admin** category endpoint.

All routes documented here are mounted under the base path **`/admin/categories`** (see `src/app.ts` and `src/Utils/Routes/index.ts`, `RouterEnum.category = "admin/categories"`).

> Public/user-facing category routes (mounted via `CategoryPublicRouter`) — including the list (`getCategories`) and get-by-id (`getCategoryById`) handlers — are intentionally **not** documented here. The admin `categoryRouter` exposes only the create / update / delete endpoints below.

---

## Authentication & Authorization

The admin category router is registered in `src/app.ts` after the global `checkAuthority` middleware and behind `checkRole([ADMIN])`:

```ts
app.use(`/${RouterEnum.category}`, checkRole([UserTypeEnum.ADMIN]), categoryRouter);
```

1. **`checkAuthority`** — requires a valid JWT.
   - Header required: `Authorization: Bearer <token>`
   - The token is verified, then matched against the user's stored `accessToken`.
   - On success, a `currentUser` object (`{ userInfo, token }`) is injected into `req.body`.
2. **`checkRole([ADMIN])`** — requires the authenticated user's role to be `ADMIN`.

**All endpoints below require an ADMIN role.**

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

When `ApiResponse` is constructed without a message, `message` defaults to `"Success"`.

Errors thrown via `ApiError` are formatted by the global error handler as:

```json
{
  "success": false,
  "message": "Category not found",
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

> **Note on validation:** The `Validation` middleware merges `req.body`, `req.params`, and `req.query` into one object and validates it. All category validation schemas extend `baseSchema`, which **requires a `currentUser` object** — this is injected automatically by `checkAuthority`, so it does not need to be sent by the client.

---

## Data model

`CategoryModel` (`src/Model/Categories/CategoryModel.ts`):

| Field | Type | Notes |
|-------|------|-------|
| `categoryName` | string | Required |
| `slug` | string | Required; auto-generated from `categoryName` via `slugify` |
| `image` | object | `{ mediaUrl, mediaId }` |
| `createdBy` | ObjectId (User) | Required; set from the authenticated admin |
| `createdAt` | number | Required; epoch millis |
| `isDeleted` | boolean | Optional; soft-delete flag |
| `icon_id` | ObjectId (Icon) | Optional; defaults to `null`; references an `Icon` |

---

## Endpoints

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1 | POST | `/admin/categories` | Create a new category |
| 2 | PATCH | `/admin/categories/:id` | Update a category |
| 3 | DELETE | `/admin/categories/:id/hard` | Hard delete a category (cascades to products/variants/S3) |
| 4 | DELETE | `/admin/categories/:id` | Soft delete a category |

---

### 1. Create Category

**`POST /admin/categories`**

**Description:** Creates a new category. Derives the slug from the name, extracts the media id from the image URL, optionally links an icon, and records the creating admin.

**Auth:** ADMIN (Bearer token).

**Request body** (validated by `createCategoryValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `categoryName` | string | Yes | Category name; also used to generate the `slug` |
| `imageUrl` | string | Yes | Image URL; the `mediaId` is derived from it |
| `icon_id` | string | No | Icon id to associate; must reference an existing icon |

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {
    "category": {
      "_id": "665e0a2b3c4d5e6f7a8b9c0d",
      "categoryName": "Watches",
      "image": {
        "mediaUrl": "https://bucket.s3.amazonaws.com/watches.jpg",
        "mediaId": "watches.jpg"
      },
      "slug": "Watches",
      "createdBy": "665d0a2b3c4d5e6f7a8b9c00",
      "createdAt": 1718000000000,
      "icon_id": "665f0a2b3c4d5e6f7a8b9c11"
    }
  },
  "message": "Category created successfully",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | Missing `categoryName` or `imageUrl` |
| 404 | `Icon not found` | `icon_id` is provided but does not match an existing icon |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- `slug` is generated from `categoryName` via `slugify`.
- `mediaId` is extracted from `imageUrl` by splitting on `amazonaws.com/`; if the URL does not contain `amazonaws.com/`, the stored `mediaId` becomes the literal string `"Invalid image url"`.
- `icon_id` is validated only when provided; stored as `null` when omitted.
- `createdBy` is set from the authenticated user (`currentUser.userInfo._id`).
- Responds with status **`200`** (not `201`) even though a resource is created.

---

### 2. Update Category

**`PATCH /admin/categories/:id`**

**Description:** Updates a category's name, image, and/or linked icon. Only changed fields are applied; the slug is regenerated when the name changes.

**Auth:** ADMIN (Bearer token).

**Path parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Category id |

**Request body** (validated by `updateCategoryValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `categoryName` | string | No | New name; regenerates `slug` if changed |
| `imageUrl` | string | No | New image URL; updates `mediaUrl`/`mediaId` if changed |
| `icon_id` | string | No | New icon id; must reference an existing icon when provided |

**Success response — `200 OK`** (when at least one field changed):

```json
{
  "statusCode": 200,
  "data": {
    "category": {
      "_id": "665e0a2b3c4d5e6f7a8b9c0d",
      "categoryName": "Luxury Watches",
      "image": {
        "mediaUrl": "https://bucket.s3.amazonaws.com/luxury-watches.jpg",
        "mediaId": "luxury-watches.jpg"
      },
      "slug": "Luxury-Watches",
      "createdBy": "665d0a2b3c4d5e6f7a8b9c00",
      "createdAt": 1718000000000,
      "icon_id": { "_id": "665f0a2b3c4d5e6f7a8b9c11", "key": "watch", "svg": "<svg>...</svg>" }
    }
  },
  "message": "Category updated",
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
| 400 | `Validation Error!` | `id` missing/invalid |
| 404 | `Category not found` | No category matches the given id |
| 404 | `Icon not found` | `icon_id` is provided but does not match an existing icon |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- The category is fetched first (with `icon_id` populated as `_id key svg`); if not found → `404`.
- Change detection per field:
  - `categoryName`: applied only if provided and different; regenerates `slug`.
  - `imageUrl`: applied only if provided and different, **and** the derived `mediaId` differs from the stored one.
  - `icon_id`: applied if provided and differs from the current value (compared as strings).
- If no field changes, no save occurs and the response message is `No changes to update`.
- Note: this endpoint does not filter by `isDeleted`, so a soft-deleted category can still be fetched/updated by id.

---

### 3. Hard Delete Category

**`DELETE /admin/categories/:id/hard`**

**Description:** Permanently deletes a category along with all its products, those products' variants, and the products' S3 images. Returns a summary of what was removed.

**Auth:** ADMIN (Bearer token).

**Path parameters** (validated by `hardDeleteCategoryValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Category id |

**Request body:** None.

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {
    "deletedProducts": 14,
    "deletedVariants": 32,
    "deletedImages": 21
  },
  "message": "Category deleted successfully",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | `id` missing/invalid |
| 404 | `Category not found` | No category matches the given id |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic (cascade order):**
1. Finds all **active** products (`isDeleted: false`) in the category for S3 cleanup, and collects **all** product ids (including soft-deleted) for DB cleanup.
2. Deletes each active product's `defaultImage` and `albumImages` from S3. If any S3 deletion throws, execution stops **before** any DB changes (counted in `deletedImages`).
3. Deletes all `ProductVariant` documents linked to those product ids (`deletedVariants`).
4. Deletes all `Product` documents in the category (`deletedProducts`).
5. Deletes the `Category` document itself.
- This is irreversible (unlike the soft delete at endpoint 4).

---

### 4. Soft Delete Category

**`DELETE /admin/categories/:id`**

**Description:** Soft deletes a category by setting `isDeleted: true`. The document and its products remain in the database.

**Auth:** ADMIN (Bearer token).

**Path parameters** (validated by `deleteCategoryValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Category id |

**Request body:** None.

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Category deleted successfully",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | `id` missing/invalid |
| 404 | `Category not found` | No category matches the given id (initial lookup) |
| 404 | `Category not found or already deleted` | The soft-delete update returns no document |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- Looks up the category by id first; if not found → `404 Category not found`.
- Sets `isDeleted: true` via `findByIdAndUpdate` (does not remove the document, its products, or S3 images).
- If the update returns nothing → `404 Category not found or already deleted`.

---

## Route ordering note

In `CategoryRouter`, the hard-delete route (`/:id/hard`) is declared **before** the soft-delete route (`/:id`) so that `:id` does not capture the literal `"hard"` segment.
