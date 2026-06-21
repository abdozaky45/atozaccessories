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
import { sendEmail } from "../../Utils/Nodemailer/SendEmail";
import { generateOfferEmail } from "../../Utils/Nodemailer/OfferEmail";
import AuthModel from "../../Model/User/auth/AuthModel";
import { UserTypeEnum } from "../../Utils/UserType";

const TIMED_OFFER_TYPES = ["flash_sale"];

const BRAND = "A to Z Accessory";
const SHOP_URL = "https://www.atozaccessory.com";

// Broadcast a promotional email about a live offer to every customer (role: user).
// Fire-and-forget: never blocks or fails the request. BCC in chunks so recipients
// don't see each other and we stay within Resend's per-message recipient cap.
const broadcastOfferToUsers = async (offer: any) => {
  try {
    const users = await AuthModel.find({ role: UserTypeEnum.USER }).select("email").lean();
    const emails = users.map((u: any) => u.email).filter(Boolean);
    if (!emails.length) return;

    const html = generateOfferEmail({
      brandName: BRAND,
      offerTitle: offer.title,
      offerDescription: offer.description,
      imageUrl: offer.image?.mediaUrl,
      shopUrl: SHOP_URL,
    });
    const subject = `🎉 عرض جديد: ${offer.title}`;

    const CHUNK = 49;
    for (let i = 0; i < emails.length; i += CHUNK) {
      await sendEmail({ to: "atozaccessories0@gmail.com", bcc: emails.slice(i, i + CHUNK), subject, html });
    }
  } catch (err) {
    console.error("[broadcastOfferToUsers] failed:", err);
  }
};

// Derive the lifecycle status at creation time. Without this, the schema default
// "scheduled" would stick and the offer would never apply (the order engine only
// uses offers with status "active"). Non-timed cart offers go live immediately;
// timed offers (flash_sale) are derived from their window.
const computeCreateStatus = (
  offerType: string,
  timing: { startDate?: string | Date | null; endDate?: string | Date | null } | undefined,
  isActive: boolean | undefined
): "scheduled" | "active" | "expired" => {
  if (isActive === false) return "scheduled"; // created switched off
  if (!TIMED_OFFER_TYPES.includes(offerType)) return "active";
  const now = new Date();
  const start = timing?.startDate ? new Date(timing.startDate) : null;
  const end = timing?.endDate ? new Date(timing.endDate) : null;
  if (end && end <= now) return "expired";
  if (start && start > now) return "scheduled";
  return "active";
};

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
    status: computeCreateStatus(offerType, timing, isActive),
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

  // Announce the offer to all customers if it is live now.
  if (offer.status === "active") {
    broadcastOfferToUsers(offer);
  }

  return res.json(new ApiResponse(200, { offer }, SuccessMessage.OFFER_CREATED));
});

export const getOffers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offerType = req.query.offerType as string | undefined;
  const search = (req.query.search as string | undefined)?.trim() || undefined;
  const isActiveStr = req.query.isActive as string | undefined;
  const isActive =
    isActiveStr === "true" ? true : isActiveStr === "false" ? false : undefined;

  const result = await getAllOffers({ page, limit, offerType, isActive, search });
  return res.json(new ApiResponse(200, result));
});

// Public, unauthenticated endpoint used by the storefront (e.g. the mobile side
// menu promo card). Returns only currently-live offers (isActive + status
// "active") so guests never see scheduled/expired ones.
export const getPublicActiveOffers = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 6;
    const result = await getAllOffers({ page: 1, limit, isActive: true });
    const offers = (result.data || []).filter(
      (o: any) => o.status === "active"
    );
    return res.json(new ApiResponse(200, { offers }));
  }
);

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

  // Announce to all customers when an offer is (re)opened and now live.
  if (offer.isActive && offer.status === "active") {
    broadcastOfferToUsers(offer);
  }

  return res.json(new ApiResponse(200, { offer }, SuccessMessage.OFFER_TOGGLED));
});
