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

export const createNewSize = asyncHandler(async (req: Request, res: Response) => {
  const { number, order } = req.body;
  const existing = await findSizeByNumber(number);
  if (existing) {
    throw new ApiError(409, ErrorMessages.SIZE_NUMBER_ALREADY_EXISTS);
  }
  const size = await createSize({ number, order });
  return res.json(new ApiResponse(200, { size }, SuccessMessage.SIZE_CREATED));
});

export const getSizes = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
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
    return res.json(new ApiResponse(200, { size }, SuccessMessage.SIZE_UPDATED));
  }
  return res.json(new ApiResponse(200, {}, SuccessMessage.NO_UPDATE_SIZE));
});

export const deleteSize = asyncHandler(async (req: Request, res: Response) => {
  const size = await deleteSizeById(req.params._id);
  if (!size) {
    throw new ApiError(404, ErrorMessages.SIZE_NOT_FOUND);
  }
  return res.json(new ApiResponse(200, {}, SuccessMessage.SIZE_DELETED));
});
