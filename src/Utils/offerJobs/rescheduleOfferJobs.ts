import { getAgenda } from "../../config/agenda";
import { OfferStatus } from "../../Model/Offers/IOffer";
import { ApiError } from "../../Utils/ErrorHandling";

/**
 * Re-schedule jobs when admin reactivates a timed offer.
 * Logic:
 *   - If both dates have passed → throw error (admin must update dates)
 *   - If startDate is in the future → schedule activate + expire, status = "scheduled"
 *   - If startDate passed but endDate is still future → schedule expire only, status = "active"
 *
 * Always cancels existing jobs first to avoid duplicates.
 * Returns the status that should be applied to the offer by the caller.
 */
export const rescheduleOfferJobs = async (
  offerId: string,
  startDate: Date,
  endDate: Date
): Promise<OfferStatus> => {
  try {
    const now = new Date();
    const agenda = getAgenda();

    if (endDate <= now) {
      throw new ApiError(
        400,
        "Offer dates have already passed. Update startDate and endDate before reactivating."
      );
    }

    // Cancel any stale jobs before scheduling new ones
    await agenda.cancel({ "data.offerId": offerId });

    if (startDate > now) {
      // Both dates in the future: schedule full lifecycle
      await agenda.schedule(startDate, "activate-offer", { offerId });
      await agenda.schedule(endDate, "expire-offer", { offerId });
      console.log(`[rescheduleOfferJobs] Offer ${offerId}: full reschedule — activate at ${startDate.toISOString()}`);
      return "scheduled";
    } else {
      // startDate already passed, endDate still in future: activate immediately
      // Caller is responsible for persisting status: "active" via offer.save()
      await agenda.schedule(endDate, "expire-offer", { offerId });
      console.log(`[rescheduleOfferJobs] Offer ${offerId}: activated immediately, expire at ${endDate.toISOString()}`);
      return "active";
    }
  } catch (err) {
    // Re-throw ApiError as-is; wrap unexpected errors for context
    if (err instanceof ApiError) throw err;
    console.error(`[rescheduleOfferJobs] Error rescheduling jobs for offer ${offerId}:`, err);
    throw err;
  }
};
