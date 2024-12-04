import { Router } from "express";

const ProductPublicRouter = Router();
import * as ProductController from "../../Controller/Product/ProductController";
ProductPublicRouter.get("/get-one-product/:productId", ProductController.getProductById);
ProductPublicRouter.get("/get-all-product",ProductController.getAllProducts);
ProductPublicRouter.get("/get-all-sale",ProductController.getAllSaleProducts)

export default ProductPublicRouter;