import { Router } from "express";
import * as categoryController from "../../Controller/Categories/CategoryController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as CategoryValidation from "../../Validation/Category/CategoryValidation";
const categoryRouter = Router();
categoryRouter.post("/create", Validation(CategoryValidation.createCategoryValidation), categoryController.CreateNewCategory);
categoryRouter.patch("/update/:_id", Validation(CategoryValidation.updateCategoryValidation), categoryController.updateCategory);
categoryRouter.delete("/delete/:_id", Validation(CategoryValidation.deleteCategoryValidation), categoryController.deleteOneCategory);
export default categoryRouter;
