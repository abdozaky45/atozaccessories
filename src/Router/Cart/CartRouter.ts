import { Router } from "express";
const CartRouter = Router();
import * as CartController from "../../Controller/Cart/CartController";
CartRouter.post("/create-or-update-cart", CartController.createOrUpdateCart);
export default CartRouter;
