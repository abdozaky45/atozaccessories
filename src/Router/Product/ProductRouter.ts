import { Router } from "express";
const ProductRouter = Router();
import * as ProductController from "../../Controller/Product/ProductController";
ProductRouter.post("/create", ProductController.CreateProduct);
ProductRouter.patch("/update/:productId", ProductController.updateProduct);
ProductRouter.delete("/delete/:productId", ProductController.deleteProduct);
export default ProductRouter;