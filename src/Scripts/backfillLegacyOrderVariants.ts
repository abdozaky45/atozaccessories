import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import OrderModel from "../Model/Order/OrderModel";
import ProductVariantModel from "../Model/ProductVariant/ProductVariantModel";

// ─── Backfill variantId on legacy order lines ───────────────────────────────────
//
// migrateLegacyOrders converted the order HEADERS to the new schema but, by design,
// left the product sub-documents untouched — so legacy lines still lack `variantId`
// (now a required field). That makes those orders un-saveable: any admin status
// change calls `order.save()`, which runs full validation and throws
// "variantId is required".
//
// Every product now owns exactly ONE simple variant (from backfillSimpleVariants),
// so each legacy line maps unambiguously: line.productId → that product's variant.
// This sets:  variantId = <product's single variant>,  size = "",  color = "".
//
// Only touches lines that are actually missing variantId. Safe to re-run.
//
// Run with:  npm run migrate:order-variants

const DB_URL = process.env.DB_URL ?? "";

async function migrate() {
  const orders = await OrderModel.collection.find({}).toArray();
  console.log(`Total orders: ${orders.length}`);

  // productId -> its single simple variant _id
  const variants = await ProductVariantModel.find({}).select("_id product").lean();
  const variantByProduct = new Map<string, any>();
  for (const v of variants as any[]) variantByProduct.set(v.product.toString(), v._id);

  let ordersUpdated = 0;
  let linesFixed = 0;
  let linesSkipped = 0;
  let linesNoVariant = 0;

  for (const order of orders as any[]) {
    const lines = order.products ?? [];
    let changed = false;

    for (const line of lines) {
      if (line.variantId) {
        linesSkipped++;
        continue;
      }

      const pid = line.productId?.toString();
      const variantId = pid ? variantByProduct.get(pid) : undefined;

      if (!variantId) {
        linesNoVariant++;
        continue; // cannot map — leave as-is (reported below)
      }

      line.variantId = variantId;
      if (line.size === undefined || line.size === null) line.size = "";
      if (line.color === undefined || line.color === null) line.color = "";
      changed = true;
      linesFixed++;
    }

    if (changed) {
      await OrderModel.collection.updateOne(
        { _id: order._id },
        { $set: { products: lines } }
      );
      ordersUpdated++;
    }
  }

  console.log(`\nOrders updated:        ${ordersUpdated}`);
  console.log(`Lines fixed:           ${linesFixed}`);
  console.log(`Lines already OK:      ${linesSkipped}`);
  console.log(`Lines with NO variant: ${linesNoVariant}  (expect 0 — would need manual review)`);
}

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in environment variables.");
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(DB_URL);
    console.log("DB connected — backfilling legacy order variants...\n");

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
