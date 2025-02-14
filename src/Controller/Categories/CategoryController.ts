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
} from "../../Service/CategoryService/CategoryService";
import SuccessMessage from "../../Utils/SuccessMessages";
export const CreateNewCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { categoryName, imageUrl } = req.body;
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
        { },
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
    if (!result) {
      throw new ApiError(
        404,
        ErrorMessages.CATEGORY_NOT_FOUND_OR_EALREADY_DELETED
      );
    }
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
