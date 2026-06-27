import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import SuccessMessage from "../../Utils/SuccessMessages";
import {
  createColor,
  findColorById,
  findColorByName,
  getAllColors,
  prepareColorUpdates,
  deleteColorById,
} from "../../Service/ColorService/ColorService";
import { getOrSet, cacheDel } from "../../Utils/Cache";
import { CacheKeys, CacheTTL } from "../../Utils/Cache/keys";

export const createNewColor = asyncHandler(async (req: Request, res: Response) => {
  const { name, hex } = req.body;
  const existing = await findColorByName(name);
  if (existing) {
    throw new ApiError(409, ErrorMessages.COLOR_NAME_ALREADY_EXISTS);
  }
  const color = await createColor({ name, hex });
  await cacheDel(CacheKeys.colors);
  return res.json(new ApiResponse(200, { color }, SuccessMessage.COLOR_CREATED));
});

export const getColors = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page !== undefined ? parseInt(req.query.page as string) : undefined;
  const search = req.query.search as string | undefined;
  // Cache only the default, unfiltered list (the common storefront call).
  if (page === undefined && !search) {
    const result = await getOrSet(CacheKeys.colors, CacheTTL.reference, () =>
      getAllColors(undefined, undefined)
    );
    return res.json(new ApiResponse(200, result));
  }
  const result = await getAllColors(page, search);
  return res.json(new ApiResponse(200, result));
});

export const getColorById = asyncHandler(async (req: Request, res: Response) => {
  const color = await findColorById(req.params._id);
  if (!color) {
    throw new ApiError(404, ErrorMessages.COLOR_NOT_FOUND);
  }
  return res.json(new ApiResponse(200, { color }));
});

export const updateColor = asyncHandler(async (req: Request, res: Response) => {
  const color = await findColorById(req.params._id);
  if (!color) {
    throw new ApiError(404, ErrorMessages.COLOR_NOT_FOUND);
  }
  const { name, hex } = req.body;
  if (name && name !== color.name) {
    const existing = await findColorByName(name);
    if (existing) {
      throw new ApiError(409, ErrorMessages.COLOR_NAME_ALREADY_EXISTS);
    }
  }
  const updates = prepareColorUpdates(color, name, hex);
  if (updates) {
    await color.save();
    await cacheDel(CacheKeys.colors);
    return res.json(new ApiResponse(200, { color }, SuccessMessage.COLOR_UPDATED));
  }
  return res.json(new ApiResponse(200, {}, SuccessMessage.NO_UPDATE_COLOR));
});

export const deleteColor = asyncHandler(async (req: Request, res: Response) => {
  const color = await deleteColorById(req.params._id);
  if (!color) {
    throw new ApiError(404, ErrorMessages.COLOR_NOT_FOUND);
  }
  await cacheDel(CacheKeys.colors);
  return res.json(new ApiResponse(200, {}, SuccessMessage.COLOR_DELETED));
});
