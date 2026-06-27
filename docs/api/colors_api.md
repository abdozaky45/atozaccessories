# Colors API

CRUD endpoints for managing product colors.

- **Base path:** `/admin/colors`
- **Auth:** `Authorization: Bearer {{token}}` — **Admin role required** on every endpoint.
- **Content-Type:** `application/json`

All responses are wrapped in the standard envelope:

```json
{
  "statusCode": 200,
  "data": { },
  "message": "..."
}
```

---

## Data Model

| Field  | Type   | Required | Notes                                                              |
| ------ | ------ | -------- | ------------------------------------------------------------------ |
| `_id`  | string | auto     | MongoDB ObjectId.                                                  |
| `name` | string | yes      | Unique color name.                                                |
| `hex`  | string | yes      | Hex color code. Must match `#RRGGBB` or `#RGB` (e.g. `#FF5733`, `#F53`). |

---

## Endpoints

### 1. Create Color

`POST /admin/colors`

**Request body**

| Field  | Type   | Required | Description                                        |
| ------ | ------ | -------- | -------------------------------------------------- |
| `name` | string | yes      | Unique color name. Returns `409` if it exists.     |
| `hex`  | string | yes      | Valid hex color (`#RRGGBB` or `#RGB`).             |

```json
{
  "name": "Midnight Black",
  "hex": "#000000"
}
```

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {
    "color": {
      "_id": "665f1a2b9c4d3e2a1b0c9d8e",
      "name": "Midnight Black",
      "hex": "#000000",
      "__v": 0
    }
  },
  "message": "Color created successfully"
}
```

**Errors**

- `409` — color name already exists.
- `400` — validation error (missing `name`/`hex`, or invalid hex pattern).

---

### 2. List Colors

`GET /admin/colors`

**Query parameters**

| Param    | Type    | Required | Description                                        |
| -------- | ------- | -------- | -------------------------------------------------- |
| `page`   | integer | no       | Page number, min `1` (default `1`). Page size 20.  |
| `search` | string  | no       | Case-insensitive filter on color `name`.           |

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {
    "data": [
      { "_id": "665f1a2b9c4d3e2a1b0c9d8e", "name": "Midnight Black", "hex": "#000000" }
    ],
    "totalItems": 1,
    "totalPages": 1,
    "currentPage": 1
  }
}
```

---

### 3. Get Color By Id

`GET /admin/colors/:_id`

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {
    "color": {
      "_id": "665f1a2b9c4d3e2a1b0c9d8e",
      "name": "Midnight Black",
      "hex": "#000000",
      "__v": 0
    }
  }
}
```

**Errors**

- `404` — color not found.

---

### 4. Update Color

`PUT /admin/colors/:_id`

All body fields are optional; only provided fields are changed. If nothing actually changes, a "no update" message is returned.

**Request body**

| Field  | Type   | Required | Description                                   |
| ------ | ------ | -------- | --------------------------------------------- |
| `name` | string | no       | New unique name. Returns `409` if taken.      |
| `hex`  | string | no       | New valid hex color.                          |

```json
{
  "name": "Jet Black",
  "hex": "#0A0A0A"
}
```

**Response `200` (updated)**

```json
{
  "statusCode": 200,
  "data": { "color": { "_id": "665f1a2b9c4d3e2a1b0c9d8e", "name": "Jet Black", "hex": "#0A0A0A" } },
  "message": "Color updated successfully"
}
```

**Response `200` (no change)**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "No changes were made to the color"
}
```

**Errors**

- `404` — color not found.
- `409` — new name already exists.
- `400` — invalid hex pattern.

---

### 5. Delete Color

`DELETE /admin/colors/:_id`

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Color deleted successfully"
}
```

**Errors**

- `404` — color not found.
