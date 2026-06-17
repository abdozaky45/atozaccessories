import Agenda, { Job } from "agenda";
import OfferModel from "../Model/Offers/OfferModel";

export const defineActivateOfferJob = (agenda: Agenda): void => {
  agenda.define("activate-offer", async (job: Job) => {
    try {
      const { offerId } = (job.attrs.data ?? {}) as { offerId?: string };
      if (!offerId) {
        console.warn("[activate-offer] Missing offerId in job data — skipping");
        return;
      }

      const offer = await OfferModel.findById(offerId);

      if (!offer) {
        console.warn(`[activate-offer] Offer ${offerId} not found — skipping`);
        return;
      }

      if (!offer.isActive) {
        console.log(`[activate-offer] Offer ${offerId} was manually disabled — skipping activation`);
        return;
      }

      await OfferModel.findByIdAndUpdate(offerId, { status: "active" });
      console.log(`[activate-offer] Offer ${offerId} set to active`);
    } catch (err) {
      console.error("[activate-offer] Error processing job:", err);
      throw err;
    }
  });
};
