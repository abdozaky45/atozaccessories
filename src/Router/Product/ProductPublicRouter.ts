import { Router } from "express";
const ProductPublicRouter = Router();
import * as ProductController from "../../Controller/Product/ProductController";
import OrderController from "../../Controller/Order/OrderController";
import * as orderValidation from "../../Validation/Order/OrderValidation";
import * as ProductValidation from "../../Validation/Product/ProductValidation";
import { Validation } from "../../middleware/ValidationMiddleware";

// Public cart pricing — live offers/flash applied, no auth or address required.
ProductPublicRouter.post(
  "/cart-preview",
  Validation(orderValidation.cartPreviewValidation),
  OrderController.previewCartController
);

// Named routes must come before /:id
ProductPublicRouter.get(
  "/search",
  ProductController.SearchProducts
);

// Social-share OG preview — returns HTML (not JSON) for crawler cards.
ProductPublicRouter.get(
  "/share/:productId",
  Validation(ProductValidation.getProductShareValidation),
  ProductController.getProductSharePreview
);

ProductPublicRouter.post(
  "/available-items",
  ProductController.getProductsAndAvailableItems
);

ProductPublicRouter.post(
  "/variants-availability",
  ProductController.getVariantsAndAvailableItems
);

ProductPublicRouter.get("/", ProductController.getProductsList);

ProductPublicRouter.get("/:id", ProductController.getProductById);

export default ProductPublicRouter;
