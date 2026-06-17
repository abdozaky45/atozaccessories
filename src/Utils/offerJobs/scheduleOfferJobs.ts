import { getAgenda } from "../../config/agenda";

/**
 * Schedule activate-offer and expire-offer jobs for a timed offer.
 * Cancels any pre-existing jobs for this offer first to prevent duplicates.
 */
export const scheduleOfferJobs = async (
  offerId: string,
  startDate: Date,
  endDate: Date
): Promise<void> => {
  try {
    const agenda = getAgenda();

    // Always cancel existing jobs first to prevent duplicates
    await agenda.cancel({ "data.offerId": offerId });

    await agenda.schedule(startDate, "activate-offer", { offerId });
    await agenda.schedule(endDate, "expire-offer", { offerId });

    console.log(
      `[scheduleOfferJobs] Offer ${offerId}: activate scheduled at ${startDate.toISOString()}, expire at ${endDate.toISOString()}`
    );
  } catch (err) {
    console.error(`[scheduleOfferJobs] Error scheduling jobs for offer ${offerId}:`, err);
    throw err;
  }
};
