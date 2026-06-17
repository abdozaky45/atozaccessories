import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import SuccessMessage from "../../Utils/SuccessMessages";
import {
  createOffer,
  findOfferById,
  findOfferByIdWithPopulate,
  getAllOffers,
  deleteOfferById,
  deleteS3Object,
  validateOfferBusinessRules,
} from "../../Service/OfferService/OfferService";
import { scheduleOfferJobs } from "../../Utils/offerJobs/scheduleOfferJobs";
import { cancelOfferJobs } from "../../Utils/offerJobs/cancelOfferJobs";
import { rescheduleOfferJobs } from "../../Utils/offerJobs/rescheduleOfferJobs";

const TIMED_OFFER_TYPES = ["flash_sale"];

const S3_BASE_URL = "https://atozaccessories.s3.amazonaws.com/";

// The request body only carries mediaUrl; derive mediaKey by stripping the S3 base URL.
const buildImage = (image: { mediaUrl: string }) => ({
  mediaUrl: image.mediaUrl,
  mediaKey: image.mediaUrl.replace(S3_BASE_URL, ""),
});

export const createNewOffer = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, isActive, image, offerType, timing, condition, reward, targetProducts, targetCategories } = req.body;

  validateOfferBusinessRules({ offerType, timing, condition, reward, targetProducts, targetCategories });

  const offer = await createOffer({
    title,
    description,
    isActive,
    image: buildImage(image),
    offerType,
    timing,
    condition,
    reward,
    targetProducts,
    targetCategories,
  });

  // Schedule lifecycle jobs for time-bounded offer types
  if (TIMED_OFFER_TYPES.includes(offerType) && timing?.startDate && timing?.endDate) {
    try {
      await scheduleOfferJobs(
        String(offer._id),
        new Date(timing.startDate),
        new Date(timing.endDate)
      );
    } catch (err) {
      console.error(`[createNewOffer] Failed to schedule jobs for offer ${offer._id}:`, err);
    }
  }

  return res.json(new ApiResponse(200, { offer }, SuccessMessage.OFFER_CREATED));
});

export const getOffers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offerType = req.query.offerType as string | undefined;
  const isActiveStr = req.query.isActive as string | undefined;
  const isActive =
    isActiveStr === "true" ? true : isActiveStr === "false" ? false : undefined;

  const result = await getAllOffers({ page, limit, offerType, isActive });
  return res.json(new ApiResponse(200, result));
});

export const getOfferById = asyncHandler(async (req: Request, res: Response) => {
  const offer = await findOfferByIdWithPopulate(req.params.id);
  if (!offer) throw new ApiError(404, ErrorMessages.OFFER_NOT_FOUND);
  return res.json(new ApiResponse(200, { offer }));
});

export const updateOffer = asyncHandler(async (req: Request, res: Response) => {
  const offer = await findOfferById(req.params.id);
  if (!offer) throw new ApiError(404, ErrorMessages.OFFER_NOT_FOUND);

  const { title, description, isActive, image, offerType, timing, condition, reward, targetProducts, targetCategories } = req.body;

  const resolvedOfferType = offerType ?? offer.offerType;
  const resolvedTiming = timing ?? offer.timing;
  const resolvedCondition = condition ?? offer.condition;
  const resolvedReward = reward ?? offer.reward;
  const resolvedTargetProducts = targetProducts ?? offer.targetProducts;
  const resolvedTargetCategories = targetCategories ?? offer.targetCategories;

  validateOfferBusinessRules({
    offerType: resolvedOfferType,
    timing: resolvedTiming,
    condition: resolvedCondition,
    reward: resolvedReward,
    targetProducts: resolvedTargetProducts,
    targetCategories: resolvedTargetCategories,
  });

  if (image?.mediaUrl) {
    const newImage = buildImage(image);
    if (newImage.mediaKey !== offer.image.mediaKey) {
      await deleteS3Object(offer.image.mediaKey);
      offer.image = newImage;
    }
  }

  if (title !== undefined) offer.title = title;
  if (description !== undefined) offer.description = description;
  if (isActive !== undefined) offer.isActive = isActive;
  if (offerType !== undefined) offer.offerType = offerType;
  if (timing !== undefined) offer.timing = timing;
  if (condition !== undefined) offer.condition = condition;
  if (reward !== undefined) offer.reward = reward;
  if (targetProducts !== undefined) offer.targetProducts = targetProducts;
  if (targetCategories !== undefined) offer.targetCategories = targetCategories;

  await offer.save();
  return res.json(new ApiResponse(200, { offer }, SuccessMessage.OFFER_UPDATED));
});

export const deleteOffer = asyncHandler(async (req: Request, res: Response) => {
  const offer = await findOfferById(req.params.id);
  if (!offer) throw new ApiError(404, ErrorMessages.OFFER_NOT_FOUND);

  if (offer.isActive) {
    console.warn(`[Offer Delete Warning] Deleting active offer: ${offer._id} - "${offer.title}"`);
  }

  // Cancel any pending agenda jobs before permanent deletion
  if (TIMED_OFFER_TYPES.includes(offer.offerType)) {
    try {
      await cancelOfferJobs(String(offer._id));
    } catch (err) {
      console.error(`[deleteOffer] Failed to cancel jobs for offer ${offer._id}:`, err);
    }
  }

  if (offer.image?.mediaKey) {
    await deleteS3Object(offer.image.mediaKey);
  }

  await deleteOfferById(String(offer._id));
  return res.json(new ApiResponse(200, {}, SuccessMessage.OFFER_DELETED));
});

export const toggleOffer = asyncHandler(async (req: Request, res: Response) => {
  const offer = await findOfferById(req.params.id);
  if (!offer) throw new ApiError(404, ErrorMessages.OFFER_NOT_FOUND);

  const newIsActive = !offer.isActive;
  const isTimedOffer = TIMED_OFFER_TYPES.includes(offer.offerType);
  const offerId = String(offer._id);

  if (!newIsActive) {
    // ── Deactivating ──────────────────────────────────────────────────────────
    if (isTimedOffer) {
      await cancelOfferJobs(offerId);
    }
    offer.isActive = false;
    offer.status = "expired";
  } else {
    // ── Reactivating ──────────────────────────────────────────────────────────
    if (isTimedOffer) {
      const startDate = offer.timing.startDate ? new Date(offer.timing.startDate) : null;
      const endDate = offer.timing.endDate ? new Date(offer.timing.endDate) : null;

      if (!startDate || !endDate) {
        throw new ApiError(400, "Cannot reactivate a timed offer without valid startDate and endDate");
      }

      // rescheduleOfferJobs throws if both dates have passed; returns the correct status
      const newStatus = await rescheduleOfferJobs(offerId, startDate, endDate);
      offer.status = newStatus;
    } else {
      offer.status = "active";
    }
    offer.isActive = true;
  }

  await offer.save();
  return res.json(new ApiResponse(200, { offer }, SuccessMessage.OFFER_TOGGLED));
});
