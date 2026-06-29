# Offers API

CRUD (+ toggle) endpoints for managing promotional offers. Supports **7 offer types**.

- **Base path:** `/admin/offers`
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

| Field              | Type     | Required        | Notes                                                                                  |
| ------------------ | -------- | --------------- | -------------------------------------------------------------------------------------- |
| `_id`              | string   | auto            | MongoDB ObjectId.                                                                       |
| `title`            | string   | yes             | Offer title.                                                                           |
| `description`      | string   | no              | Free text; empty string allowed.                                                       |
| `isActive`         | boolean  | no              | Defaults to `true`.                                                                    |
| `status`           | string   | auto            | One of `scheduled` \| `active` \| `expired`. Managed by the server (default `scheduled`). |
| `image`            | object   | yes (on create) | `{ "mediaUrl": string }` in the request. Server derives `mediaKey` (see below).         |
| `offerType`        | string   | yes             | One of the 7 types listed below.                                                        |
| `timing`           | object   | conditional     | `{ startDate, endDate }` ISO dates (nullable). Required for `flash_sale`.               |
| `condition`        | object   | conditional     | `{ minQuantity, minAmount, excludedCategories[] }`. Requirements vary by type.          |
| `reward`           | object   | conditional     | `{ discountPercentage (0–100), freeItemMaxValue }`. Requirements vary by type.          |
| `targetProducts`   | string[] | conditional     | Array of Product ObjectIds. Required (non-empty) for `flash_sale`.                      |
| `targetCategories` | string[] | no              | Array of Category ObjectIds.                                                            |
| `createdAt`        | date     | auto            | Timestamp.                                                                              |
| `updatedAt`        | date     | auto            | Timestamp.                                                                              |

### About `image`

The request body sends only `image.mediaUrl`. The server derives `image.mediaKey` by stripping the S3 base URL (`https://atozaccessories.s3.amazonaws.com/`) from the URL. The stored object is:

```json
"image": {
  "mediaUrl": "https://atozaccessories.s3.amazonaws.com/offers/flash-sale-40.png",
  "mediaKey": "offers/flash-sale-40.png"
}
```

### Sub-objects

**`timing`**

| Field       | Type        | Notes                              |
| ----------- | ----------- | ---------------------------------- |
| `startDate` | date / null | ISO 8601 date.                     |
| `endDate`   | date / null | ISO 8601 date.                     |

**`condition`**

| Field                | Type        | Notes                               |
| -------------------- | ----------- | ----------------------------------- |
| `minQuantity`        | number/null | Minimum item count, ≥ 1.            |
| `minAmount`          | number/null | Minimum cart amount, ≥ 0.           |
| `excludedCategories` | string[]    | Category ObjectIds excluded.        |

**`reward`**

| Field                | Type        | Notes                               |
| -------------------- | ----------- | ----------------------------------- |
| `discountPercentage` | number/null | Between 0 and 100.                  |
| `freeItemMaxValue`   | number/null | Max value of the free item, ≥ 0.    |

---

## Offer Types & Required Fields

Beyond the base fields (`title`, `image`, `offerType`), each type enforces extra business rules:

| #   | `offerType`                 | Behavior                                                       | Required fields                                                             |
| --- | --------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | `buy_x_get_cheapest_free`   | Buy N items, get the cheapest free.                           | `condition.minQuantity`                                                     |
| 2   | `spend_x_get_discount`      | Spend X, get Y% off the total.                                | `condition.minAmount`, `reward.discountPercentage`                          |
| 3   | `spend_x_get_free_shipping` | Spend X, get free shipping.                                   | `condition.minAmount`                                                       |
| 4   | `buy_x_get_free_shipping`   | Buy N items, get free shipping (supports `excludedCategories`).| `condition.minQuantity`                                                     |
| 5   | `buy_x_get_half_price`      | Buy one, get the cheapest other item at 50% off.             | `condition.minQuantity`                                                     |
| 6   | `spend_x_get_free_item`     | Spend X, get a customer-chosen item ≤ Y free.                | `condition.minAmount`, `reward.freeItemMaxValue`                            |
| 7   | `flash_sale`                | A specific product gets a big discount, time-bounded.        | `timing.startDate`, `timing.endDate`, `reward.discountPercentage`, `targetProducts` (non-empty) |

> `flash_sale` is time-bounded: on create, lifecycle (activate/expire) jobs are scheduled automatically from `timing`.

---

## Endpoints

### 1. Create Offer

`POST /admin/offers`

Validates base schema, then applies the per-type business rules above. Returns `400` if a required field for the chosen type is missing.

#### Sample bodies per type

**1. buy_x_get_cheapest_free**

```json
{
  "title": "Buy 3, Cheapest Free",
  "description": "Add any 3 items to your cart and the cheapest one is free.",
  "isActive": true,
  "image": { "mediaUrl": "https://atozaccessories.s3.amazonaws.com/offers/buy3-cheapest-free.png" },
  "offerType": "buy_x_get_cheapest_free",
  "condition": { "minQuantity": 3 }
}
```

**2. spend_x_get_discount**

```json
{
  "title": "Spend 500, Get 15% Off",
  "description": "Spend 500 EGP or more and receive 15% off your order total.",
  "isActive": true,
  "image": { "mediaUrl": "https://atozaccessories.s3.amazonaws.com/offers/spend500-15off.png" },
  "offerType": "spend_x_get_discount",
  "condition": { "minAmount": 500 },
  "reward": { "discountPercentage": 15 }
}
```

**3. spend_x_get_free_shipping**

```json
{
  "title": "Free Shipping Over 750",
  "description": "Spend 750 EGP or more and shipping is on us.",
  "isActive": true,
  "image": { "mediaUrl": "https://atozaccessories.s3.amazonaws.com/offers/free-shipping-750.png" },
  "offerType": "spend_x_get_free_shipping",
  "condition": { "minAmount": 750 }
}
```

**4. buy_x_get_free_shipping**

```json
{
  "title": "Buy 2, Free Shipping",
  "description": "Buy any 2 items and get free shipping. Some categories excluded.",
  "isActive": true,
  "image": { "mediaUrl": "https://atozaccessories.s3.amazonaws.com/offers/buy2-free-shipping.png" },
  "offerType": "buy_x_get_free_shipping",
  "condition": {
    "minQuantity": 2,
    "excludedCategories": ["665e0000000000000000c001"]
  }
}
```

**5. buy_x_get_half_price**

```json
{
  "title": "Buy 1, Get 2nd Half Price",
  "description": "Buy one item and get the cheapest other item at 50% off.",
  "isActive": true,
  "image": { "mediaUrl": "https://atozaccessories.s3.amazonaws.com/offers/second-half-price.png" },
  "offerType": "buy_x_get_half_price",
  "condition": { "minQuantity": 2 }
}
```

**6. spend_x_get_free_item**

```json
{
  "title": "Spend 1000, Free Gift",
  "description": "Spend 1000 EGP and choose a free item worth up to 100 EGP.",
  "isActive": true,
  "image": { "mediaUrl": "https://atozaccessories.s3.amazonaws.com/offers/spend1000-free-item.png" },
  "offerType": "spend_x_get_free_item",
  "condition": { "minAmount": 1000 },
  "reward": { "freeItemMaxValue": 100 }
}
```

**7. flash_sale**

```json
{
  "title": "48h Flash Sale - 40% Off",
  "description": "Selected product at 40% off for 48 hours only.",
  "isActive": true,
  "image": { "mediaUrl": "https://atozaccessories.s3.amazonaws.com/offers/flash-sale-40.png" },
  "offerType": "flash_sale",
  "timing": {
    "startDate": "2026-07-01T00:00:00.000Z",
    "endDate": "2026-07-03T00:00:00.000Z"
  },
  "reward": { "discountPercentage": 40 },
  "targetProducts": ["665e0000000000000000p001"]
}
```

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {
    "offer": {
      "_id": "665f3c4d9e6f5a4c3d2e1f0a",
      "title": "48h Flash Sale - 40% Off",
      "description": "Selected product at 40% off for 48 hours only.",
      "isActive": true,
      "status": "scheduled",
      "image": {
        "mediaUrl": "https://atozaccessories.s3.amazonaws.com/offers/flash-sale-40.png",
        "mediaKey": "offers/flash-sale-40.png"
      },
      "offerType": "flash_sale",
      "timing": { "startDate": "2026-07-01T00:00:00.000Z", "endDate": "2026-07-03T00:00:00.000Z" },
      "condition": { "minQuantity": null, "minAmount": null, "excludedCategories": [] },
      "reward": { "discountPercentage": 40, "freeItemMaxValue": null },
      "targetProducts": ["665e0000000000000000p001"],
      "targetCategories": [],
      "createdAt": "2026-06-17T10:00:00.000Z",
      "updatedAt": "2026-06-17T10:00:00.000Z"
    }
  },
  "message": "Offer created successfully"
}
```

**Errors**

- `400` — base validation error, or a required field for the chosen `offerType` is missing (e.g. `condition.minAmount is required for spend_x_get_discount`).

---

### 2. List Offers

`GET /admin/offers`

Sorted by `createdAt` descending.

**Query parameters**

| Param       | Type    | Required | Description                                            |
| ----------- | ------- | -------- | ------------------------------------------------------ |
| `page`      | integer | no       | Page number, min `1` (default `1`).                    |
| `limit`     | integer | no       | Page size, min `1` (default `10`).                     |
| `offerType` | string  | no       | Filter by one of the 7 offer types.                    |
| `isActive`  | boolean | no       | `true` or `false`.                                     |

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {
    "data": [ { "_id": "665f3c4d9e6f5a4c3d2e1f0a", "title": "48h Flash Sale - 40% Off", "offerType": "flash_sale", "isActive": true } ],
    "totalItems": 1,
    "totalPages": 1,
    "currentPage": 1
  }
}
```

---

### 3. Get Offer By Id

`GET /admin/offers/:id`

Populates `condition.excludedCategories`, `targetProducts`, and `targetCategories`.

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {
    "offer": {
      "_id": "665f3c4d9e6f5a4c3d2e1f0a",
      "title": "48h Flash Sale - 40% Off",
      "offerType": "flash_sale",
      "targetProducts": [ { "_id": "665e0000000000000000p001", "productName": "Leather Wallet", "price": 350 } ],
      "targetCategories": [],
      "condition": { "minQuantity": null, "minAmount": null, "excludedCategories": [] }
    }
  }
}
```

**Errors**

- `404` — offer not found.

---

### 4. Update Offer

`PUT /admin/offers/:id`

All fields optional. Provided fields are merged with the existing offer, then the combined result is re-validated against the type's business rules. If `image.mediaUrl` changes, the old S3 object is deleted and the image replaced.

**Request body (example)**

```json
{
  "title": "Spend 600, Get 20% Off",
  "description": "Updated threshold and discount.",
  "condition": { "minAmount": 600 },
  "reward": { "discountPercentage": 20 }
}
```

**Response `200`**

```json
{
  "statusCode": 200,
  "data": { "offer": { "_id": "665f3c4d9e6f5a4c3d2e1f0a", "title": "Spend 600, Get 20% Off" } },
  "message": "Offer updated successfully"
}
```

**Errors**

- `404` — offer not found.
- `400` — resulting offer violates the type's business rules.

---

### 5. Toggle Offer

`PATCH /admin/offers/:id/toggle`

Flips `isActive`.

- **Deactivating:** for timed offers (`flash_sale`), pending jobs are cancelled; `status` becomes `expired`.
- **Reactivating:** for timed offers, jobs are rescheduled from `timing` (requires valid `startDate` and `endDate`, and at least one not in the past); `status` is recomputed. Non-timed offers become `active`.

No request body.

**Response `200`**

```json
{
  "statusCode": 200,
  "data": { "offer": { "_id": "665f3c4d9e6f5a4c3d2e1f0a", "isActive": false, "status": "expired" } },
  "message": "Offer toggled successfully"
}
```

**Errors**

- `404` — offer not found.
- `400` — reactivating a timed offer without valid `startDate`/`endDate`, or when both dates have passed.

---

### 6. Delete Offer

`DELETE /admin/offers/:id`

Cancels any pending lifecycle jobs (timed offers) and deletes the offer's S3 image, then removes the document. Deleting an active offer is allowed but logs a warning.

**Response `200`**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Offer deleted successfully"
}
```

**Errors**

- `404` — offer not found.
