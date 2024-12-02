import { Router } from "express";

const ProductPublicRouter = Router();
import * as ProductController from "../../Controller/Product/ProductController";
ProductPublicRouter.get("/get-one-product/:productId", ProductController.getProductById);
export default ProductPublicRouter;