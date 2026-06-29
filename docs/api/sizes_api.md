# Sizes API

CRUD endpoints for managing product sizes.

- **Base path:** `/admin/sizes`
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

| Field    | Type   | Required | Notes                                                         |
| -------- | ------ | -------- | ------------------------------------------------------------- |
| `_id`    | string | auto     | MongoDB ObjectId.                                            |
| `number` | string | yes      | Unique size label/number (stored as a string, e.g. `"42"`). |
| `order`  | number | yes      | Integer ≥ `1`. Controls sort order; lists are sorted ascending by `order`. |

---

## Endpoints

### 1. Create Size

`POST /admin/sizes`

**Request body**

| Field    | Type   | Required | Description                                          |
| -------- | ------ | -------- | ---------------------------------------------------- |
| `number` | string | yes      | Unique size label. Returns `409` if it exists.       |
| `order`  | number | yes      | Integer ≥ `1`. Display/sort order.                   |

```json
{
  "number": "42",
  "order": 3
}
```

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {
    "size": {
      "_id": "665f2b3c8d5e4f3b2c1d0e9f",
      "number": "42",
      "order": 3,
      "__v": 0
    }
  },
  "message": "Size created successfully"
}
```

**Errors**

- `409` — size number already exists.
- `400` — validation error (missing `number`/`order`, or `order < 1`).

---

### 2. List Sizes

`GET /admin/sizes`

Results are sorted ascending by `order`.

**Query parameters**

| Param  | Type    | Required | Description                                       |
| ------ | ------- | -------- | ------------------------------------------------- |
| `page` | integer | no       | Page number, min `1` (default `1`). Page size 20. |

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {
    "data": [
      { "_id": "665f2b3c8d5e4f3b2c1d0e9f", "number": "42", "order": 3 }
    ],
    "totalItems": 1,
    "totalPages": 1,
    "currentPage": 1
  }
}
```

---

### 3. Get Size By Id

`GET /admin/sizes/:_id`

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {
    "size": {
      "_id": "665f2b3c8d5e4f3b2c1d0e9f",
      "number": "42",
      "order": 3,
      "__v": 0
    }
  }
}
```

**Errors**

- `404` — size not found.

---

### 4. Update Size

`PUT /admin/sizes/:_id`

All body fields are optional; only provided fields are changed. If nothing actually changes, a "no update" message is returned.

**Request body**

| Field    | Type   | Required | Description                              |
| -------- | ------ | -------- | ---------------------------------------- |
| `number` | string | no       | New unique label. Returns `409` if taken.|
| `order`  | number | no       | New integer order ≥ `1`.                 |

```json
{
  "number": "43",
  "order": 4
}
```

**Response `200` (updated)**

```json
{
  "statusCode": 200,
  "data": { "size": { "_id": "665f2b3c8d5e4f3b2c1d0e9f", "number": "43", "order": 4 } },
  "message": "Size updated successfully"
}
```

**Response `200` (no change)**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "No changes were made to the size"
}
```

**Errors**

- `404` — size not found.
- `409` — new number already exists.
- `400` — `order < 1` or invalid types.

---

### 5. Delete Size

`DELETE /admin/sizes/:_id`

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Size deleted successfully"
}
```

**Errors**

- `404` — size not found.
