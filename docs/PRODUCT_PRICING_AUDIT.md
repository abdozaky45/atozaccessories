# Product Pricing Audit — finalPrice vs price/salePrice

> READ-ONLY audit run live against the production DB. No data modified.
> **Rule the system enforces** (from `ProductController` create/update):
> `finalPrice = salePrice ? salePrice : price`  — i.e. finalPrice = the sale price when on sale, otherwise the normal price.
> `discount = price − salePrice`, `discountPercentage = round(discount/price × 100, 2)`, `isSale = salePrice < price`.

## Summary

| Metric | Count |
|---|--:|
| Active products audited | 129 |
| Deleted (skipped) | 18 |
| ✅ finalPrice correct | 129 |
| On sale (salePrice > 0) | 129 |
| Not on sale | 0 |
| ❌ finalPrice missing | 0 |
| ❌ finalPrice wrong | 0 |
| ⚠️ salePrice ≥ price | 0 |
| ⚠️ on sale but finalPrice = price | 0 |
| ❌ discount/isSale really wrong | 0 |
| ℹ️ discountPercentage rounding drift (harmless) | 72 |
| ⚠️ negative value | 0 |

## ✅ Bottom line on `finalPrice`

All **129** active products have `finalPrice` exactly equal to `salePrice ? salePrice : price`. Every product currently carries a `salePrice`, so in practice **finalPrice = salePrice everywhere** — and that is what orders charge. No miscalculated finalPrice was found.

The only discrepancy is **`discountPercentage` stored at full float precision** (e.g. `17.77777777777778`) on 72 products, where the current code rounds to 2 decimals (`17.78`). This is a **display-only** field — it does **not** affect `finalPrice`, cart subtotals, or order totals (those use `finalPrice`). It comes from older records saved before the 2-decimal rounding was added to `ratioCalculatePrice`. Re-saving each product (or a one-line backfill) normalizes it.

## ❌ finalPrice missing

_none_ ✅

## ❌ finalPrice wrong (≠ salePrice?salePrice:price)

_none_ ✅

## ⚠️ salePrice ≥ price (sale price not actually lower)

_none_ ✅

## ⚠️ Marked on sale but finalPrice still = price

_none_ ✅

## ❌ discount / isSale REALLY wrong (affects displayed money)

_none_ ✅

## ℹ️ discountPercentage rounding drift (harmless, display-only) — 72 products

Stored at full precision vs the rounded value the current code would write. `finalPrice` and order totals are unaffected.

| name | price | salePrice | finalPrice | stored % | rounded % |
|---|--:|--:|--:|--:|--:|
| Retro Bracelet | 225 | 185 | 185 | 17.77777777777778 | 17.78 |
| Nilo Bracelet | 225 | 185 | 185 | 17.77777777777778 | 17.78 |
| YSL Earrings | 175 | 125 | 125 | 28.57142857142857 | 28.57 |
| Helal Necklace | 185 | 150 | 150 | 18.91891891891892 | 18.92 |
| Heart Dotted Necklace | 185 | 150 | 150 | 18.91891891891892 | 18.92 |
| Crafted Heart Necklace | 185 | 150 | 150 | 18.91891891891892 | 18.92 |
| Butterfly Necklace | 185 | 150 | 150 | 18.91891891891892 | 18.92 |
| Heart brust Necklace | 225 | 185 | 185 | 17.77777777777778 | 17.78 |
| Louts Necklace | 225 | 185 | 185 | 17.77777777777778 | 17.78 |
| White Marble Helal Necklace | 225 | 185 | 185 | 17.77777777777778 | 17.78 |
| White Marble Frame Necklace | 185 | 150 | 150 | 18.91891891891892 | 18.92 |
| Khartosha Pharonic Necklace | 185 | 150 | 150 | 18.91891891891892 | 18.92 |
| 3 Layered Heart Necklace | 275 | 200 | 200 | 27.27272727272727 | 27.27 |
| Crystals Ring | 225 | 165 | 165 | 26.666666666666668 | 26.67 |
| Silver & Gold Couples Rings | 300 | 185 | 185 | 38.333333333333336 | 38.33 |
| Black Double Layered Ring | 175 | 125 | 125 | 28.57142857142857 | 28.57 |
| Waves Ring | 150 | 110 | 110 | 26.666666666666668 | 26.67 |
| Triple Waves Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Mixed Waves Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Statment Ring | 175 | 125 | 125 | 28.57142857142857 | 28.57 |
| Textured Statment Ring | 175 | 125 | 125 | 28.57142857142857 | 28.57 |
| Branch Statment Ring | 175 | 125 | 125 | 28.57142857142857 | 28.57 |
| Loop Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Roman Ring | 185 | 125 | 125 | 32.432432432432435 | 32.43 |
| Versace slime Ring | 185 | 125 | 125 | 32.432432432432435 | 32.43 |
| Versace Ring | 185 | 125 | 125 | 32.432432432432435 | 32.43 |
| Versace Chain Ring | 185 | 125 | 125 | 32.432432432432435 | 32.43 |
| Infinity Ring | 185 | 125 | 125 | 32.432432432432435 | 32.43 |
| Vintage white marble Ring | 185 | 125 | 125 | 32.432432432432435 | 32.43 |
| Drops Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Multi Layered Dot Ring | 175 | 125 | 125 | 28.57142857142857 | 28.57 |
| Leaves Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Dots Ring | 150 | 85 | 85 | 43.333333333333336 | 43.33 |
| Evil Eye Ring | 185 | 150 | 150 | 18.91891891891892 | 18.92 |
| Herringbone Bracelet | 175 | 125 | 125 | 28.57142857142857 | 28.57 |
| Twisted rope Bracelet | 185 | 145 | 145 | 21.62162162162162 | 21.62 |
| Pump Herringbone Bracelet | 185 | 150 | 150 | 18.91891891891892 | 18.92 |
| Dainty Bracelet | 195 | 150 | 150 | 23.076923076923077 | 23.08 |
| Long Kaf Necklace | 275 | 225 | 225 | 18.181818181818183 | 18.18 |
| Long Mesh Bracelet | 210 | 175 | 175 | 16.666666666666664 | 16.67 |
| Pink  CD | 175 | 100 | 100 | 42.857142857142854 | 42.86 |
| Pink  CD | 175 | 110 | 110 | 37.142857142857146 | 37.14 |
| Statment Snake Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Branch Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Butterflies Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Sparkle Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Dots Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Boho Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Crown Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Spiral Snake Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Boho Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Dolphin Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Boho Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Braided Textured Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Stetment Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Stetment Leaves Branch Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Spiral Chain Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Flowers Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Dainty shells Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Shell Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Star Fish Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Starfish Crap Fish Ring | 150 | 100 | 100 | 33.33333333333333 | 33.33 |
| Green On Gold Cartier Watch | 550 | 375 | 375 | 31.818181818181817 | 31.82 |
| Rose On Gold Cartier Watch | 550 | 375 | 375 | 31.818181818181817 | 31.82 |
| Black On Gold Cartier Watch | 550 | 375 | 375 | 31.818181818181817 | 31.82 |
| Gold On Gold Japanese  Citizen Watch | 900 | 650 | 650 | 27.77777777777778 | 27.78 |
| white on Gold Classic Timely Watch | 750 | 550 | 550 | 26.666666666666668 | 26.67 |
| white on Gold vintageTimely Watch | 750 | 550 | 550 | 26.666666666666668 | 26.67 |
| Black on Gold vintageTimely Watch | 750 | 550 | 550 | 26.666666666666668 | 26.67 |
| White on Gold/Silver vintage Timely Watch | 750 | 550 | 550 | 26.666666666666668 | 26.67 |
| Square White on Gold vintage Timely Watch | 750 | 550 | 550 | 26.666666666666668 | 26.67 |
| White on Gold vintage Timely Watch | 750 | 550 | 550 | 26.666666666666668 | 26.67 |

