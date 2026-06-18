# Icons Admin API

Documentation for every **admin** icons endpoint.

All routes documented here are mounted under the base path **`/admin/icons`** (see `src/app.ts` and `src/Utils/Routes/index.ts`, `RouterEnum.icon = "admin/icons"`).

> The icon router is mounted **only** under `/admin/icons`; there is no public/user-facing icon router, so every endpoint below is admin-only.

---

## Authentication & Authorization

All icon routes are registered in `src/app.ts` after the global `checkAuthority` middleware and behind `checkRole([ADMIN])`:

```ts
app.use(`/${RouterEnum.icon}`, checkRole([UserTypeEnum.ADMIN]), iconRouter);
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
  "message": "Icon not found",
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

> **Note on validation:** The `Validation` middleware merges `req.body`, `req.params`, and `req.query` into one object and validates it. All icon validation schemas extend `baseSchema`, which **requires a `currentUser` object** — this is injected automatically by `checkAuthority`, so it does not need to be sent by the client.

---

## Data model

`IconModel` (`src/Model/Icons/IconModel.ts`):

| Field | Type | Notes |
|-------|------|-------|
| `key` | string | Required, **unique** |
| `svg` | string | Required |
| `isActive` | boolean | Optional, defaults to `true` |

---

## Endpoints

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1 | GET | `/admin/icons` | Paginated list of icons |
| 2 | GET | `/admin/icons/:_id` | Get a single icon by id |
| 3 | POST | `/admin/icons` | Create a new icon |
| 4 | PUT | `/admin/icons/:_id` | Update an icon |
| 5 | DELETE | `/admin/icons/:_id` | Delete an icon |

---

### 1. List Icons

**`GET /admin/icons`**

**Description:** Returns a paginated list of icons (20 per page), excluding the `__v` field.

**Auth:** ADMIN (Bearer token).

**Request body:** None (only the auto-injected `currentUser`).

**Query parameters** (validated by `listIconsValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `page` | number (integer, min 1) | No | Page number. Defaults to `1` when omitted or invalid |

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {
    "data": [
      {
        "_id": "665f0a2b3c4d5e6f7a8b9c0d",
        "key": "facebook",
        "svg": "<svg>...</svg>",
        "isActive": true
      }
    ],
    "totalItems": 12,
    "totalPages": 1,
    "currentPage": 1
  },
  "message": "Success",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | `page` is not an integer ≥ 1 |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- Page size is fixed at `20`.
- `page` is normalized server-side: a missing, `< 1`, or `NaN` value falls back to `1`.
- `totalPages` = `ceil(totalItems / 20)`.

---

### 2. Get Icon By Id

**`GET /admin/icons/:_id`**

**Description:** Returns a single icon by its id.

**Auth:** ADMIN (Bearer token).

**Path parameters** (validated by `getIconValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `_id` | string | Yes | Icon id |

**Request body:** None.

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {
    "icon": {
      "_id": "665f0a2b3c4d5e6f7a8b9c0d",
      "key": "facebook",
      "svg": "<svg>...</svg>",
      "isActive": true
    }
  },
  "message": "Success",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | `_id` missing |
| 404 | `Icon not found` | No icon matches the given id |
| 401 / 403 | (see common auth errors) | |

---

### 3. Create Icon

**`POST /admin/icons`**

**Description:** Creates a new icon. The `key` must be unique.

**Auth:** ADMIN (Bearer token).

**Request body** (validated by `createIconValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | string | Yes | Unique identifier key for the icon |
| `svg` | string (min length 1) | Yes | The SVG markup |
| `isActive` | boolean | No | Defaults to `true` if omitted |

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {
    "icon": {
      "_id": "665f0a2b3c4d5e6f7a8b9c0d",
      "key": "facebook",
      "svg": "<svg>...</svg>",
      "isActive": true
    }
  },
  "message": "Icon created successfully",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | Missing `key`/`svg`, or `svg` empty |
| 409 | `Icon key already exists` | An icon with the same `key` already exists |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- Existence is checked by `key` before creation; a duplicate `key` returns `409`.
- `isActive` defaults to `true` when not provided.
- Although a resource is created, the handler responds with status **`200`** (not `201`).

---

### 4. Update Icon

**`PUT /admin/icons/:_id`**

**Description:** Updates an existing icon's `key`, `svg`, and/or `isActive`. Only changed fields are applied.

**Auth:** ADMIN (Bearer token).

**Path parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `_id` | string | Yes | Icon id |

**Request body** (validated by `updateIconValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | string | No | New unique key. If changed, must not collide with an existing icon |
| `svg` | string (min length 1) | No | New SVG markup |
| `isActive` | boolean | No | New active state |

**Success response — `200 OK`** (when at least one field changed):

```json
{
  "statusCode": 200,
  "data": {
    "icon": {
      "_id": "665f0a2b3c4d5e6f7a8b9c0d",
      "key": "facebook",
      "svg": "<svg>...</svg>",
      "isActive": false
    }
  },
  "message": "Icon updated successfully",
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
| 400 | `Validation Error!` | `_id` missing, or `svg` empty |
| 404 | `Icon not found` | No icon matches the given id |
| 409 | `Icon key already exists` | The new `key` differs from the current one and already belongs to another icon |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- The icon is fetched first; if not found → `404`.
- A duplicate-`key` check runs only when `key` is provided and differs from the current value.
- Change detection: a field is updated only if it is provided and differs from the stored value. If no field changes, no save occurs and the response message is `No changes to update`.

---

### 5. Delete Icon

**`DELETE /admin/icons/:_id`**

**Description:** Permanently deletes an icon and detaches it from any categories that reference it.

**Auth:** ADMIN (Bearer token).

**Path parameters** (validated by `deleteIconValidation`):

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `_id` | string | Yes | Icon id |

**Request body:** None.

**Success response — `200 OK`:**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Icon deleted successfully",
  "success": true
}
```

**Error responses:**

| Status | Message | Trigger condition |
|--------|---------|-------------------|
| 400 | `Validation Error!` | `_id` missing |
| 404 | `Icon not found` | No icon matches the given id |
| 401 / 403 | (see common auth errors) | |

**Notes / business logic:**
- Deletion is permanent (`findByIdAndDelete`) — there is no soft-delete flag on icons.
- After deletion, every category whose `icon_id` equals the deleted icon's id is updated to set `icon_id: null` (cascading detach).
