import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import CategoryModel from "../Model/Categories/CategoryModel";
import OfferModel from "../Model/Offers/OfferModel";
import ProductModel from "../Model/Product/ProductModel";
import ImageSliderModel from "../Model/ImageSlider/ImageSliderModel";

/**
 * READ-ONLY audit of stored media URLs. Writes nothing.
 * Reports how each `mediaUrl` is stored (S3 vs CloudFront vs other/empty)
 * per collection+field, plus a couple of real samples.
 *
 *   npx ts-node src/Scripts/auditImageUrls.ts
 */

const DB_URL = process.env.DB_URL ?? "";
const BUCKET = process.env.AWS_BUCKET_NAME || "";
const CDN = (process.env.CLOUDFRONT_URL || "").replace(/\/+$/, "");

type Bucketed = { total: number; s3: number; cdn: number; other: number; empty: number; samples: string[] };

const newBucket = (): Bucketed => ({ total: 0, s3: 0, cdn: 0, other: 0, empty: 0, samples: [] });

const classify = (b: Bucketed, url?: string) => {
  b.total++;
  if (!url) { b.empty++; return; }
  if (CDN && url.startsWith(CDN + "/")) b.cdn++;
  else if (/amazonaws\.com/i.test(url) && url.includes(BUCKET)) b.s3++;
  else b.other++;
  if (b.samples.length < 2 && url) b.samples.push(url);
};

const rows: { key: string; b: Bucketed }[] = [];

async function audit(label: string, b: Bucketed) {
  rows.push({ key: label, b });
}

async function run() {
  if (!DB_URL) { console.error("DB_URL not set."); process.exit(1); }
  await mongoose.connect(DB_URL);
  console.log(`DB connected.`);
  console.log(`Bucket: ${BUCKET}   CDN: ${CDN || "(not set)"}\n`);

  // Categories.image.mediaUrl
  const cat = newBucket();
  for (const d of await CategoryModel.find({}).lean<any[]>()) classify(cat, d.image?.mediaUrl);
  await audit("Category.image", cat);

  // Offers.image.mediaUrl
  const off = newBucket();
  for (const d of await OfferModel.find({}).lean<any[]>()) classify(off, d.image?.mediaUrl);
  await audit("Offer.image", off);

  // Products.defaultImage.mediaUrl + albumImages[].mediaUrl
  const pdef = newBucket();
  const palb = newBucket();
  for (const d of await ProductModel.find({}).lean<any[]>()) {
    classify(pdef, d.defaultImage?.mediaUrl);
    if (Array.isArray(d.albumImages)) for (const img of d.albumImages) classify(palb, img?.mediaUrl);
  }
  await audit("Product.defaultImage", pdef);
  await audit("Product.albumImages[]", palb);

  // ImageSlider.images.image1/image2.mediaUrl
  const sl = newBucket();
  for (const d of await ImageSliderModel.find({}).lean<any[]>()) {
    classify(sl, d.images?.image1?.mediaUrl);
    classify(sl, d.images?.image2?.mediaUrl);
  }
  await audit("ImageSlider.image1/2", sl);

  // ---- table ----
  const headers = ["Field", "Total", "S3", "CloudFront", "Other", "Empty"];
  const data = rows.map((r) => [r.key, r.b.total, r.b.s3, r.b.cdn, r.b.other, r.b.empty].map(String));
  const widths = headers.map((h, i) => Math.max(h.length, ...data.map((row) => row[i].length)));
  const line = (cells: string[]) => "| " + cells.map((c, i) => c.padEnd(widths[i])).join(" | ") + " |";
  const sep = "|" + widths.map((w) => "-".repeat(w + 2)).join("|") + "|";

  console.log(line(headers));
  console.log(sep);
  for (const row of data) console.log(line(row));

  console.log("\nSamples:");
  for (const r of rows) {
    if (r.b.samples.length) {
      console.log(`  ${r.key}:`);
      for (const s of r.b.samples) console.log(`    ${s}`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
