import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import ProductModel from "../Model/Product/ProductModel";

// ─── Backfill product.finalPrice ────────────────────────────────────────────────
//
// `finalPrice` is a NEW field. The product listing/search uses it directly:
//   • price filter   → matchFilter.finalPrice = { $gte: minPrice, $lte: maxPrice }
//   • price sort     → sort({ finalPrice: 1 })
//   • Home/listings  → select("... finalPrice ...") for display
// Products created under the OLD model have NO finalPrice, so they silently drop
// out of price filtering, sort unpredictably, and show no price.
//
// The value mirrors what the create/update controller computes:
//   finalPrice = salePrice ? salePrice : price
//
// Safe to re-run: only products whose finalPrice is missing OR out of sync are
// updated; everything else is left untouched.
//
// Run with:  npm run migrate:final-price

const DB_URL = process.env.DB_URL ?? "";

async function migrate() {
  const products = await ProductModel.find({})
    .select("_id price salePrice finalPrice")
    .lean();

  console.log(`Total products: ${products.length}`);

  const ops: any[] = [];
  let alreadyCorrect = 0;

  for (const p of products as any[]) {
    const expected = p.salePrice ? p.salePrice : p.price;

    if (p.finalPrice === expected) {
      alreadyCorrect++;
      continue;
    }

    ops.push({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { finalPrice: expected } },
      },
    });
  }

  let updated = 0;
  const BATCH = 1000;
  for (let i = 0; i < ops.length; i += BATCH) {
    const res = await ProductModel.bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
    updated += res.modifiedCount ?? 0;
  }

  console.log(`\nfinalPrice set/fixed: ${updated}`);
  console.log(`Already correct (skipped): ${alreadyCorrect}`);
}

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in environment variables.");
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(DB_URL);
    console.log("DB connected — backfilling finalPrice...\n");

    await migrate();

    console.log("\nBackfill complete.");
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("DB disconnected.");
  }
}

run();
