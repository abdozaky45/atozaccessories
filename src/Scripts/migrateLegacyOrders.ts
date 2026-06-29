import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import OrderModel from "../Model/Order/OrderModel";
import ShippingModel from "../Model/Shipping/ShippingModel";
import UserModel from "../Model/User/UserInformation/UserModel";

// ─── Legacy order migration ─────────────────────────────────────────────────────
//
// Converts orders that were created under the OLD schema, where:
//   • `userInformation` was an ObjectId reference (now an embedded snapshot)
//   • `shipping`         was an ObjectId reference (now { name, cost })
//   • a single `price`   held the total (now subTotal/discount/shippingCost/totalAmount)
//
// For each legacy order this resolves the referenced Shipping/UserInformation docs
// into embedded snapshots and maps `price` → subTotal/shippingCost/totalAmount.
//
// Safe to re-run: orders already in the new format are detected and skipped.
// Uses the raw collection driver so it does NOT touch (or re-validate) the legacy
// product subdocuments, which lack the now-required variantId/size/color fields.
//
// Run with:  npm run migrate:orders

const DB_URL = process.env.DB_URL ?? "";

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const isLegacy = (o: any): boolean =>
  !!o && (o.price !== undefined || !o.shipping || o.shipping.name === undefined);

async function migrate() {
  const orders = await OrderModel.find({}).lean();
  const legacy = orders.filter(isLegacy);

  console.log(`Total orders: ${orders.length} — legacy to migrate: ${legacy.length}`);

  let migrated = 0;
  let missingShipping = 0;
  let missingUserInfo = 0;

  for (const order of legacy) {
    const shipDoc: any = order.shipping
      ? await ShippingModel.findById(order.shipping).lean()
      : null;
    const uiDoc: any = order.userInformation
      ? await UserModel.findById(order.userInformation).lean()
      : null;

    if (!shipDoc) missingShipping++;
    if (!uiDoc) missingUserInfo++;

    const shipping = { name: shipDoc?.category ?? "", cost: shipDoc?.cost ?? 0 };
    const userInformation = uiDoc
      ? {
          firstName: uiDoc.firstName,
          lastName: uiDoc.lastName,
          address: uiDoc.address,
          primaryPhone: uiDoc.primaryPhone,
          secondaryPhone: uiDoc.secondaryPhone,
          country: uiDoc.country,
          postalCode: uiDoc.postalCode,
        }
      : (order as any).userInformation; // leave the raw value if the doc no longer exists

    const subTotal = round2((order as any).subTotal ?? (order as any).price ?? 0);
    const discount = (order as any).discount ?? 0;
    const freeShipping = (order as any).freeShipping ?? false;
    const shippingCost = (order as any).shippingCost ?? shipping.cost;
    const totalAmount = round2(
      (order as any).totalAmount ?? subTotal - discount + (freeShipping ? 0 : shippingCost)
    );

    await OrderModel.collection.updateOne(
      { _id: order._id },
      {
        $set: {
          userInformation,
          shipping,
          subTotal,
          discount,
          freeShipping,
          shippingCost,
          totalAmount,
          appliedOffer: (order as any).appliedOffer ?? null,
          appliedFlashOffers: (order as any).appliedFlashOffers ?? [],
        },
        $unset: { price: "" },
      }
    );
    migrated++;
  }

  console.log(`\nMigrated: ${migrated}`);
  console.log(`Legacy orders whose Shipping doc was missing:         ${missingShipping}`);
  console.log(`Legacy orders whose UserInformation doc was missing:  ${missingUserInfo}`);
}

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in environment variables.");
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(DB_URL);
    console.log("DB connected — migrating legacy orders...\n");

    await migrate();

    console.log("\nMigration complete.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("DB disconnected.");
  }
}

run();
