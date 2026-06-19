import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import OfferModel from "../Model/Offers/OfferModel";
import ProductModel from "../Model/Product/ProductModel";
import CategoryModel from "../Model/Categories/CategoryModel";

// ─── Offer seeding (new schema) ─────────────────────────────────────────────────
//
// Wipes the legacy offers (old `type`/reward shape, no `status`) and seeds the
// current offer engine's types, all with status "active" so they apply immediately.
//
// Run with:  npx ts-node src/Scripts/seedOffers.ts

const DB_URL = process.env.DB_URL ?? "";

// Required placeholder image (schema needs mediaKey + mediaUrl).
const IMG = {
  mediaKey: "offers/placeholder.jpg",
  mediaUrl: "https://atozaccessories.s3.amazonaws.com/offers/placeholder.jpg",
};

const base = {
  isActive: true,
  status: "active" as const,
  image: IMG,
  timing: { startDate: null as Date | null, endDate: null as Date | null },
  condition: { minQuantity: null as number | null, minAmount: null as number | null, excludedCategories: [] as any[] },
  reward: { discountPercentage: null as number | null, freeItemMaxValue: null as number | null },
  targetProducts: [] as any[],
  targetCategories: [] as any[],
};

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in environment variables.");
    process.exit(1);
  }

  mongoose.set("strictQuery", false);
  await mongoose.connect(DB_URL);
  console.log("DB connected — seeding offers...\n");

  try {
    // Real IDs we need: one category to exclude, two products for flash sales.
    const excludedCategory = await CategoryModel.findOne({}).select("_id categoryName").lean();
    const products = await ProductModel.find({ isDeleted: { $ne: true } })
      .select("_id productName finalPrice price")
      .limit(2)
      .lean();

    if (!excludedCategory) throw new Error("No category found to use as excludedCategory.");
    if (products.length < 2) throw new Error("Need at least 2 products for flash sales.");

    const [p1, p2] = products as any[];
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    const offers: any[] = [
      // 1) Buy N, cheapest free — with category exclusion
      {
        ...base,
        title: "اشتري 3 قطع وخد الأقل سعراً هدية",
        description: "اشترِ 3 قطع أو أكثر واحصل على أرخص قطعة مجاناً (باستثناء فئة محددة).",
        offerType: "buy_x_get_cheapest_free",
        condition: { ...base.condition, minQuantity: 3, excludedCategories: [excludedCategory._id] },
      },
      // 2) Spend X, get Y% off
      {
        ...base,
        title: "اصرف 1000 جنيه وخد خصم 15%",
        description: "خصم 15% عند شراء بقيمة 1000 جنيه أو أكثر.",
        offerType: "spend_x_get_discount",
        condition: { ...base.condition, minAmount: 1000 },
        reward: { ...base.reward, discountPercentage: 15 },
      },
      // 3) Spend X, free shipping
      {
        ...base,
        title: "اصرف 500 جنيه وخد شحن مجاني",
        description: "شحن مجاني عند شراء بقيمة 500 جنيه أو أكثر.",
        offerType: "spend_x_get_free_shipping",
        condition: { ...base.condition, minAmount: 500 },
      },
      // 4) Buy N, free shipping — with category exclusion
      {
        ...base,
        title: "اشتري 3 قطع وخد شحن مجاني",
        description: "شحن مجاني عند شراء 3 قطع أو أكثر (باستثناء فئة محددة).",
        offerType: "buy_x_get_free_shipping",
        condition: { ...base.condition, minQuantity: 3, excludedCategories: [excludedCategory._id] },
      },
      // 5) Buy one, get the cheapest other at half price
      {
        ...base,
        title: "اشتري قطعة وخد الأقل سعراً بنص السعر",
        description: "عند شراء قطعتين، احصل على الأرخص بنصف السعر.",
        offerType: "buy_x_get_half_price",
        condition: { ...base.condition, minQuantity: 2 },
      },
      // 6) Spend X, free gift up to value Y
      {
        ...base,
        title: "اصرف 800 جنيه وخد قطعة هدية قيمتها حتى 200",
        description: "عند الشراء بقيمة 800 جنيه، أغلى قطعة قيمتها حتى 200 جنيه تصبح مجانية.",
        offerType: "spend_x_get_free_item",
        condition: { ...base.condition, minAmount: 800 },
        reward: { ...base.reward, freeItemMaxValue: 200 },
      },
      // 7) Deal of the day — timed flash sale, big discount
      {
        ...base,
        title: "قطعة اليوم — خصم 50%",
        description: `خصم 50% على ${p1.productName} لمدة 24 ساعة فقط.`,
        offerType: "flash_sale",
        timing: { startDate: now, endDate: new Date(now.getTime() + dayMs) },
        reward: { ...base.reward, discountPercentage: 50 },
        targetProducts: [p1._id],
      },
      // 8) Flash sale — 50% off another product
      {
        ...base,
        title: "Flash Sale — خصم 50%",
        description: `خصم 50% على ${p2.productName} لفترة محدودة.`,
        offerType: "flash_sale",
        timing: { startDate: now, endDate: new Date(now.getTime() + 3 * dayMs) },
        reward: { ...base.reward, discountPercentage: 50 },
        targetProducts: [p2._id],
      },
    ];

    const del = await OfferModel.deleteMany({});
    console.log(`Deleted legacy offers: ${del.deletedCount}`);

    const created = await OfferModel.insertMany(offers);
    console.log(`Inserted offers: ${created.length}\n`);

    console.log("Flash-sale target products:");
    console.log(`  • Deal of day: ${p1.productName} — price ${p1.finalPrice ?? p1.price} → 50% = ${Math.round((p1.finalPrice ?? p1.price) * 0.5)}`);
    console.log(`  • Flash sale:  ${p2.productName} — price ${p2.finalPrice ?? p2.price} → 50% = ${Math.round((p2.finalPrice ?? p2.price) * 0.5)}`);
    console.log(`Excluded category (offers 1 & 4): ${(excludedCategory as any).categoryName} (${excludedCategory._id})`);

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
