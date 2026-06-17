import Agenda from "agenda";
import ProductModel from "../Model/Product/ProductModel";

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

      console.log("[calculate-bestsellers] Done");
    } catch (err) {
      console.error("[calculate-bestsellers] Error:", err);
      throw err;
    }
  });
};
