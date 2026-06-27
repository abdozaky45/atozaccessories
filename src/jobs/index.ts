import mongoose from "mongoose";
import { getAgenda } from "../config/agenda";
import { closeRedis } from "../config/redis";
import { defineActivateOfferJob } from "./activateOffer";
import { defineExpireOfferJob } from "./expireOffer";
import { defineCalculateBestSellersJob } from "./calculateBestSellers";

export const registerJobs = async (): Promise<void> => {
  const agenda = getAgenda();

  // Register all job definitions before starting
  defineActivateOfferJob(agenda);
  defineExpireOfferJob(agenda);
  defineCalculateBestSellersJob(agenda);

  await agenda.start();
  console.log("[Agenda] Started");

  // Cancel the obsolete end-sale job. The "update-expired-products" job backed the
  // removed product "end sale" feature; remove any instances still persisted in the DB.
  const cancelledEndSale = await agenda.cancel({ name: "update-expired-products" });
  console.log(`[Agenda] Cancelled ${cancelledEndSale ?? 0} obsolete update-expired-products job(s)`);

  // The legacy end-sale job persisted into a separate "jobs" collection; clean that too.
  try {
    const legacy = await mongoose.connection
      .collection("jobs")
      .deleteMany({ name: "update-expired-products" });
    console.log(`[Agenda] Removed ${legacy.deletedCount} legacy update-expired-products job(s)`);
  } catch (err) {
    console.error("[Agenda] Failed to clean legacy update-expired-products jobs:", err);
  }

  // Schedule nightly best-seller calculation at midnight
  // agenda.every is idempotent for the same job name — safe to call on every startup
  await agenda.every("0 0 * * *", "calculate-bestsellers");
  console.log("[Agenda] calculate-bestsellers scheduled nightly at midnight");

  // Graceful shutdown: let in-progress jobs finish before the process exits
  const gracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`[Agenda] ${signal} received — stopping gracefully`);
    await agenda.stop();
    await closeRedis();
    console.log("[Agenda] Stopped");
    process.exit(0);
  };
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};
