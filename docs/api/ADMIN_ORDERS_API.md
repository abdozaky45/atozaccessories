# Admin Orders API — Full Specification

Backend: **A to Z Accessory** (Express + TypeScript + MongoDB/Mongoose, JWT auth).
This document describes **only the admin-facing order endpoints** and exactly what each one executes on the server.

- **Base URL (local):** `http://localhost:5000`
- **Router mount point:** `/admin/orders`
- **Source files:**
  - Router: `src/Router/Order/OrderRouter.ts`
  - Controller: `src/Controller/Order/OrderController.ts`
  - Service: `src/Service/Order/OrderService.ts`
  - Model: `src/Model/Order/OrderModel.ts`
  - Validation: `src/Validation/Order/OrderValidation.ts`

---

## 1. Authentication & Authorization

All admin order routes are mounted **after** the global `checkAuthority` middleware and behind `checkRole([ADMIN])`:

```ts
app.use(`/admin/orders`, checkRole([UserTypeEnum.ADMIN]), OrderRouter);
```

Every request MUST include:

```
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

Authorization pipeline executed on every call:

1. `checkAuthority` — verifies the JWT, confirms the token still exists in the `Token` collection (a logged-out token is rejected), and injects `req.body.currentUser = { userInfo: { _id, role, email, iat, exp }, token }`.
2. `checkRole(['admin'])` — rejects any non-admin role.
3. `Validation(...)` — Joi validation. Note: it validates the **merged** object `{ ...body, ...params, ...query }`, and the `baseSchema` requires a valid `currentUser` object (always present after `checkAuthority`).

### Auth / Authorization error responses

| Status | Message | Trigger |
|--------|---------|---------|
| `401` | `no token provided or in-valid Bearer Key` | Missing `Authorization` header |
| `401` | `Invalid token or expired` | JWT invalid/expired |
| `401` | `Invalid token payload` | Token has no `_id` |
| `401` | `user token is invalid` | Token not found in DB (e.g. after logout) |
| `403` | `Forbidden: You must have the role to access this resource` | Caller is not `admin` |
| `400` | `Validation Error!` (+ `errors[]`) | Joi validation failed (see each endpoint) |

> Implementation note: thrown `ApiError`s are serialized by `globalErrorHandling`, which returns `error.statusCode`. The body shape for thrown errors is:
> ```json
> { "success": false, "message": "<message>", "error": [], "stack": "..." }
> ```
> The direct `res.status(401)` responses from `checkAuthority` use `{ "success": false, "message": "..." }`.

---

## 2. Order Status Lifecycle

`status` is one of (`src/Utils/OrderStatusType`):

| Status | Meaning |
|--------|---------|
| `under_review` | Initial status when an order is created |
| `confirmed` | Order confirmed |
| `ordered` | Order placed/processing |
| `shipped` | Order shipped |
| `delivered` | Order delivered (counts toward "average order value" analytics) |
| `cancelled` | Cancelled (stock restored) |
| `deleted` | Soft-deleted (stock restored, hidden from active flow) |

---

## 3. Endpoints

### 3.1 `GET /admin/orders/all` — List all orders (paginated)

Returns a paginated list of every order, newest first, with optional filtering by status and/or a trailing order-id match.

**Query parameters**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `page` | number | **Yes** (Joi requires it) | Page number. If `<1`, `NaN`, or falsy, the service clamps it to `1`. |
| `status` | string | No | Must be one of the order statuses above. Filters `status === <value>`. |
| `orderId` | string | No | Matches orders whose `_id` **ends with** this string (suffix regex on the stringified `_id`). Lets admins search by the short 8-char order number shown in the UI. |

**Server logic (`OrderService.getAllOrders`)**

1. `limit` is fixed at **20** per page.
2. `page` is normalized: `page = !page || page < 1 || isNaN(page) ? 1 : page`.
3. Builds a Mongo filter:
   - If `status` provided → `filter.status = status`.
   - If `orderId` provided → `filter.$expr = { $regexMatch: { input: { $toString: "$_id" }, regex: orderId + "$" } }` (suffix match).
4. `totalItems = countDocuments(filter)`, `totalPages = ceil(totalItems / 20)`.
5. Queries orders: `find(filter).populate(products.productId → "defaultImage").skip(skip).limit(20).sort({ createdAt: -1 })`.

**Success — `200`**

```json
{
  "statusCode": 200,
  "data": {
    "totalItems": 42,
    "totalPages": 3,
    "currentPage": 1,
    "orders": [ /* Order objects, see §4 */ ]
  },
  "message": "Orders fetched successfully",
  "success": true
}
```

**Validation errors — `400`**: missing `page`, or `status` not in the allowed enum.

---

### 3.2 `GET /admin/orders/:orderId` — Get one order

Fetches a single order by its Mongo `_id`.

**Path parameters**

| Param | Type | Required |
|-------|------|----------|
| `orderId` | string | **Yes** |

**Server logic (`OrderService.getOrderById`)**

- `OrderModel.findById(orderId).populate(products.productId → "defaultImage productName")`.
- If no order is found → throws `404 Order not found`.

**Success — `200`**

```json
{
  "statusCode": 200,
  "data": { "order": { /* Order object, see §4 */ } },
  "message": "Orders fetched successfully",
  "success": true
}
```

**Errors**

| Status | Message | Trigger |
|--------|---------|---------|
| `404` | `Order not found` | No order with that `_id` |
| `400` | `Validation Error!` | `orderId` missing |

---

### 3.3 `PATCH /admin/orders/status/:orderId` — Update order status

Single endpoint that drives **three different behaviors** depending on the `status` value in the body.

**Path parameters**

| Param | Type | Required |
|-------|------|----------|
| `orderId` | string | **Yes** |

**Request body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `status` | string | **Yes** | Must be one of the order statuses in §2. |

```json
{ "status": "shipped" }
```

**Server logic (`OrderController.updateOrderStatusController`) — branches on `status`:**

#### Branch A — `status === "cancelled"` → `adminCancelOrder(orderId)`
1. Loads the order; `404 Order not found` if missing.
2. Computes `shouldRestoreStock = !["cancelled","deleted"].includes(order.status)` (so stock is restored only if it was previously deducted).
3. Inside a DB transaction, if `shouldRestoreStock`:
   - **Restores variant stock**: `$inc availableItems += quantity` for each product line.
   - **Decrements `soldItems`** on the parent products (only for paid lines, i.e. `itemPrice > 0`; free-gift lines are skipped).
4. Sets `order.status = "cancelled"` and saves (transaction commit).
5. After commit, recomputes each affected product's `isSoldOut` flag from live variant stock.
6. **Side effect:** sends an email to the admin addresses (`ADMIN_ONE`, `ADMIN_TWO`) with subject `❌ Order #<last8> Cancelled by Admin` containing the invoice HTML. Email failures are caught and logged (do not fail the request).

#### Branch B — `status === "deleted"` → `adminDeleteOrder(orderId)`
- Identical stock/soldItems restoration logic and guard as Branch A, but sets `order.status = "deleted"`.
- **No email** is sent.

#### Branch C — any other status (`under_review`, `confirmed`, `ordered`, `shipped`, `delivered`) → `updateOrderStatus(orderId, status)`
- Loads the order; `404 Order not found` if missing.
- Sets `order.status = status` and saves. **No stock changes, no email.**

**Success — `200`** (all branches)

```json
{
  "statusCode": 200,
  "data": { "order": { /* updated Order object */ } },
  "message": "Order updated successfully",
  "success": true
}
```

**Errors**

| Status | Message | Trigger |
|--------|---------|---------|
| `404` | `Order not found` | No order with that `_id` |
| `400` | `Validation Error!` | `status` missing or not in the allowed enum |

> Important behavioral notes:
> - Moving an already `cancelled`/`deleted` order to `cancelled`/`deleted` again will **not** double-restore stock (guarded by `shouldRestoreStock`).
> - Moving a `cancelled`/`deleted` order **back** to an active status (Branch C) only changes the `status` field — it does **not** re-deduct stock. Use with care.

---

## 4. Order Object Shape

Returned by all three endpoints (within `data.orders[]`, `data.order`).

```jsonc
{
  "_id": "6630a1f2c2a4b8e9d1234567",
  "user": "661f0a9b2c2a4b8e9d111111",          // ObjectId of the auth user who placed it
  "userInformation": {                          // snapshot taken at order time
    "firstName": "Ahmed",
    "lastName": "Zaki",
    "address": "123 Main St",
    "primaryPhone": "+201000000000",
    "secondaryPhone": "+201111111111",          // optional
    "country": "Egypt",                          // optional
    "postalCode": "12345"                        // optional
  },
  "shipping": { "name": "Cairo", "cost": 50 },   // snapshot
  "products": [
    {
      "productId": {                             // populated: { _id, defaultImage, productName? }
        "_id": "662abc...",
        "defaultImage": { "mediaUrl": "https://...", "mediaId": "products/x.png" },
        "productName": "Leather Watch"           // only populated on GET /:orderId
      },
      "variantId": "662def...",
      "quantity": 2,
      "productName": "Leather Watch",            // snapshot string on the line
      "itemPrice": 200,                          // unit price after flash discount (0 for free gift)
      "totalPrice": 400,
      "size": "M",
      "color": "Black",
      "isFreeGift": false
    }
  ],
  "subTotal": 400,
  "discount": 0,                                 // cart-offer discount amount
  "freeShipping": false,
  "shippingCost": 50,
  "totalAmount": 450,                            // subTotal - discount + (freeShipping ? 0 : shippingCost)
  "appliedOffer": null,                          // ObjectId of the single best cart offer, or null
  "appliedFlashOffers": [],                      // ObjectIds of flash-sale offers applied to items
  "status": "under_review",
  "createdAt": "2026-06-18T10:00:00.000Z",       // Mongoose timestamps
  "updatedAt": "2026-06-18T10:05:00.000Z"
}
```

> `productId` populate differs by endpoint:
> - `GET /all` → `defaultImage` only.
> - `GET /:orderId` → `defaultImage productName`.

---

## 5. Quick Reference

| Method | Path | Purpose | Required input |
|--------|------|---------|----------------|
| GET | `/admin/orders/all` | Paginated list with filters | `page` (query); optional `status`, `orderId` |
| GET | `/admin/orders/:orderId` | Single order | `orderId` (path) |
| PATCH | `/admin/orders/status/:orderId` | Update status / cancel / soft-delete | `orderId` (path), `status` (body) |

All require `Authorization: Bearer <ADMIN_TOKEN>` and an `admin` role.
