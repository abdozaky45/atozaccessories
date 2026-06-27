import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import ProductModel from "../Model/Product/ProductModel";
import ProductVariantModel from "../Model/ProductVariant/ProductVariantModel";
import OrderModel from "../Model/Order/OrderModel";

// ─── Pre-deploy READ-ONLY audit ─────────────────────────────────────────────────
//
// Compares the NEW code models against the REAL production data and reports every
// gap that the new code introduces, so we know exactly which migration scripts
// must run BEFORE deploying. This script ONLY reads — it never writes/updates a
// single document. Run it as many times as you like.
//
// New things the code added that old data does not have:
//   • product.finalPrice      → USED by price filter (minPrice/maxPrice) + price sort
//                               + Home/listings display. Missing = product vanishes
//                               from price filtering & shows no price. (CRITICAL)
//   • product.wholesalePrice  → new business field, optional. Missing = fine.
//   • product.isBestSeller    → optional. Missing = treated as "not bestseller". Fine.
//   • ProductVariant docs     → stock now lives in variants. A product with 0 variants
//                               is UN-ORDERABLE. (CRITICAL)
//   • new Order schema        → embedded snapshots + variantId. Legacy orders need
//                               the migrate:orders conversion. (CRITICAL if old orders)
//
// Run with:  npx ts-node src/Scripts/auditPreDeploy.ts

const DB_URL = process.env.DB_URL ?? "";

const pct = (n: number, total: number) =>
  total === 0 ? "0%" : `${((n / total) * 100).toFixed(1)}%`;

const line = () => console.log("─".repeat(64));

// Same legacy detector used by migrateLegacyOrders.ts
const isLegacyOrder = (o: any): boolean =>
  !!o && (o.price !== undefined || !o.shipping || o.shipping.name === undefined);

async function audit() {
  // ── PRODUCTS ──────────────────────────────────────────────────────────────
  line();
  console.log("PRODUCTS");
  line();

  const products = await ProductModel.find({})
    .select("_id price salePrice finalPrice wholesalePrice isBestSeller isDeleted isSoldOut availableItems")
    .lean();

  const totalProducts = products.length;
  const activeProducts = products.filter((p: any) => p.isDeleted !== true);

  let missingFinalPrice = 0;
  let wrongFinalPrice = 0;
  let missingWholesale = 0;
  let missingIsBestSeller = 0;

  for (const p of products as any[]) {
    const expectedFinal = p.salePrice ? p.salePrice : p.price;
    if (p.finalPrice === undefined || p.finalPrice === null) missingFinalPrice++;
    else if (p.finalPrice !== expectedFinal) wrongFinalPrice++;

    if (p.wholesalePrice === undefined || p.wholesalePrice === null) missingWholesale++;
    if (p.isBestSeller === undefined || p.isBestSeller === null) missingIsBestSeller++;
  }

  console.log(`Total products:                 ${totalProducts}`);
  console.log(`  active (not deleted):         ${activeProducts.length}`);
  console.log("");
  console.log(`Missing finalPrice  (CRITICAL): ${missingFinalPrice}  (${pct(missingFinalPrice, totalProducts)})`);
  console.log(`Wrong   finalPrice  (CRITICAL): ${wrongFinalPrice}  (finalPrice != salePrice||price)`);
  console.log(`Missing wholesalePrice (info):  ${missingWholesale}  (${pct(missingWholesale, totalProducts)})  — optional, safe`);
  console.log(`Missing isBestSeller   (info):  ${missingIsBestSeller}  (${pct(missingIsBestSeller, totalProducts)})  — optional, safe`);

  // ── VARIANTS ──────────────────────────────────────────────────────────────
  line();
  console.log("VARIANTS");
  line();

  const totalVariants = await ProductVariantModel.countDocuments({});
  const productIdsWithVariants = await ProductVariantModel.distinct("product");
  const withVariantsSet = new Set(productIdsWithVariants.map((id: any) => id.toString()));

  const productsWithoutVariants = products.filter(
    (p: any) => !withVariantsSet.has(p._id.toString())
  );
  const activeWithoutVariants = productsWithoutVariants.filter((p: any) => p.isDeleted !== true);

  // Orphan variants — point at a product that no longer exists.
  const allProductIdSet = new Set(products.map((p: any) => p._id.toString()));
  const orphanVariants = productIdsWithVariants.filter(
    (id: any) => !allProductIdSet.has(id.toString())
  ).length;

  console.log(`Total variants:                          ${totalVariants}`);
  console.log(`Products WITHOUT any variant (CRITICAL): ${productsWithoutVariants.length}  (un-orderable)`);
  console.log(`  of which ACTIVE (not deleted):         ${activeWithoutVariants.length}`);
  console.log(`Orphan variants (product missing):       ${orphanVariants}`);

  // ── ORDERS ────────────────────────────────────────────────────────────────
  line();
  console.log("ORDERS");
  line();

  const rawOrders = await OrderModel.collection.find({}).toArray();
  const totalOrders = rawOrders.length;
  const legacyOrders = rawOrders.filter(isLegacyOrder).length;

  // New-schema orders whose product lines miss the now-required variantId.
  let ordersMissingVariantId = 0;
  for (const o of rawOrders as any[]) {
    if (isLegacyOrder(o)) continue;
    const prods = o.products ?? [];
    if (prods.some((pl: any) => !pl.variantId)) ordersMissingVariantId++;
  }

  console.log(`Total orders:                              ${totalOrders}`);
  console.log(`Legacy orders (need migrate:orders):       ${legacyOrders}  (${pct(legacyOrders, totalOrders)})`);
  console.log(`New-schema orders missing variantId:       ${ordersMissingVariantId}`);

  // ── VERDICT ───────────────────────────────────────────────────────────────
  line();
  console.log("VERDICT — scripts to run before deploy");
  line();

  const steps: string[] = [];
  if (activeWithoutVariants.length > 0 || productsWithoutVariants.length > 0)
    steps.push(`1) npm run migrate:variants   → backfill ${productsWithoutVariants.length} product(s) with a simple variant`);
  if (missingFinalPrice > 0 || wrongFinalPrice > 0)
    steps.push(`2) finalPrice backfill        → fix ${missingFinalPrice + wrongFinalPrice} product(s)  (NO script exists yet — see note)`);
  if (legacyOrders > 0)
    steps.push(`3) npm run migrate:orders     → convert ${legacyOrders} legacy order(s)`);
  if (ordersMissingVariantId > 0)
    steps.push(`4) npm run migrate:order-variants → backfill variantId on ${ordersMissingVariantId} order(s)`);

  if (steps.length === 0) {
    console.log("✅ No migrations needed — data already matches the new models.");
  } else {
    steps.forEach((s) => console.log(s));
    console.log("");
    console.log("Run the migrations, then re-run this audit until it prints ✅.");
  }
  line();
}

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in environment variables.");
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(DB_URL);
    console.log("DB connected — running READ-ONLY pre-deploy audit...\n");

    await audit();
  } catch (error) {
    console.error("Audit failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDB disconnected.");
  }
}

run();
