import { Request, Response, NextFunction } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import CartInterfaceModel, {
  CartItems,
} from "../../Model/Cart/CartInterfaceModel";
import moment from "../../Utils/DateAndTime";
import ErrorMessages from "../../Utils/Error";
import { findProductById } from "../../Service/Product/ProductService";
import { checkProductInCart, updateCart } from "../../Service/Cart/CartService";
import SuccessMessage from "../../Utils/SuccessMessages";
export const createOrUpdateCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productId, quantity } = req.body;
    const userId = req.body.currentUser.userInfo._id;
    if (!productId || !quantity)
      throw new ApiError(404, ErrorMessages.DATA_IS_REQUIRED);
    const Product = await findProductById(productId);
    if (!Product) throw new ApiError(404, ErrorMessages.PRODUCT_NOT_FOUND);
    if (quantity > Product.availableItems)
      return res.status(400).json({
        statusCode: 400,
        message: `Sorry, only ${Product.availableItems} items left in stock!`,
      });
    const isProductInCart = await checkProductInCart(userId, productId);
    if (isProductInCart) {
      isProductInCart.items.forEach((productObj: CartItems) => {
        if (
          productObj.productId.toString() === productId.toString() &&
          productObj.quantity + quantity < Product.availableItems
        ) {
          productObj.quantity += quantity;
        }
      });
      await isProductInCart.save();
      return res
        .status(200)
        .json(
          new ApiResponse(200, { isProductInCart }, SuccessMessage.CART_UPDATED)
        );
    } else {
      const cart = await updateCart(
        userId,
        productId,
        quantity,
        moment().valueOf()
      );
      return res
        .status(200)
        .json(
          new ApiResponse(200, { cart }, SuccessMessage.ADD_PRODUCT_TO_CART)
        );
    }
  }
);
