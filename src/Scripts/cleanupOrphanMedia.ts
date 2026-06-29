import dns from "dns";
import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
  _Object,
} from "@aws-sdk/client-s3";

import { extractKey } from "../Utils/Cdn";
import CategoryModel from "../Model/Categories/CategoryModel";
import OfferModel from "../Model/Offers/OfferModel";
import ProductModel from "../Model/Product/ProductModel";
import ImageSliderModel from "../Model/ImageSlider/ImageSliderModel";

/**
 * Deletes media objects that live on S3 (the primary media bucket — NOT the
 * MongoDB backups bucket) but are no longer referenced anywhere in the DB.
 *
 *   Dry-run (default, deletes nothing):  npx ts-node src/Scripts/cleanupOrphanMedia.ts
 *   Apply (actually deletes orphans):    npx ts-node src/Scripts/cleanupOrphanMedia.ts --apply
 *   Scope to a folder prefix:            npx ts-node src/Scripts/cleanupOrphanMedia.ts --prefix=imageSlider/
 *
 * URLs are stored as CloudFront *or* S3 — both are normalised to the S3 object
 * key via extractKey(), so a referenced object is matched regardless of form.
 * Every dry-run writes the full orphan list to orphan-media-<timestamp>.json
 * for review before you run with --apply.
 *
 * Targets process.env.AWS_BUCKET_NAME in process.env.AWS_REGION. The backups
 * bucket (atoz-mongo-backups) is a different bucket and is never touched.
 */

const DB_URL = process.env.DB_URL ?? "";
const BUCKET = process.env.AWS_BUCKET_NAME ?? "";
const REGION = process.env.AWS_REGION ?? "";
const APPLY = process.argv.includes("--apply");
const PREFIX =
  (process.argv.find((a) => a.startsWith("--prefix=")) ?? "").split("=")[1] || "";

// Abort the delete if the orphan share of the bucket is suspiciously high — a
// likely sign of an empty/partial DB read or wrong bucket. Override with --force.
const FORCE = process.argv.includes("--force");
const MAX_ORPHAN_RATIO = 0.9;

const client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
};

/** Collect every S3 object key currently referenced by a document in the DB. */
async function collectUsedKeys(): Promise<Set<string>> {
  const used = new Set<string>();
  const add = (url?: string) => {
    if (!url) return;
    const key = extractKey(url);
    if (key) used.add(key);
  };

  for (const d of await CategoryModel.find({}).lean<any[]>()) add(d.image?.mediaUrl);
  for (const d of await OfferModel.find({}).lean<any[]>()) add(d.image?.mediaUrl);
  for (const d of await ProductModel.find({}).lean<any[]>()) {
    add(d.defaultImage?.mediaUrl);
    if (Array.isArray(d.albumImages)) for (const img of d.albumImages) add(img?.mediaUrl);
  }
  for (const d of await ImageSliderModel.find({}).lean<any[]>()) {
    add(d.images?.image1?.mediaUrl);
    add(d.images?.image2?.mediaUrl);
  }

  return used;
}

/** List every object in the primary media bucket (optionally under a prefix). */
async function listAllObjects(): Promise<_Object[]> {
  const objects: _Object[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: PREFIX || undefined,
        ContinuationToken: token,
      })
    );
    if (res.Contents) objects.push(...res.Contents);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  // Drop "folder" placeholder keys (zero-byte keys ending in "/").
  return objects.filter((o) => o.Key && !o.Key.endsWith("/"));
}

/** Delete keys in batches of up to 1000 (S3 DeleteObjects limit). */
async function deleteKeys(keys: string[]): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    const res = await client.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      })
    );
    deleted += chunk.length - (res.Errors?.length ?? 0);
    if (res.Errors?.length) {
      for (const e of res.Errors) console.error(`  ! ${e.Key}: ${e.Code} ${e.Message}`);
    }
  }
  return deleted;
}

async function run() {
  if (!DB_URL) { console.error("DB_URL is not set. Aborting."); process.exit(1); }
  if (!BUCKET) { console.error("AWS_BUCKET_NAME is not set. Aborting."); process.exit(1); }
  if (!REGION) { console.error("AWS_REGION is not set. Aborting."); process.exit(1); }

  await mongoose.connect(DB_URL);
  console.log("DB connected.");
  console.log(`Bucket: ${BUCKET}   Region: ${REGION}   Prefix: ${PREFIX || "(whole bucket)"}`);
  console.log(`Mode: ${APPLY ? "APPLY (will delete)" : "DRY-RUN (no deletes)"}\n`);

  const used = await collectUsedKeys();
  console.log(`Referenced in DB: ${used.size} unique keys`);

  if (used.size === 0) {
    console.error("\nNo referenced keys found in the DB. Refusing to proceed — this");
    console.error("would treat every object as an orphan. Check DB_URL / models.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const objects = await listAllObjects();
  console.log(`On S3${PREFIX ? ` under "${PREFIX}"` : ""}: ${objects.length} objects\n`);

  const orphans = objects.filter((o) => !used.has(o.Key!));
  const orphanBytes = orphans.reduce((sum, o) => sum + (o.Size ?? 0), 0);
  const ratio = objects.length ? orphans.length / objects.length : 0;

  console.log(`Orphans (on S3, not in DB): ${orphans.length} objects, ${formatBytes(orphanBytes)}`);
  for (const o of orphans.slice(0, 20)) console.log(`  - ${o.Key}  (${formatBytes(o.Size ?? 0)})`);
  if (orphans.length > 20) console.log(`  ... and ${orphans.length - 20} more`);

  // Persist the full list for review/audit.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.resolve(process.cwd(), `orphan-media-${stamp}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        bucket: BUCKET,
        region: REGION,
        prefix: PREFIX || null,
        generatedAt: new Date().toISOString(),
        totalOnS3: objects.length,
        referencedInDb: used.size,
        orphanCount: orphans.length,
        orphanBytes,
        orphans: orphans.map((o) => ({ key: o.Key, size: o.Size, lastModified: o.LastModified })),
      },
      null,
      2
    )
  );
  console.log(`\nFull orphan list written to: ${outFile}`);

  if (orphans.length === 0) {
    console.log("\nNothing to delete. Bucket is clean.");
    await mongoose.disconnect();
    process.exit(0);
  }

  if (!APPLY) {
    console.log("\nDRY-RUN: nothing deleted. Review the list above, then re-run with --apply.");
    await mongoose.disconnect();
    process.exit(0);
  }

  if (ratio > MAX_ORPHAN_RATIO && !FORCE) {
    console.error(
      `\nSafety stop: ${(ratio * 100).toFixed(1)}% of objects look orphaned ` +
        `(> ${MAX_ORPHAN_RATIO * 100}%).`
    );
    console.error("This often means a wrong bucket or an incomplete DB read.");
    console.error("If this is genuinely correct, re-run with --apply --force.");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\nDeleting ${orphans.length} orphan objects from ${BUCKET} ...`);
  const deleted = await deleteKeys(orphans.map((o) => o.Key!));
  console.log(`Done. Deleted ${deleted}/${orphans.length} objects (${formatBytes(orphanBytes)} freed).`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
