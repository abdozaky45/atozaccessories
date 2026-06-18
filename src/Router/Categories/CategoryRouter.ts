import { Router } from "express";
import * as categoryController from "../../Controller/Categories/CategoryController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as CategoryValidation from "../../Validation/Category/CategoryValidation";
import { baseSchema } from "../../Validation/baseSchema";

const categoryRouter = Router();

// Named routes must come before /:id to avoid param capture
categoryRouter.get(
  "/deleted",
  Validation(baseSchema),
  categoryController.getDeletedCategoriesList
);

categoryRouter.post(
  "/",
  Validation(CategoryValidation.createCategoryValidation),
  categoryController.CreateNewCategory
);

categoryRouter.patch(
  "/:id",
  Validation(CategoryValidation.updateCategoryValidation),
  categoryController.updateCategory
);

// Hard delete must come before soft delete to prevent /:id capturing "hard"
categoryRouter.delete(
  "/:id/hard",
  Validation(CategoryValidation.hardDeleteCategoryValidation),
  categoryController.hardDeleteCategoryHandler
);

categoryRouter.delete(
  "/:id",
  Validation(CategoryValidation.deleteCategoryValidation),
  categoryController.deleteOneCategory
);

export default categoryRouter;
