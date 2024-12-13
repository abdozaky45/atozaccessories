import { Router } from "express";
import * as wishlistController from "../../Controller/Wishlist/WishlistController";

const wishlistRouter = Router();
wishlistRouter.post("/add-to-wishlist",wishlistController.createWishlist);
wishlistRouter.get("/favorite-product/:wishlistId",wishlistController.getWishlistByUserId);
wishlistRouter.get("/get-user-wishlist",wishlistController.getAllUserWishlist);
wishlistRouter.get("/get-all-wishlist",wishlistController.getAllWishlistProduct);
wishlistRouter.delete("/delete-favorite-product/:productId",wishlistController.deleteWishlist);
export default wishlistRouter;
