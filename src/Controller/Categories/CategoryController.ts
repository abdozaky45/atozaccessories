import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
import moment from "../../../src/Utils/DateAndTime";
import {
  createCategory,
  deleteCategory,
  extractMediaId,
  findCategoryById,
  prepareCategoryUpdates,
  getAllCategories,
  deletePresignedURL,
} from "../../Service/CategoryService/CategoryService";
import SuccessMessage from "../../Utils/SuccessMessages";
export const CreateNewCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoryName, imageUrl } = req.body;
    if (!categoryName || !imageUrl) {
      throw new ApiError(400, ErrorMessages.INVALID_CATEGORY_DATA);
    }
    const mediaId =  extractMediaId(imageUrl);
    const category = await createCategory({
      categoryName,
      mediaUrl: imageUrl,
      mediaId,
      createdBy: req.body.currentUser.userInfo._id,
      createdAt: moment().valueOf(),
    });
    return res.json(
      new ApiResponse(200, { category }, SuccessMessage.CATEGORY_CREATED)
    );
  }
);
export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const Category = await findCategoryById(req.params._id);
    if (!Category) {
      throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND);
    }
    if (
      req.body.currentUser.userInfo._id.toString() !==
      Category.createdBy.toString()
    ) {
      throw new ApiError(403, ErrorMessages.UNAUTHORIZED_ACCESS);
    }
    const updates = await prepareCategoryUpdates(
      Category,
      req.body.categoryName,
      req.body.imageUrl
    );
    if (updates) {
      await Category.save();
      return res.json(
        new ApiResponse(
          200,
          { category: Category },
          SuccessMessage.CATEGORY_UPDATED
        )
      );
    }
    return res.json(
      new ApiResponse(
        200,
        { createCategory },
        SuccessMessage.NO_UPDATE_CATEGORY
      )
    );
  }
);
export const deleteOneCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const Category = await findCategoryById(req.params._id);
    if (!Category) {
      throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND);
    }
    if (
      req.body.currentUser.userInfo._id.toString() !==
      Category.createdBy.toString()
    ) {
      throw new ApiError(403, ErrorMessages.UNAUTHORIZED_ACCESS);
    }
    const result = await deleteCategory(req.params._id);
    if (result.deletedCount === 0) {
      throw new ApiError(
        404,
        ErrorMessages.CATEGORY_NOT_FOUND_OR_EALREADY_DELETED
      );
    }
    await deletePresignedURL(Category.image.mediaId);
    return res.json(
      new ApiResponse(200, {}, SuccessMessage.CATEGORY_DELETED_SUCCESS)
    );
  }
);
export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await getAllCategories();
    return res.json(new ApiResponse(200, { categories }));
  }
);
export const getCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    if(!req.params.categoryId) {
      throw new ApiError(400, ErrorMessages.DATA_IS_REQUIRED);
    }
  const category = await findCategoryById(req.params.categoryId);
    if (!category) {
      throw new ApiError(404, ErrorMessages.CATEGORY_NOT_FOUND);
    }
    return res.json(new ApiResponse(200, { category }));
  }
);
