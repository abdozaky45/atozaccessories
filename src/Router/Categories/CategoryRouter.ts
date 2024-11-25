import { Router } from "express";
import * as categoryController from "../../Controller/Categories/CategoryController";
const categoryRouter = Router();
categoryRouter.post("/create", categoryController.CreateNewCategory);
categoryRouter.patch("/update/:_id", categoryController.updateCategory);
categoryRouter.delete("/delete/:_id", categoryController.deleteOneCategory);
export default categoryRouter;
