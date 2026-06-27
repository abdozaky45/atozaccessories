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
  getDeletedCategories,
  hardDeleteCategory,
} from "../../Service/CategoryService/CategoryService";
import { findIconById } from "../../Service/IconService/IconService";
import SuccessMessage from "../../Utils/SuccessMessages";
import { getOrSet, cacheDel } from "../../Utils/Cache";
import { CacheKeys, CacheTTL } from "../../Utils/Cache/keys";

// Categories also drive the home page sections, so any category write drops both.
const invalidateCategoryCaches = () => cacheDel(CacheKeys.categories, CacheKeys.home);

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
  await invalidateCategoryCaches();
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
    await invalidateCategoryCaches();
    return res.json(new ApiResponse(200, { category: Category }, SuccessMessage.CATEGORY_UPDATED));
  }
  return res.json(new ApiResponse(200, {}, SuccessMessage.NO_UPDATE_CATEGORY));
});

export const deleteOneCategory = asyncHandler(async (req: Request, res: Response) => {
  const Category = await findCategoryById(req.params.id);
  if (!Category) throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND);

  const result = await deleteCategory(req.params.id);
  if (!result) throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND_OR_EALREADY_DELETED);

  await invalidateCategoryCaches();
  return res.json(new ApiResponse(200, {}, SuccessMessage.CATEGORY_DELETED_SUCCESS));
});

export const hardDeleteCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const category = await findCategoryById(id);
  if (!category) throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND);

  const summary = await hardDeleteCategory(id);

  await invalidateCategoryCaches();
  return res.json(new ApiResponse(200, summary, SuccessMessage.CATEGORY_DELETED_SUCCESS));
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { categories } = await getOrSet(CacheKeys.categories, CacheTTL.reference, async () => ({
    categories: await getAllCategories(),
  }));
  return res.json(new ApiResponse(200, { categories }));
});

// Admin only — returns soft-deleted categories (isDeleted: true). No pagination.
export const getDeletedCategoriesList = asyncHandler(async (req: Request, res: Response) => {
  const categories = await getDeletedCategories();
  return res.json(new ApiResponse(200, { categories }));
});

export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.params.categoryId) throw new ApiError(400, ErrorMessages.DATA_IS_REQUIRED);

  const category = await findCategoryById(req.params.categoryId);
  // Hide soft-deleted categories from users
  if (!category || category.isDeleted) throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND);

  return res.json(new ApiResponse(200, { category }));
});
