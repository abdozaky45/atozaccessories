import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import ProductModel from "../Model/Product/ProductModel";
import ProductVariantModel from "../Model/ProductVariant/ProductVariantModel";

// ─── Backfill "simple" variants ─────────────────────────────────────────────────
//
// The catalog moved to a variant-only stock model: every product owns its stock
// through at least one ProductVariant. Products created under the OLD model kept
// their stock in `product.availableItems` and have NO variants, which makes them
// un-orderable (the order flow always references a variantId).
//
// For each such product this creates ONE "simple" variant:
//   { product, color: null, size: null, availableItems: product.availableItems }
//
// Then it re-syncs `product.availableItems` / `isSoldOut` from the variant total.
// Safe to re-run: products that already have variants are skipped.
//
// Run with:  npm run migrate:variants

const DB_URL = process.env.DB_URL ?? "";

async function migrate() {
  const products = await ProductModel.find({}).select("_id availableItems").lean();
  console.log(`Total products: ${products.length}`);

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    const variantCount = await ProductVariantModel.countDocuments({ product: product._id });
    if (variantCount > 0) {
      skipped++;
      continue;
    }

    const stock = (product as any).availableItems ?? 0;

    await ProductVariantModel.create({
      product: product._id,
      color: null,
      size: null,
      availableItems: stock,
    });

    // Keep the product mirror consistent with its (now single) variant.
    await ProductModel.findByIdAndUpdate(product._id, {
      availableItems: stock,
      isSoldOut: stock <= 0,
    });

    created++;
  }

  console.log(`\nSimple variants created: ${created}`);
  console.log(`Products skipped (already had variants): ${skipped}`);
}

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in environment variables.");
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(DB_URL);
    console.log("DB connected — backfilling simple variants...\n");

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
