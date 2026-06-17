import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import moment from "../../Utils/DateAndTime";
import {
  createCategory,
  deleteCategory,
  extractMediaId,
  findCategoryById,
  prepareCategoryUpdates,
  getAllCategories,
  hardDeleteCategory,
} from "../../Service/CategoryService/CategoryService";
import { findIconById } from "../../Service/IconService/IconService";
import SuccessMessage from "../../Utils/SuccessMessages";

export const CreateNewCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryName, imageUrl, icon_id } = req.body;

  if (icon_id) {
    const icon = await findIconById(icon_id);
    if (!icon) throw new ApiError(404, ErrorMessages.ICON_NOT_FOUND);
  }

  const mediaId = extractMediaId(imageUrl);
  const category = await createCategory({
    categoryName,
    mediaUrl: imageUrl,
    mediaId,
    createdBy: req.body.currentUser.userInfo._id,
    createdAt: moment().valueOf(),
    icon_id,
  });
  return res.json(new ApiResponse(200, { category }, SuccessMessage.CATEGORY_CREATED));
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const Category = await findCategoryById(req.params.id);
  if (!Category) throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND);

  const { icon_id } = req.body;
  if (icon_id) {
    const icon = await findIconById(icon_id);
    if (!icon) throw new ApiError(404, ErrorMessages.ICON_NOT_FOUND);
  }

  const updates = await prepareCategoryUpdates(Category, req.body.categoryName, req.body.imageUrl, icon_id);
  if (updates) {
    await Category.save();
    return res.json(new ApiResponse(200, { category: Category }, SuccessMessage.CATEGORY_UPDATED));
  }
  return res.json(new ApiResponse(200, {}, SuccessMessage.NO_UPDATE_CATEGORY));
});

export const deleteOneCategory = asyncHandler(async (req: Request, res: Response) => {
  const Category = await findCategoryById(req.params.id);
  if (!Category) throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND);

  const result = await deleteCategory(req.params.id);
  if (!result) throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND_OR_EALREADY_DELETED);

  return res.json(new ApiResponse(200, {}, SuccessMessage.CATEGORY_DELETED_SUCCESS));
});

export const hardDeleteCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const category = await findCategoryById(id);
  if (!category) throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND);

  const summary = await hardDeleteCategory(id);

  return res.json(new ApiResponse(200, summary, SuccessMessage.CATEGORY_DELETED_SUCCESS));
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await getAllCategories();
  return res.json(new ApiResponse(200, { categories }));
});

export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.params.categoryId) throw new ApiError(400, ErrorMessages.DATA_IS_REQUIRED);

  const category = await findCategoryById(req.params.categoryId);
  // Hide soft-deleted categories from users
  if (!category || category.isDeleted) throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND);

  return res.json(new ApiResponse(200, { category }));
});
