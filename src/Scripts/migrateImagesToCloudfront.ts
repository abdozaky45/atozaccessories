import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { rewriteToCdn } from "../Utils/Cdn";
import CategoryModel from "../Model/Categories/CategoryModel";
import OfferModel from "../Model/Offers/OfferModel";
import ProductModel from "../Model/Product/ProductModel";
import ImageSliderModel from "../Model/ImageSlider/ImageSliderModel";

/**
 * Rewrites every stored S3 `mediaUrl` to its CloudFront equivalent.
 *
 *   Dry-run (default, no writes):  npx ts-node src/Scripts/migrateImagesToCloudfront.ts
 *   Apply changes:                 npx ts-node src/Scripts/migrateImagesToCloudfront.ts --apply
 *
 * Idempotent: URLs already pointing at CloudFront (or unrecognised) are skipped.
 * Requires CLOUDFRONT_URL and AWS_BUCKET_NAME in the environment.
 */

const DB_URL = process.env.DB_URL ?? "";
const APPLY = process.argv.includes("--apply");

let totalChanged = 0;

const logChange = (label: string, id: unknown, oldUrl: string, newUrl: string) => {
  console.log(`  [${label}] ${id}\n    - ${oldUrl}\n    + ${newUrl}`);
};

type BulkOp = { updateOne: { filter: any; update: any } };

async function migrateCategories() {
  const docs: any[] = await CategoryModel.find({ "image.mediaUrl": { $exists: true } });
  const ops: BulkOp[] = [];
  for (const doc of docs) {
    const oldUrl: string = doc.image?.mediaUrl;
    const newUrl = rewriteToCdn(oldUrl);
    if (oldUrl && newUrl !== oldUrl) {
      logChange("Category", doc._id, oldUrl, newUrl);
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { "image.mediaUrl": newUrl } } } });
    }
  }
  if (APPLY && ops.length) await CategoryModel.bulkWrite(ops);
  console.log(`Categories: ${ops.length} to update`);
  totalChanged += ops.length;
}

async function migrateOffers() {
  const docs: any[] = await OfferModel.find({ "image.mediaUrl": { $exists: true } });
  const ops: BulkOp[] = [];
  for (const doc of docs) {
    const oldUrl: string = doc.image?.mediaUrl;
    const newUrl = rewriteToCdn(oldUrl);
    if (oldUrl && newUrl !== oldUrl) {
      logChange("Offer", doc._id, oldUrl, newUrl);
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { "image.mediaUrl": newUrl } } } });
    }
  }
  if (APPLY && ops.length) await OfferModel.bulkWrite(ops);
  console.log(`Offers: ${ops.length} to update`);
  totalChanged += ops.length;
}

async function migrateProducts() {
  const docs: any[] = await ProductModel.find({});
  const ops: BulkOp[] = [];
  for (const doc of docs) {
    const set: Record<string, string> = {};

    const oldDefault: string | undefined = doc.defaultImage?.mediaUrl;
    if (oldDefault) {
      const n = rewriteToCdn(oldDefault);
      if (n !== oldDefault) set["defaultImage.mediaUrl"] = n;
    }

    if (Array.isArray(doc.albumImages)) {
      doc.albumImages.forEach((img: any, i: number) => {
        const oldUrl: string | undefined = img?.mediaUrl;
        if (oldUrl) {
          const n = rewriteToCdn(oldUrl);
          if (n !== oldUrl) set[`albumImages.${i}.mediaUrl`] = n;
        }
      });
    }

    if (Object.keys(set).length) {
      Object.entries(set).forEach(([path, val]) =>
        logChange(`Product.${path}`, doc._id, "(s3)", val)
      );
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
    }
  }
  if (APPLY && ops.length) await ProductModel.bulkWrite(ops);
  console.log(`Products: ${ops.length} to update`);
  totalChanged += ops.length;
}

async function migrateSliders() {
  const docs: any[] = await ImageSliderModel.find({});
  const ops: BulkOp[] = [];
  for (const doc of docs) {
    const set: Record<string, string> = {};
    for (const slot of ["image1", "image2"]) {
      const oldUrl: string | undefined = doc.images?.[slot]?.mediaUrl;
      if (oldUrl) {
        const n = rewriteToCdn(oldUrl);
        if (n !== oldUrl) set[`images.${slot}.mediaUrl`] = n;
      }
    }
    if (Object.keys(set).length) {
      Object.entries(set).forEach(([path, val]) =>
        logChange(`ImageSlider.${path}`, doc._id, "(s3)", val)
      );
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
    }
  }
  if (APPLY && ops.length) await ImageSliderModel.bulkWrite(ops);
  console.log(`ImageSliders: ${ops.length} to update`);
  totalChanged += ops.length;
}

async function run() {
  if (!process.env.CLOUDFRONT_URL) {
    console.error("CLOUDFRONT_URL is not set. Aborting.");
    process.exit(1);
  }
  if (!DB_URL) {
    console.error("DB_URL is not set. Aborting.");
    process.exit(1);
  }

  await mongoose.connect(DB_URL);
  console.log(`DB connected. CDN base: ${process.env.CLOUDFRONT_URL}`);
  console.log(`Mode: ${APPLY ? "APPLY (writing changes)" : "DRY-RUN (no writes)"}\n`);

  await migrateCategories();
  await migrateOffers();
  await migrateProducts();
  await migrateSliders();

  console.log(`\nTotal documents ${APPLY ? "updated" : "needing update"}: ${totalChanged}`);
  if (!APPLY) console.log("Re-run with --apply to write these changes.");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
