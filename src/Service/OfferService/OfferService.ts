import OfferModel from "../../Model/Offers/OfferModel";
import { OfferType } from "../../Model/Offers/IOffer";
import s3_service from "../Aws/S3_Bucket/presignedUrl";
import { ApiError } from "../../Utils/ErrorHandling";

export const validateOfferBusinessRules = ({
  offerType,
  timing,
  condition,
  reward,
  targetProducts,
  targetCategories,
}: {
  offerType: OfferType;
  timing?: any;
  condition?: any;
  reward?: any;
  targetProducts?: any[];
  targetCategories?: any[];
}) => {
  // timing required for time-bounded offer types (flash_sale runs for a limited time)
  if (["flash_sale"].includes(offerType)) {
    if (!timing?.startDate || !timing?.endDate) {
      throw new ApiError(400, `timing.startDate and timing.endDate are required for ${offerType}`);
    }
  }

  // minQuantity required
  if (["buy_x_get_cheapest_free", "buy_x_get_free_shipping", "buy_x_get_half_price"].includes(offerType)) {
    if (condition?.minQuantity == null) {
      throw new ApiError(400, `condition.minQuantity is required for ${offerType}`);
    }
  }

  // minAmount required
  if (["spend_x_get_discount", "spend_x_get_free_shipping", "spend_x_get_free_item"].includes(offerType)) {
    if (condition?.minAmount == null) {
      throw new ApiError(400, `condition.minAmount is required for ${offerType}`);
    }
  }

  // discountPercentage required
  if (["spend_x_get_discount", "flash_sale"].includes(offerType)) {
    if (reward?.discountPercentage == null) {
      throw new ApiError(400, `reward.discountPercentage is required for ${offerType}`);
    }
  }

  // freeItemMaxValue required for spend_x_get_free_item
  if (offerType === "spend_x_get_free_item") {
    if (reward?.freeItemMaxValue == null) {
      throw new ApiError(400, "reward.freeItemMaxValue is required for spend_x_get_free_item");
    }
  }

  // targetProducts required for flash_sale (a specific product gets the discount)
  if (offerType === "flash_sale") {
    if (!targetProducts?.length) {
      throw new ApiError(400, "targetProducts must be non-empty for flash_sale");
    }
  }
};

export const createOffer = async (data: any) => {
  return OfferModel.create(data);
};

export const findOfferById = async (_id: string) => {
  return OfferModel.findById(_id);
};

export const findOfferByIdWithPopulate = async (_id: string) => {
  return OfferModel.findById(_id)
    .populate("condition.excludedCategories", "_id categoryName slug")
    .populate("targetProducts", "_id productName price")
    .populate("targetCategories", "_id categoryName slug");
};

export const getAllOffers = async ({
  page = 1,
  limit = 10,
  offerType,
  isActive,
}: {
  page?: number;
  limit?: number;
  offerType?: string;
  isActive?: boolean;
}) => {
  page = !page || page < 1 || isNaN(page) ? 1 : page;
  const skip = limit * (page - 1);

  const filter: any = {};
  if (offerType) filter.offerType = offerType;
  if (isActive !== undefined) filter.isActive = isActive;

  const totalItems = await OfferModel.countDocuments(filter);
  const totalPages = Math.ceil(totalItems / limit);
  const data = await OfferModel.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("-__v");

  return { data, totalItems, totalPages, currentPage: page };
};

export const deleteOfferById = async (_id: string) => {
  return OfferModel.findByIdAndDelete(_id);
};

export const deleteS3Object = async (key: string) => {
  const aws_s3_service = new s3_service();
  return aws_s3_service.deletePresignedUrl({
    bucket: process.env.AWS_BUCKET_NAME!,
    key,
  });
};
