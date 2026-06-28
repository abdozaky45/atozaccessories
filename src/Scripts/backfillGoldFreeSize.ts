import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import ProductVariantModel from "../Model/ProductVariant/ProductVariantModel";
import ColorModel from "../Model/Colors/ColorModel";
import SizeModel from "../Model/Sizes/SizeModel";

// ─── Backfill Gold color + free-size on every variant ────────────────────────────
//
// Every product currently owns a single variant with no color / size (the
// "simple" null/null variant). The catalog is moving to a model where every
// variant must carry color = "Gold" and size = "free size" (both already exist
// in the DB as the only color / size). This stamps those two refs onto EVERY
// ProductVariant document.
//
// The Gold color and free-size size are resolved at runtime:
//   • by hardcoded _id  →  if you paste them in GOLD_COLOR_ID / FREE_SIZE_ID below
//   • otherwise by name →  Color.name == "Gold"  /  Size.number ~ /^free\s*size$/i
//
// Safe to re-run: variants that already point at (Gold, free size) are skipped.
// Each variant is updated individually so a duplicate-key clash on the unique
// { product, color, size } index (a product that has >1 variant) is reported
// instead of aborting the whole run.
//
// Run with:  npm run migrate:gold-freesize

const DB_URL = process.env.DB_URL ?? "";

// Optional: paste the exact ObjectIds here to skip the name lookup.
const GOLD_COLOR_ID = "";
const FREE_SIZE_ID = "";

async function resolveColorId(): Promise<string> {
  if (GOLD_COLOR_ID) {
    const byId = await ColorModel.findById(GOLD_COLOR_ID).select("_id name").lean();
    if (!byId) throw new Error(`No Color found for GOLD_COLOR_ID="${GOLD_COLOR_ID}"`);
    console.log(`Color resolved by id: "${(byId as any).name}" (${byId._id})`);
    return String(byId._id);
  }

  const byName = await ColorModel.findOne({ name: { $regex: /^gold$/i } })
    .select("_id name")
    .lean();
  if (!byName) throw new Error('No Color found with name "Gold". Paste its _id in GOLD_COLOR_ID.');
  console.log(`Color resolved by name: "${(byName as any).name}" (${byName._id})`);
  return String(byName._id);
}

async function resolveSizeId(): Promise<string> {
  if (FREE_SIZE_ID) {
    const byId = await SizeModel.findById(FREE_SIZE_ID).select("_id number").lean();
    if (!byId) throw new Error(`No Size found for FREE_SIZE_ID="${FREE_SIZE_ID}"`);
    console.log(`Size resolved by id: "${(byId as any).number}" (${byId._id})`);
    return String(byId._id);
  }

  const byNumber = await SizeModel.findOne({ number: { $regex: /^free\s*size$/i } })
    .select("_id number")
    .lean();
  if (!byNumber)
    throw new Error('No Size found with number "free size". Paste its _id in FREE_SIZE_ID.');
  console.log(`Size resolved by name: "${(byNumber as any).number}" (${byNumber._id})`);
  return String(byNumber._id);
}

async function migrate() {
  const colorId = await resolveColorId();
  const sizeId = await resolveSizeId();
  console.log("");

  const variants = await ProductVariantModel.find({})
    .select("_id product color size")
    .lean();
  console.log(`Total variants: ${variants.length}`);

  let updated = 0;
  let alreadyCorrect = 0;
  const conflicts: { variant: string; reason: string }[] = [];

  for (const v of variants as any[]) {
    if (String(v.color) === colorId && String(v.size) === sizeId) {
      alreadyCorrect++;
      continue;
    }

    try {
      await ProductVariantModel.updateOne(
        { _id: v._id },
        { $set: { color: colorId, size: sizeId } }
      );
      updated++;
    } catch (err: any) {
      // Duplicate key on { product, color, size } → product already has a
      // (Gold, free size) variant, so this extra one can't collapse into it.
      conflicts.push({
        variant: String(v._id),
        reason: err?.code === 11000 ? "duplicate (Gold, free size) for this product" : err?.message,
      });
    }
  }

  console.log(`\nVariants updated:        ${updated}`);
  console.log(`Already correct (skipped): ${alreadyCorrect}`);
  console.log(`Conflicts (not updated):   ${conflicts.length}`);
  if (conflicts.length) {
    console.log("\nConflicting variants:");
    for (const c of conflicts) console.log(`  - ${c.variant}: ${c.reason}`);
  }
}

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in environment variables.");
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(DB_URL);
    console.log("DB connected — backfilling Gold color + free size on variants...\n");

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
