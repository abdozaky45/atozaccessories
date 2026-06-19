import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import ProductModel from "../Model/Product/ProductModel";
import ColorModel from "../Model/Colors/ColorModel";
import SizeModel from "../Model/Sizes/SizeModel";
import ProductVariantModel from "../Model/ProductVariant/ProductVariantModel";

// ─── Realistic variant seeding (for demo / testing) ─────────────────────────────
//
// Gives every active product 5 DIVERSE variants — each a different colour AND a
// different size (so all 5 colours and all 5 sizes appear once). Stock is varied
// and realistic (not a flat number); a few variants land on 0 so sold-out states
// are testable. Each product's `availableItems` is set to the sum of its variants
// and `isSoldOut` is derived from it.
//
// Destructive + re-runnable: wipes existing variants first, then recreates.
//
// Run with:  npx ts-node src/Scripts/seedRealisticVariants.ts

const DB_URL = process.env.DB_URL ?? "";

// Diagonal pairing → maximum variety (each colour & size used once).
const PAIRS: Array<[string, string]> = [
  ["White", "XXS"],
  ["Black", "XS"],
  ["Red", "S"],
  ["Dark Red", "M"],
  ["Blue", "L"],
];

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Realistic stock: mostly 2–14, with ~12% chance of a sold-out (0) variant.
const realisticStock = () => (Math.random() < 0.12 ? 0 : randInt(2, 14));

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in environment variables.");
    process.exit(1);
  }

  mongoose.set("strictQuery", false);
  await mongoose.connect(DB_URL);
  console.log("DB connected — seeding realistic variants...\n");

  try {
    const colorNames = [...new Set(PAIRS.map((p) => p[0]))];
    const sizeNumbers = [...new Set(PAIRS.map((p) => p[1]))];

    const colors = await ColorModel.find({ name: { $in: colorNames } }).select("_id name").lean();
    const sizes = await SizeModel.find({ number: { $in: sizeNumbers } }).select("_id number").lean();

    const colorId = new Map(colors.map((c: any) => [c.name, c._id]));
    const sizeId = new Map(sizes.map((s: any) => [s.number, s._id]));

    for (const [c, s] of PAIRS) {
      if (!colorId.has(c)) throw new Error(`Missing colour: ${c}`);
      if (!sizeId.has(s)) throw new Error(`Missing size: ${s}`);
    }

    const products = await ProductModel.find({ isDeleted: { $ne: true } }).select("_id").lean();
    console.log(`Active products: ${products.length}`);

    // 1. Clean slate — remove all existing variants.
    const del = await ProductVariantModel.deleteMany({});
    console.log(`Deleted existing variants: ${del.deletedCount}`);

    // 2. Build 5 diverse variants per product with realistic, varied stock.
    const variantDocs: any[] = [];
    const productStock = new Map<string, number>();

    for (const product of products) {
      let total = 0;
      for (const [c, s] of PAIRS) {
        const stock = realisticStock();
        total += stock;
        variantDocs.push({
          product: product._id,
          color: colorId.get(c),
          size: sizeId.get(s),
          availableItems: stock,
        });
      }
      productStock.set(product._id.toString(), total);
    }

    const inserted = await ProductVariantModel.insertMany(variantDocs, { ordered: false });
    console.log(`Inserted variants: ${inserted.length} (${PAIRS.length}/product)`);

    // 3. Sync each product's availableItems + isSoldOut from its variants.
    const stockOps = [...productStock.entries()].map(([id, total]) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { availableItems: total, isSoldOut: total === 0 } },
      },
    }));

    let updated = 0;
    let soldOut = 0;
    const BATCH = 1000;
    for (let i = 0; i < stockOps.length; i += BATCH) {
      const res = await ProductModel.bulkWrite(stockOps.slice(i, i + BATCH), { ordered: false });
      updated += res.modifiedCount ?? 0;
    }
    productStock.forEach((t) => { if (t === 0) soldOut++; });

    console.log(`Products updated: ${updated}`);
    console.log(`Products now sold out (all variants 0): ${soldOut}`);
    console.log("\nDone.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("DB disconnected.");
  }
}

run();
