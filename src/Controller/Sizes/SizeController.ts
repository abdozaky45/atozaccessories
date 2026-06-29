import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import SuccessMessage from "../../Utils/SuccessMessages";
import {
  createSize,
  findSizeById,
  findSizeByNumber,
  getAllSizes,
  prepareSizeUpdates,
  deleteSizeById,
} from "../../Service/SizeService/SizeService";
import { getOrSet } from "../../Utils/Cache";
import { CacheKeys, CacheTTL } from "../../Utils/Cache/keys";
import { invalidateSizeCaches } from "../../Utils/Cache/invalidate";

export const createNewSize = asyncHandler(async (req: Request, res: Response) => {
  const { number, order } = req.body;
  const existing = await findSizeByNumber(number);
  if (existing) {
    throw new ApiError(409, ErrorMessages.SIZE_NUMBER_ALREADY_EXISTS);
  }
  const size = await createSize({ number, order });
  await invalidateSizeCaches();
  return res.json(new ApiResponse(200, { size }, SuccessMessage.SIZE_CREATED));
});

export const getSizes = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page !== undefined ? parseInt(req.query.page as string) : undefined;
  // Cache only the default, unpaginated list (the common storefront call).
  if (page === undefined) {
    const result = await getOrSet(CacheKeys.sizes, CacheTTL.reference, () => getAllSizes(undefined));
    return res.json(new ApiResponse(200, result));
  }
  const result = await getAllSizes(page);
  return res.json(new ApiResponse(200, result));
});

export const getSizeById = asyncHandler(async (req: Request, res: Response) => {
  const size = await findSizeById(req.params._id);
  if (!size) {
    throw new ApiError(404, ErrorMessages.SIZE_NOT_FOUND);
  }
  return res.json(new ApiResponse(200, { size }));
});

export const updateSize = asyncHandler(async (req: Request, res: Response) => {
  const size = await findSizeById(req.params._id);
  if (!size) {
    throw new ApiError(404, ErrorMessages.SIZE_NOT_FOUND);
  }
  const { number, order } = req.body;
  if (number && number !== size.number) {
    const existing = await findSizeByNumber(number);
    if (existing) {
      throw new ApiError(409, ErrorMessages.SIZE_NUMBER_ALREADY_EXISTS);
    }
  }
  const updates = prepareSizeUpdates(size, number, order);
  if (updates) {
    await size.save();
    await invalidateSizeCaches();
    return res.json(new ApiResponse(200, { size }, SuccessMessage.SIZE_UPDATED));
  }
  return res.json(new ApiResponse(200, {}, SuccessMessage.NO_UPDATE_SIZE));
});

export const deleteSize = asyncHandler(async (req: Request, res: Response) => {
  const size = await deleteSizeById(req.params._id);
  if (!size) {
    throw new ApiError(404, ErrorMessages.SIZE_NOT_FOUND);
  }
  await invalidateSizeCaches();
  return res.json(new ApiResponse(200, {}, SuccessMessage.SIZE_DELETED));
});
