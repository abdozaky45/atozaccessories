import Agenda, { Job } from "agenda";
import OfferModel from "../Model/Offers/OfferModel";

export const defineExpireOfferJob = (agenda: Agenda): void => {
  agenda.define("expire-offer", async (job: Job) => {
    try {
      const { offerId } = (job.attrs.data ?? {}) as { offerId?: string };
      if (!offerId) {
        console.warn("[expire-offer] Missing offerId in job data — skipping");
        return;
      }

      const offer = await OfferModel.findById(offerId);

      if (!offer) {
        console.warn(`[expire-offer] Offer ${offerId} not found — skipping`);
        return;
      }

      await OfferModel.findByIdAndUpdate(offerId, { status: "expired", isActive: false });
      console.log(`[expire-offer] Offer ${offerId} set to expired`);
    } catch (err) {
      console.error("[expire-offer] Error processing job:", err);
      throw err;
    }
  });
};
