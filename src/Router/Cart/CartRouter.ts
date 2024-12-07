import { Router } from "express";
const CartRouter = Router();
import * as CartController from "../../Controller/Cart/CartController";
CartRouter.post("/create-or-update-cart", CartController.createOrUpdateCart);
CartRouter.get("/get-cart", CartController.getAllProductsInCart);
CartRouter.patch("/update-quantity", CartController.updateQuantityCart);
CartRouter.patch(
  "/delete-product",
  CartController.removeProductFromCart
);
CartRouter.put("/clear-cart", CartController.clearCartUser);
export default CartRouter;
