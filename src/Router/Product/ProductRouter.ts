import { Router } from "express";
const ProductRouter = Router();
import * as ProductController from "../../Controller/Product/ProductController";
ProductRouter.post("/create", ProductController.CreateProduct);
export default ProductRouter;