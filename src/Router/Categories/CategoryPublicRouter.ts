import { Router } from "express";
import { getCategories } from "../../Controller/Categories/CategoryController";
const categoryPublicRouter = Router();
categoryPublicRouter.get("/get-all-categories",getCategories);
export default categoryPublicRouter;