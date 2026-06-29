import { getAgenda } from "../../config/agenda";
import OfferModel from "../../Model/Offers/OfferModel";

/**
 * Cancel all pending agenda jobs (activate-offer + expire-offer) for an offer
 * and mark the offer as expired in the database.
 * Call this when an admin manually deactivates a timed offer.
 */
export const cancelOfferJobs = async (offerId: string): Promise<void> => {
  try {
    const agenda = getAgenda();
    const cancelled = await agenda.cancel({ "data.offerId": offerId });
    await OfferModel.findByIdAndUpdate(offerId, { status: "expired" });
    console.log(`[cancelOfferJobs] Cancelled ${cancelled} job(s) for offer ${offerId}, status set to expired`);
  } catch (err) {
    console.error(`[cancelOfferJobs] Error cancelling jobs for offer ${offerId}:`, err);
    throw err;
  }
};
