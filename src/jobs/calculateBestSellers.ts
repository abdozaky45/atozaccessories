import Agenda from "agenda";
import ProductModel from "../Model/Product/ProductModel";
import { cacheDel } from "../Utils/Cache";
import { CacheKeys } from "../Utils/Cache/keys";

export const defineCalculateBestSellersJob = (agenda: Agenda): void => {
  agenda.define("calculate-bestsellers", async () => {
    console.log("[calculate-bestsellers] Starting nightly best seller calculation");
    try {
      // Step 1 — Reset isBestSeller for all cron-managed products
      await ProductModel.updateMany(
        { bestSellerManual: { $ne: true } },
        { $set: { isBestSeller: false } }
      );

      // Step 2 — Mark qualifying products as best sellers
      await ProductModel.updateMany(
        {
          soldItems: { $gte: 3 },
          bestSellerManual: { $ne: true },
          isDeleted: false,
        },
        { $set: { isBestSeller: true } }
      );

      await cacheDel(CacheKeys.home); // best-seller set changed → refresh home
      console.log("[calculate-bestsellers] Done");
    } catch (err) {
      console.error("[calculate-bestsellers] Error:", err);
      throw err;
    }
  });
};
