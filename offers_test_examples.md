# Offers — Test Examples

Realistic end-to-end examples for each of the 7 supported offer types.

Each example shows the **offer configuration** (as stored on the `Offer` document),
a **sample cart**, and the **expected result** produced by
`calculateOrderOffers` in [src/Service/Order/OrderService.ts](src/Service/Order/OrderService.ts).

## Core rules recap

- **One cart offer per order.** Offers 1–6 are evaluated against the cart and the
  single offer that saves the customer the most money is applied.
- **Flash sale (offer 7) is independent.** It always discounts its target product,
  stacking on top of the chosen cart offer.
- **Flash-sale items are excluded from cart-offer qualification:** their price does
  not count toward spend thresholds and they are not counted toward quantity
  thresholds — but their *discounted* price is still added to the final total.
- **`totalAmount` = finalSubTotal − discount + (freeShipping ? 0 : shippingCost)**,
  where `finalSubTotal` is the sum of every line's `totalPrice` after flash discounts
  and any free gift line.

---

## 1. BUY_N_GET_1_FREE — `buy_x_get_cheapest_free`

> Buy N items, get the cheapest item for free.

### Offer configuration
```json
{
  "title": "Buy 3, Cheapest Free",
  "offerType": "buy_x_get_cheapest_free",
  "isActive": true,
  "status": "active",
  "condition": { "minQuantity": 3 }
}
```

### Sample cart  (shipping = 50)
| Product | Unit price | Qty | Line total |
|---------|-----------:|----:|-----------:|
| Watch   | 200 | 1 | 200 |
| Belt    | 150 | 1 | 150 |
| Socks   | 100 | 1 | 100 |

Total quantity = 3 → meets `minQuantity: 3`.

### Expected result
- Cheapest item = **Socks (100)** → applied as an order-level discount.
- `discount = 100`
- `subTotal = 450`
- `totalAmount = 450 − 100 + 50 = ` **400**
- `appliedOffer = Buy 3, Cheapest Free`, `savedAmount = 100`

---

## 2. SPEND_GET_DISCOUNT — `spend_x_get_discount`

> Spend X amount, get Y% discount on the total.

### Offer configuration
```json
{
  "title": "Spend 500, get 10% off",
  "offerType": "spend_x_get_discount",
  "isActive": true,
  "status": "active",
  "condition": { "minAmount": 500 },
  "reward": { "discountPercentage": 10 }
}
```

### Sample cart  (shipping = 50)
| Product   | Unit price | Qty | Line total |
|-----------|-----------:|----:|-----------:|
| Handbag   | 400 | 1 | 400 |
| Wallet    | 200 | 1 | 200 |

subTotal = 600 → meets `minAmount: 500`.

### Expected result
- `discount = 600 × 10% = 60`
- `totalAmount = 600 − 60 + 50 = ` **590**
- `appliedOffer = Spend 500, get 10% off`, `savedAmount = 60`

---

## 3. SPEND_GET_FREE_SHIPPING — `spend_x_get_free_shipping`

> Spend X amount, get free shipping.

### Offer configuration
```json
{
  "title": "Free shipping over 400",
  "offerType": "spend_x_get_free_shipping",
  "isActive": true,
  "status": "active",
  "condition": { "minAmount": 400 }
}
```

### Sample cart  (shipping = 50)
| Product   | Unit price | Qty | Line total |
|-----------|-----------:|----:|-----------:|
| Sunglasses| 250 | 1 | 250 |
| Cap       | 200 | 1 | 200 |

subTotal = 450 → meets `minAmount: 400`.

### Expected result
- `freeShipping = true`, `discount = 0`
- `totalAmount = 450 − 0 + 0 = ` **450**
- `appliedOffer = Free shipping over 400`, `savedAmount = 50` (the saved shipping cost)

---

## 4. BUY_N_GET_FREE_SHIPPING — `buy_x_get_free_shipping`  (with excluded categories)

> Buy N items, get free shipping. Items from excluded categories count toward the
> total but do **not** help qualify.

### Offer configuration
```json
{
  "title": "Buy 3 items, free shipping",
  "offerType": "buy_x_get_free_shipping",
  "isActive": true,
  "status": "active",
  "condition": {
    "minQuantity": 3,
    "excludedCategories": ["<giftCardCategoryId>"]
  }
}
```

### Sample cart  (shipping = 40)
| Product            | Category   | Unit price | Qty | Line total |
|--------------------|------------|-----------:|----:|-----------:|
| Bracelet           | Jewelry    | 100 | 2 | 200 |
| Keychain           | Accessories| 80  | 1 | 80  |
| Gift Card          | Gift Cards | 250 | 1 | 250 |  ← excluded category

- Qualifying quantity (excluding Gift Cards) = 2 + 1 = **3** → meets `minQuantity: 3`.
- The Gift Card's quantity does **not** count toward qualification, but its 250 price
  **is** included in the order total.

### Expected result
- `freeShipping = true`
- `subTotal = 200 + 80 + 250 = 530`
- `totalAmount = 530 − 0 + 0 = ` **530**
- `appliedOffer = Buy 3 items, free shipping`, `savedAmount = 40`

> Counter-case: if the cart had only the 2 Bracelets + 1 Gift Card, qualifying
> quantity would be 2 (< 3) and the offer would **not** apply — shipping would be charged.

---

## 5. BUY_1_GET_HALF_PRICE — `buy_x_get_half_price`

> Buy one item, get the cheapest other item at 50% off.

### Offer configuration
```json
{
  "title": "Cheapest item half price",
  "offerType": "buy_x_get_half_price",
  "isActive": true,
  "status": "active",
  "condition": { "minQuantity": 2 }
}
```

### Sample cart  (shipping = 50)
| Product   | Unit price | Qty | Line total |
|-----------|-----------:|----:|-----------:|
| Jacket    | 300 | 1 | 300 |
| Scarf     | 120 | 1 | 120 |

Total quantity = 2 → meets `minQuantity: 2` (need ≥ 2 so there is an "other" item).

### Expected result
- Cheapest item = **Scarf (120)** → half off = 60 discount.
- `discount = 60`
- `subTotal = 420`
- `totalAmount = 420 − 60 + 50 = ` **410**
- `appliedOffer = Cheapest item half price`, `savedAmount = 60`

---

## 6. SPEND_GET_FREE_ITEM — `spend_x_get_free_item`

> Spend X amount, get any item worth ≤ Y for free. The customer chooses the free
> item (`freeGiftVariantId`) and its price must be ≤ `freeItemMaxValue`.

### Offer configuration
```json
{
  "title": "Spend 1000, free gift up to 150",
  "offerType": "spend_x_get_free_item",
  "isActive": true,
  "status": "active",
  "condition": { "minAmount": 1000 },
  "reward": { "freeItemMaxValue": 150 }
}
```

### Sample cart  (shipping = 50)
Order request includes `freeGiftVariantId` pointing to **Hair Clip (120)**.

| Product    | Unit price | Qty | Line total |
|------------|-----------:|----:|-----------:|
| Coat       | 800 | 1 | 800 |
| Boots      | 400 | 1 | 400 |

subTotal of purchased items = 1200 → meets `minAmount: 1000`.
Chosen gift Hair Clip price 120 ≤ `freeItemMaxValue: 150` → eligible.

### Expected result
- A free line is appended: **Hair Clip — itemPrice 0, totalPrice 0, `isFreeGift: true`**.
- `discount = 0` (the gift is free, not a discount on existing items)
- `subTotal = 800 + 400 + 0 = 1200`
- `totalAmount = 1200 − 0 + 50 = ` **1250**
- `appliedOffer = Spend 1000, free gift up to 150`, `savedAmount = 120` (value of the free item)

> Counter-case: if the customer chose an item worth 200 (> 150), the offer would not
> qualify and no free item would be granted.

---

## 7. FLASH_SALE — `flash_sale`

> A specific product gets a big discount for a limited time. Flash-sale items are
> excluded from cart-offer qualification, but their discounted price is added to the
> final total.

### Offer configuration
```json
{
  "title": "Flash Sale — 40% off the Smart Watch",
  "offerType": "flash_sale",
  "isActive": true,
  "status": "active",
  "timing": { "startDate": "2026-06-17T10:00:00Z", "endDate": "2026-06-17T14:00:00Z" },
  "reward": { "discountPercentage": 40 },
  "targetProducts": ["<smartWatchProductId>"]
}
```

To demonstrate exclusion, assume a second offer is also active:
`spend_x_get_discount` with `minAmount: 300`, `discountPercentage: 10`.

### Sample cart  (shipping = 50)
| Product      | Unit price | Qty | Line total | Flash target? |
|--------------|-----------:|----:|-----------:|:-------------:|
| Smart Watch  | 500 | 1 | 500 | ✅ yes |
| Phone Case   | 200 | 1 | 200 | no |

### Expected result
- **Flash discount** applies to Smart Watch: 500 × (1 − 0.40) = **300** → `flashSaved = 200`.
- **Cart-offer qualification excludes the flash item:** non-flash subTotal = 200 only.
  Since 200 < `minAmount: 300`, the `spend_x_get_discount` offer does **not** qualify.
- `subTotal = 300 (watch) + 200 (case) = 500`
- `discount = 0`
- `totalAmount = 500 − 0 + 50 = ` **550**
- `appliedOffer = null`, `appliedFlashOffers = [Flash Sale — 40% off the Smart Watch]`

> If the Phone Case price were 350 instead, the non-flash subTotal (350) would meet
> the threshold, and the order would stack **both**: flash discount on the watch
> **and** the 10% cart discount on the 350 non-flash spend.

---

## Bonus: stacking flash + a cart offer

Shows that flash and one cart offer apply together.

- Active offers: `flash_sale` (40% off Smart Watch) + `spend_x_get_discount`
  (`minAmount: 300`, 10%).
- Cart (shipping 50): Smart Watch 500 (flash) + Designer Bag 400 (non-flash).

| Step | Value |
|------|------:|
| Flash on Smart Watch | 500 → 300  (`flashSaved = 200`) |
| Non-flash subTotal (qualifies ≥ 300) | 400 |
| Cart discount 10% of 400 | 40 |
| finalSubTotal | 300 + 400 = 700 |
| totalAmount | 700 − 40 + 50 = **710** |
| totalSaved | 200 (flash) + 40 (cart) = **240** |
