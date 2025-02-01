import { Router } from "express";

const ProductPublicRouter = Router();
import * as ProductController from "../../Controller/Product/ProductController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as ProductValidation from "../../Validation/Product/ProductValidation";
ProductPublicRouter.get("/get-one-product/:productId", ProductController.getProductById);
ProductPublicRouter.get("/get-all-product",ProductController.getAllProducts);
ProductPublicRouter.get("/get-all-sale",ProductController.getAllSaleProducts);
ProductPublicRouter.get("/search-product",ProductController.SearchProducts);
ProductPublicRouter.get("/sort-by",ProductController.sortProduct);
ProductPublicRouter.get("/sort-by-price",ProductController.sortProductByPrice);
ProductPublicRouter.get("/get-category/:categoryId",Validation(ProductValidation.getAllProductsByCategoryIdValidation), ProductController.getAllProductsByCategoryId);

ProductPublicRouter.get("/",ProductController.sortProductByRangeAndPrice);
export default ProductPublicRouter;