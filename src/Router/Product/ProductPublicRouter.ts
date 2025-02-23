import { Router } from "express";

const ProductPublicRouter = Router();
import * as ProductController from "../../Controller/Product/ProductController";
ProductPublicRouter.get("/get-one-product/:productId", ProductController.getProductById);
ProductPublicRouter.get("/get-all-product",ProductController.getAllProducts);
ProductPublicRouter.get("/get-all-sale",ProductController.getAllSaleProducts);
ProductPublicRouter.get("/search-product",ProductController.SearchProducts);
ProductPublicRouter.get("/sort-by",ProductController.sortProduct);
ProductPublicRouter.get("/sort-by-price",ProductController.sortProductByPrice);
ProductPublicRouter.post("/available-items",ProductController.getProductsAndAvailableItems);
ProductPublicRouter.get("/get-category/:categoryId", ProductController.getAllProductsByCategoryId);
ProductPublicRouter.get("/",ProductController.sortProductByRangeAndPrice);
export default ProductPublicRouter;