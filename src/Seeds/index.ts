import dns from "dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
import ColorModel from "../Model/Colors/ColorModel";
import SizeModel from "../Model/Sizes/SizeModel";
import OfferModel from "../Model/Offers/OfferModel";
import colorsSeedData from "./data/colorsSeedData";
import sizesSeedData from "./data/sizesSeedData";

const DB_URL = process.env.DB_URL ?? "";

async function seedColors() {
  let inserted = 0;
  let skipped = 0;

  for (const item of colorsSeedData) {
    const exists = await ColorModel.findOne({ name: item.name });
    if (exists) {
      skipped++;
    } else {
      await ColorModel.create(item);
      inserted++;
    }
  }

  console.log(`Colors — inserted: ${inserted}, skipped (already exist): ${skipped}`);
}

async function seedSizes() {
  let inserted = 0;
  let skipped = 0;

  for (const item of sizesSeedData) {
    const exists = await SizeModel.findOne({ number: item.number });
    if (exists) {
      skipped++;
    } else {
      await SizeModel.create(item);
      inserted++;
    }
  }

  console.log(`Sizes  — inserted: ${inserted}, skipped (already exist): ${skipped}`);
}

const PRODUCT_ID = new mongoose.Types.ObjectId("69dd1d2ba8e689407a12cfd3");
const CATEGORY_ID = new mongoose.Types.ObjectId("69dd1b18a8e689407a12cf84");

const offersSeedData = [
  // buy_x_get_free — Case A
  {
    title: "Buy 3 Get 1 Free",
    description: "Add 3 items to your cart and get 1 specific item for free",
    isActive: true,
    image: { mediaKey: "offers/buy-3-get-1-free.jpg", mediaUrl: "https://YOUR_CDN/offers/buy-3-get-1-free.jpg" },
    offerType: "buy_x_get_free",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 3, minAmount: null, categories: [] },
    reward: { discountPercentage: null, freeItem: { product: PRODUCT_ID, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // buy_x_get_free — Case B
  {
    title: "Buy 5 Get 1 Free",
    description: "Add 5 items to your cart and get 1 specific item for free",
    isActive: false,
    image: { mediaKey: "offers/buy-5-get-1-free.jpg", mediaUrl: "https://YOUR_CDN/offers/buy-5-get-1-free.jpg" },
    offerType: "buy_x_get_free",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 5, minAmount: null, categories: [] },
    reward: { discountPercentage: null, freeItem: { product: PRODUCT_ID, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // percentage_discount — Case A
  {
    title: "10% Off Orders Above 500 EGP",
    description: "Get 10% discount on all orders above 500 EGP",
    isActive: true,
    image: { mediaKey: "offers/10-percent-off-500.jpg", mediaUrl: "https://YOUR_CDN/offers/10-percent-off-500.jpg" },
    offerType: "percentage_discount",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 500, categories: [] },
    reward: { discountPercentage: 10, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // percentage_discount — Case B
  {
    title: "20% Off Orders Above 1000 EGP",
    description: "Get 20% discount on all orders above 1000 EGP",
    isActive: true,
    image: { mediaKey: "offers/20-percent-off-1000.jpg", mediaUrl: "https://YOUR_CDN/offers/20-percent-off-1000.jpg" },
    offerType: "percentage_discount",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 1000, categories: [] },
    reward: { discountPercentage: 20, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // free_shipping_amount — Case A
  {
    title: "Free Shipping on Orders Above 300 EGP",
    description: "Enjoy free shipping when you spend 300 EGP or more",
    isActive: true,
    image: { mediaKey: "offers/free-shipping-300.jpg", mediaUrl: "https://YOUR_CDN/offers/free-shipping-300.jpg" },
    offerType: "free_shipping_amount",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 300, categories: [] },
    reward: { discountPercentage: null, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // free_shipping_amount — Case B
  {
    title: "Free Shipping on Orders Above 150 EGP",
    description: "Enjoy free shipping when you spend 150 EGP or more",
    isActive: false,
    image: { mediaKey: "offers/free-shipping-150.jpg", mediaUrl: "https://YOUR_CDN/offers/free-shipping-150.jpg" },
    offerType: "free_shipping_amount",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 150, categories: [] },
    reward: { discountPercentage: null, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // free_shipping_quantity — Case A (single category)
  {
    title: "Free Shipping on 5 Pajama Items",
    description: "Buy 5 items from the Pajama category and get free shipping",
    isActive: true,
    image: { mediaKey: "offers/free-shipping-5-pajama.jpg", mediaUrl: "https://YOUR_CDN/offers/free-shipping-5-pajama.jpg" },
    offerType: "free_shipping_quantity",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 5, minAmount: null, categories: [CATEGORY_ID] },
    reward: { discountPercentage: null, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // free_shipping_quantity — Case B (multiple categories, same ID used for both)
  {
    title: "Free Shipping on 5 Pajama or Robe Items",
    description: "Buy 5 items from the Pajama or Robe categories and get free shipping",
    isActive: true,
    image: { mediaKey: "offers/free-shipping-5-pajama-robe.jpg", mediaUrl: "https://YOUR_CDN/offers/free-shipping-5-pajama-robe.jpg" },
    offerType: "free_shipping_quantity",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 5, minAmount: null, categories: [CATEGORY_ID] },
    reward: { discountPercentage: null, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // free_shipping_quantity — Case C (any category)
  {
    title: "Free Shipping on Any 3 Items",
    description: "Buy any 3 items and get free shipping",
    isActive: true,
    image: { mediaKey: "offers/free-shipping-3-any.jpg", mediaUrl: "https://YOUR_CDN/offers/free-shipping-3-any.jpg" },
    offerType: "free_shipping_quantity",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 3, minAmount: null, categories: [] },
    reward: { discountPercentage: null, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // deal_of_day — Case A
  {
    title: "Deal of the Day — 40% Off Selected Items",
    description: "Grab 40% off on selected products today only",
    isActive: true,
    image: { mediaKey: "offers/deal-of-day-40.jpg", mediaUrl: "https://YOUR_CDN/offers/deal-of-day-40.jpg" },
    offerType: "deal_of_day",
    timing: { startDate: new Date(new Date().setHours(0, 0, 0, 0)), endDate: new Date(new Date().setHours(23, 59, 59, 999)) },
    condition: { minQuantity: null, minAmount: null, categories: [] },
    reward: { discountPercentage: 40, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [PRODUCT_ID],
  },
  // deal_of_day — Case B
  {
    title: "Deal of the Day — 60% Off One Item",
    description: "Today only! Get 60% off this specially selected item",
    isActive: false,
    image: { mediaKey: "offers/deal-of-day-60.jpg", mediaUrl: "https://YOUR_CDN/offers/deal-of-day-60.jpg" },
    offerType: "deal_of_day",
    timing: { startDate: new Date(new Date().setHours(0, 0, 0, 0)), endDate: new Date(new Date().setHours(23, 59, 59, 999)) },
    condition: { minQuantity: null, minAmount: null, categories: [] },
    reward: { discountPercentage: 60, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [PRODUCT_ID],
  },
  // flash_sale — Case A (single category)
  {
    title: "Flash Sale — 30% Off Pajamas",
    description: "30% off all Pajama items for a limited time",
    isActive: true,
    image: { mediaKey: "offers/flash-sale-pajama-30.jpg", mediaUrl: "https://YOUR_CDN/offers/flash-sale-pajama-30.jpg" },
    offerType: "flash_sale",
    timing: { startDate: new Date(new Date().setHours(10, 0, 0, 0)), endDate: new Date(new Date().setHours(12, 0, 0, 0)) },
    condition: { minQuantity: null, minAmount: null, categories: [CATEGORY_ID] },
    reward: { discountPercentage: 30, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // flash_sale — Case B (multiple categories)
  {
    title: "Flash Sale — 25% Off Pajamas & Robes",
    description: "25% off all Pajama and Robe items for a limited time",
    isActive: false,
    image: { mediaKey: "offers/flash-sale-pajama-robe-25.jpg", mediaUrl: "https://YOUR_CDN/offers/flash-sale-pajama-robe-25.jpg" },
    offerType: "flash_sale",
    timing: { startDate: new Date(new Date().setHours(14, 0, 0, 0)), endDate: new Date(new Date().setHours(17, 0, 0, 0)) },
    condition: { minQuantity: null, minAmount: null, categories: [CATEGORY_ID] },
    reward: { discountPercentage: 25, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // flash_sale — Case C (all categories)
  {
    title: "Flash Sale — 20% Off Everything",
    description: "20% off all items across all categories for a limited time",
    isActive: false,
    image: { mediaKey: "offers/flash-sale-all-20.jpg", mediaUrl: "https://YOUR_CDN/offers/flash-sale-all-20.jpg" },
    offerType: "flash_sale",
    timing: { startDate: new Date(new Date().setHours(18, 0, 0, 0)), endDate: new Date(new Date().setHours(20, 0, 0, 0)) },
    condition: { minQuantity: null, minAmount: null, categories: [] },
    reward: { discountPercentage: 20, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // buy_x_get_half_price — Case A
  {
    title: "Buy 1 Get 1 at Half Price",
    description: "Buy any item and get a selected item at half the original price",
    isActive: true,
    image: { mediaKey: "offers/buy-1-half-price.jpg", mediaUrl: "https://YOUR_CDN/offers/buy-1-half-price.jpg" },
    offerType: "buy_x_get_half_price",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 1, minAmount: null, categories: [] },
    reward: { discountPercentage: null, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: PRODUCT_ID } },
    targetProducts: [],
  },
  // buy_x_get_half_price — Case B
  {
    title: "Buy 2 Get 1 at Half Price",
    description: "Buy any 2 items and get a selected item at half the original price",
    isActive: false,
    image: { mediaKey: "offers/buy-2-half-price.jpg", mediaUrl: "https://YOUR_CDN/offers/buy-2-half-price.jpg" },
    offerType: "buy_x_get_half_price",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 2, minAmount: null, categories: [] },
    reward: { discountPercentage: null, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: PRODUCT_ID } },
    targetProducts: [],
  },
  // buy_x_get_half_price — Case C
  {
    title: "Buy 3 Get 1 at Half Price",
    description: "Buy any 3 items and get a selected item at half the original price",
    isActive: false,
    image: { mediaKey: "offers/buy-3-half-price.jpg", mediaUrl: "https://YOUR_CDN/offers/buy-3-half-price.jpg" },
    offerType: "buy_x_get_half_price",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 3, minAmount: null, categories: [] },
    reward: { discountPercentage: null, freeItem: { product: null, maxValue: null }, halfPriceItem: { product: PRODUCT_ID } },
    targetProducts: [],
  },
  // spend_x_get_free — Case A (maxValue, no specific product)
  {
    title: "Spend 1000 EGP Get a Free Gift Worth up to 300 EGP",
    description: "Shop for 1000 EGP or more and choose any free item worth up to 300 EGP",
    isActive: true,
    image: { mediaKey: "offers/spend-1000-free-300.jpg", mediaUrl: "https://YOUR_CDN/offers/spend-1000-free-300.jpg" },
    offerType: "spend_x_get_free",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 1000, categories: [] },
    reward: { discountPercentage: null, freeItem: { product: null, maxValue: 300 }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
  // spend_x_get_free — Case B (specific product)
  {
    title: "Spend 500 EGP Get a Free Gift",
    description: "Shop for 500 EGP or more and get this specific free item",
    isActive: true,
    image: { mediaKey: "offers/spend-500-free-product.jpg", mediaUrl: "https://YOUR_CDN/offers/spend-500-free-product.jpg" },
    offerType: "spend_x_get_free",
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 500, categories: [] },
    reward: { discountPercentage: null, freeItem: { product: PRODUCT_ID, maxValue: null }, halfPriceItem: { product: null } },
    targetProducts: [],
  },
];

async function seedOffers() {
  await OfferModel.deleteMany({});
  await OfferModel.insertMany(offersSeedData);
  console.log(`Offers — inserted: ${offersSeedData.length}`);
}

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in environment variables.");
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(DB_URL);
    console.log("DB connected — running seeds...\n");

    await seedColors();
    await seedSizes();
    await seedOffers();

    console.log("\nSeeding complete.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("DB disconnected.");
  }
}

run();
