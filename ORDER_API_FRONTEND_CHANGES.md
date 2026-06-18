# Order API — Frontend Changes (Latest Update)

> Purpose: document exactly what changed in the **order response shape** after the latest backend update, so a frontend that was integrated *before* this change can be adjusted.

---

## TL;DR — Two key points

1. **`shipping` and `userInformation` are now always objects (snapshots), never IDs.**
   Previously, legacy orders returned `shipping` and `userInformation` as bare ObjectId strings. Now **all** orders (old and new) return them as full objects.

2. **Money fields changed:** the old `price` field is gone, replaced by:
   `subTotal`, `discount`, `freeShipping`, `shippingCost`, `totalAmount`.

If the frontend was reading `order.shipping` as an ID, or using `order.price`, it must be updated.

---

## Affected endpoints (READ only)

All of these now return the unified new shape:

| Method | Path | Auth | Service |
|--------|------|------|---------|
| GET | `/admin/orders/all` | ADMIN | getAllOrders |
| GET | `/admin/orders/:orderId` | ADMIN | getOrderById |
| GET | `/order/:orderId` | USER / ADMIN | getOrderById |
| GET | `/order/customer/:customerId` | USER (self) / ADMIN | getUserOrders |

> The other endpoints (`POST /order`, `POST /order/preview`, `PATCH /order/cancel/:orderId`, `PATCH /admin/orders/status/:orderId`) were **not changed** — they already returned the new shape (snapshots), since they operate on orders created with the new system.

---

## Order shape (new, unified)

```json
{
  "_id": "6a258fd8a8e689407a159d23",
  "user": "6a258f71a8e689407a159ca5",

  "userInformation": {
    "firstName": "Ahmed",
    "lastName": "Ali",
    "address": "12 Tahrir St, Cairo",
    "primaryPhone": "01000000000",
    "secondaryPhone": "01100000000",
    "country": "Egypt",
    "postalCode": "11511"
  },

  "shipping": {
    "name": "Cairo",
    "cost": 50
  },

  "products": [
    {
      "isFreeGift": false,
      "productId": {
        "_id": "69fb5962a8e689407a14613f",
        "productName": "Mixed Double Knot Bangle ",
        "defaultImage": {
          "mediaUrl": "https://atozaccessories.s3.us-east-1.amazonaws.com/imageSlider/...",
          "mediaId": "imageSlider/..."
        }
      },
      "variantId": "69fb5970a8e689407a146140",
      "productName": "Mixed Double Knot Bangle ",
      "quantity": 1,
      "itemPrice": 185,
      "totalPrice": 185,
      "size": "7",
      "color": "Gold"
    }
  ],

  "subTotal": 555,
  "discount": 0,
  "freeShipping": false,
  "shippingCost": 50,
  "totalAmount": 605,

  "appliedOffer": null,
  "appliedFlashOffers": [],

  "status": "under_review",
  "createdAt": "2026-06-07T15:35:52.023Z",
  "updatedAt": "2026-06-07T15:35:52.023Z"
}
```

> In `getAllOrders` and `getUserOrders`, each product's `productId` is populated with `defaultImage` only (no `productName` at the populate level), whereas `getOrderById` populates `defaultImage` + `productName`. In all cases, `productName` is also present on the product line item itself.

---

## Field reference (frontend-relevant)

### `shipping` (object — not an ID)
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Shipping zone/category name (was `category` in the Shipping model) |
| `cost` | number | Shipping cost |

### `userInformation` (object — not an ID)
| Field | Type | Description |
|-------|------|-------------|
| `firstName` | string | |
| `lastName` | string | |
| `address` | string | |
| `primaryPhone` | string | |
| `secondaryPhone` | string \| undefined | optional |
| `country` | string \| undefined | optional |
| `postalCode` | string \| undefined | optional |

### Money fields (replacing the old `price`)
| Field | Type | Description |
|-------|------|-------------|
| `subTotal` | number | Sum of products before discount and shipping |
| `discount` | number | Cart-offer discount amount — `0` if none |
| `freeShipping` | boolean | Whether shipping is free |
| `shippingCost` | number | Shipping cost |
| `totalAmount` | number | **Final total** = subTotal − discount + (freeShipping ? 0 : shippingCost) |
| `appliedOffer` | ObjectId \| null | Applied cart offer (if any) |
| `appliedFlashOffers` | ObjectId[] | Applied flash-sale offers |

> ✅ Use **`totalAmount`** as the customer-facing grand total. The old **`price`** field has been removed from the response.

---

## Two things the frontend must watch for

### 1) `_legacy` flag
Legacy orders (created before the system change) are returned with:
```json
"_legacy": true
```
This is just an internal marker indicating the data was normalized at read time. You can ignore it in the UI. New orders do not include this field.

> Note: in legacy orders, product line items may be missing `variantId` / `size` / `color` (they didn't exist in the old system). Add a fallback in the UI.

### 2) The default `id` field was removed from `productId`
Before the change, the populated `productId` included a virtual field `id` (a copy of `_id`):
```json
"productId": { "_id": "...", "productName": "...", "id": "..." }   // before
"productId": { "_id": "...", "productName": "..." }                 // now
```
If the frontend relies on `productId.id`, switch it to **`productId._id`**.

---

## Summary — changes required in the frontend

- [ ] Read `order.shipping.name` and `order.shipping.cost` (not `order.shipping` as an ID).
- [ ] Read customer data from `order.userInformation.*` (no separate fetch by ID).
- [ ] Replace any use of `order.price` with `order.totalAmount` (+ `subTotal`/`shippingCost`/`discount` if showing a breakdown).
- [ ] Use `productId._id` instead of `productId.id`.
- [ ] Add a fallback for legacy product items that may be missing `variantId`/`size`/`color`.
