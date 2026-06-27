import Agenda, { Job } from "agenda";
import OfferModel from "../Model/Offers/OfferModel";
import { cacheDel } from "../Utils/Cache";
import { CacheKeys } from "../Utils/Cache/keys";

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
      await cacheDel(CacheKeys.home); // offer expired → drop it from home flash sale
      console.log(`[expire-offer] Offer ${offerId} set to expired`);
    } catch (err) {
      console.error("[expire-offer] Error processing job:", err);
      throw err;
    }
  });
};
