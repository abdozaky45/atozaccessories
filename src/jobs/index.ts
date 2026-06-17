import { getAgenda } from "../config/agenda";
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

  // Schedule nightly best-seller calculation at midnight
  // agenda.every is idempotent for the same job name — safe to call on every startup
  await agenda.every("0 0 * * *", "calculate-bestsellers");
  console.log("[Agenda] calculate-bestsellers scheduled nightly at midnight");

  // Graceful shutdown: let in-progress jobs finish before the process exits
  const gracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`[Agenda] ${signal} received — stopping gracefully`);
    await agenda.stop();
    console.log("[Agenda] Stopped");
    process.exit(0);
  };
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};
