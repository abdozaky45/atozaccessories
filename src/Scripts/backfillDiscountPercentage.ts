import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import ProductModel from "../Model/Product/ProductModel";

// ─── Backfill product.discount / discountPercentage / isSale ─────────────────────
//
// These fields are derived from (price, salePrice) by `ratioCalculatePrice`
// (src/Service/Product/ProductService.ts), which stores discountPercentage as a
// whole number:
//   discountPercentage = Math.round((discount / price) * 100)
//
// Older records stored the UNROUNDED percentage (e.g. 17.77777777777778). That is
// a display-only artefact — it does NOT affect finalPrice, cart subtotals, or
// order totals — but it looks wrong on the storefront. This script recomputes all
// three derived fields with the current rule and fixes only the out-of-sync ones.
//
// Safe to re-run: products already in sync are skipped.
//
// Run with:        npm run migrate:discount-pct
// Preview only:    npm run migrate:discount-pct -- --dry-run

const DB_URL = process.env.DB_URL ?? "";
const DRY_RUN = process.argv.includes("--dry-run");

// Verbatim copy of ratioCalculatePrice (ProductService.ts) — kept inline so this
// migration has no side-effects from importing the service layer.
function ratioCalculatePrice(price: number, salePrice?: number) {
  let discount = 0;
  let discountPercentage = 0;
  let isSale = false;
  if (!salePrice || salePrice === 0) {
    // no sale
  } else if (salePrice < price) {
    discount = price - salePrice;
    discountPercentage = Math.round((discount / price) * 100);
    isSale = true;
  }
  return { discount, discountPercentage, isSale };
}

async function migrate() {
  const products = await ProductModel.find({})
    .select("_id productName price salePrice discount discountPercentage isSale")
    .lean();

  console.log(`Total products: ${products.length}`);

  const ops: any[] = [];
  let alreadyCorrect = 0;

  for (const p of products as any[]) {
    const exp = ratioCalculatePrice(p.price, p.salePrice);

    const storedDisc = p.discount ?? 0;
    const storedPct = p.discountPercentage ?? 0;
    const storedSale = !!p.isSale;

    const inSync =
      storedDisc === exp.discount &&
      storedPct === exp.discountPercentage &&
      storedSale === exp.isSale;

    if (inSync) {
      alreadyCorrect++;
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `  fix ${String(p._id)} ${p.productName?.trim()} | ` +
          `disc ${storedDisc}→${exp.discount}, ` +
          `pct ${storedPct}→${exp.discountPercentage}, ` +
          `isSale ${storedSale}→${exp.isSale}`
      );
    }

    ops.push({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            discount: exp.discount,
            discountPercentage: exp.discountPercentage,
            isSale: exp.isSale,
          },
        },
      },
    });
  }

  console.log(`\nOut of sync: ${ops.length}`);
  console.log(`Already correct (skipped): ${alreadyCorrect}`);

  if (DRY_RUN) {
    console.log("\n[dry-run] No changes written.");
    return;
  }

  let updated = 0;
  const BATCH = 1000;
  for (let i = 0; i < ops.length; i += BATCH) {
    const res = await ProductModel.bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
    updated += res.modifiedCount ?? 0;
  }
  console.log(`discountPercentage set/fixed: ${updated}`);
}

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in environment variables.");
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(DB_URL);
    console.log(`DB connected — ${DRY_RUN ? "previewing" : "backfilling"} discountPercentage...\n`);

    await migrate();

    console.log("\nDone.");
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("DB disconnected.");
  }
}

run();
