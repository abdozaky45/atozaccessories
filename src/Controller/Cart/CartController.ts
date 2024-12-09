import { Request, Response, NextFunction } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { ProductItem } from "../../Model/Cart/CartInterfaceModel";
import moment from "../../Utils/DateAndTime";
import ErrorMessages from "../../Utils/Error";
import { findProductById } from "../../Service/Product/ProductService";
import {
  checkProductInCart,
  clearCart,
  getAllProductsInCartByUserId,
  removeProductInCart,
  updateCart,
  updateQuantity,
} from "../../Service/Cart/CartService";
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
      isProductInCart.items.forEach((productObj: ProductItem) => {
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
export const getAllProductsInCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.body.currentUser.userInfo._id;
    const cartWithProducts = await getAllProductsInCartByUserId(userId);
    if (!cartWithProducts)
      throw new ApiError(404, ErrorMessages.CART_NOT_FOUND);
    return res.json(
      new ApiResponse(200, { cartWithProducts }, SuccessMessage.CART_FOUND)
    );
  }
);
export const updateQuantityCart = asyncHandler(
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
    const updates = await updateQuantity(productId, quantity, userId);
    return res.json(
      new ApiResponse(200, { updates }, SuccessMessage.QUANTITY_CART_UPDATED)
    );
  }
);
export const removeProductFromCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.body.currentUser.userInfo._id;
    const { productId } = req.body;
    const cart = await removeProductInCart(userId, productId);
    if (!cart) throw new ApiError(404, ErrorMessages.CART_NOT_FOUND);
    return res.json(
      new ApiResponse(200, { cart }, SuccessMessage.PRODUCT_DELETED)
    );
  }
);
export const clearCartUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.body.currentUser.userInfo._id;
    const clear = await clearCart(userId);
    if (!clear) throw new ApiError(404, ErrorMessages.CART_NOT_FOUND);
    return res.json(
      new ApiResponse(200, { clear }, SuccessMessage.CART_CLEARED)
    );
  }
);
