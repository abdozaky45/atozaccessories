import { Router } from "express";
const ProductRouter = Router();
import * as ProductController from "../../Controller/Product/ProductController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as ProductValidation from "../../Validation/Product/ProductValidation";

// Named routes must come before /:id to avoid param capture
ProductRouter.get("/analysis", ProductController.getAnalysis);

ProductRouter.get(
  "/",
  Validation(ProductValidation.adminGetProductsValidation),
  ProductController.getAdminProductsList
);

ProductRouter.post(
  "/",
  Validation(ProductValidation.createProductValidation),
  ProductController.CreateProduct
);

ProductRouter.get("/:id", ProductController.getAdminProductById);

ProductRouter.put(
  "/:id",
  Validation(ProductValidation.updateProductValidation),
  ProductController.updateProduct
);

ProductRouter.patch(
  "/:id/toggle-bestseller",
  Validation(ProductValidation.toggleBestSellerValidation),
  ProductController.toggleBestSellerHandler
);

ProductRouter.patch(
  "/:id/bestseller-release",
  Validation(ProductValidation.releaseBestSellerValidation),
  ProductController.releaseBestSellerHandler
);

ProductRouter.delete(
  "/:id/hard",
  Validation(ProductValidation.hardDeleteValidation),
  ProductController.hardDelete
);

ProductRouter.delete(
  "/:productId/variants/:variantId",
  Validation(ProductValidation.deleteVariantValidation),
  ProductController.deleteVariant
);

ProductRouter.delete(
  "/:id",
  Validation(ProductValidation.deleteProductValidation),
  ProductController.deleteProduct
);

export default ProductRouter;
