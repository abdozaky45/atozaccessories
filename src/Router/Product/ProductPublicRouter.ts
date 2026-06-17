import { Router } from "express";
const ProductPublicRouter = Router();
import * as ProductController from "../../Controller/Product/ProductController";

// Named routes must come before /:id
ProductPublicRouter.get(
  "/search",
  ProductController.SearchProducts
);

ProductPublicRouter.post(
  "/available-items",
  ProductController.getProductsAndAvailableItems
);

ProductPublicRouter.get("/", ProductController.getProductsList);

ProductPublicRouter.get("/:id", ProductController.getProductById);

export default ProductPublicRouter;
