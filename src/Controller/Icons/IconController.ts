import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import SuccessMessage from "../../Utils/SuccessMessages";
import {
  createIcon,
  findIconById,
  findIconByKey,
  getAllIcons,
  prepareIconUpdates,
  deleteIconById,
} from "../../Service/IconService/IconService";

export const createNewIcon = asyncHandler(async (req: Request, res: Response) => {
  const { key, svg, isActive } = req.body;
  const existing = await findIconByKey(key);
  if (existing) {
    throw new ApiError(409, ErrorMessages.ICON_KEY_ALREADY_EXISTS);
  }
  const icon = await createIcon({ key, svg, isActive });
  return res.json(new ApiResponse(200, { icon }, SuccessMessage.ICON_CREATED));
});

export const getIcons = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const result = await getAllIcons(page);
  return res.json(new ApiResponse(200, result));
});

export const getIconById = asyncHandler(async (req: Request, res: Response) => {
  const icon = await findIconById(req.params._id);
  if (!icon) {
    throw new ApiError(404, ErrorMessages.ICON_NOT_FOUND);
  }
  return res.json(new ApiResponse(200, { icon }));
});

export const updateIcon = asyncHandler(async (req: Request, res: Response) => {
  const icon = await findIconById(req.params._id);
  if (!icon) {
    throw new ApiError(404, ErrorMessages.ICON_NOT_FOUND);
  }
  const { key, svg, isActive } = req.body;
  if (key && key !== icon.key) {
    const existing = await findIconByKey(key);
    if (existing) {
      throw new ApiError(409, ErrorMessages.ICON_KEY_ALREADY_EXISTS);
    }
  }
  const updates = prepareIconUpdates(icon, key, svg, isActive);
  if (updates) {
    await icon.save();
    return res.json(new ApiResponse(200, { icon }, SuccessMessage.ICON_UPDATED));
  }
  return res.json(new ApiResponse(200, {}, SuccessMessage.NO_UPDATE_ICON));
});

export const deleteIcon = asyncHandler(async (req: Request, res: Response) => {
  const icon = await deleteIconById(req.params._id);
  if (!icon) {
    throw new ApiError(404, ErrorMessages.ICON_NOT_FOUND);
  }
  return res.json(new ApiResponse(200, {}, SuccessMessage.ICON_DELETED));
});
