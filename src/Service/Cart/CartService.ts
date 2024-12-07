import {CartInterfaceModel} from "../../Model/Cart/CartInterfaceModel";
import CartModel from "../../Model/Cart/CartModel";

export const checkProductInCart = async (user: string, productId: string) => {
  const cart = await CartModel.findOne({
    user,
    "items.productId": productId,
  });
  return cart;
};
export const updateCart = async (
  user: string,
  productId: string,
  quantity: number,
  createdAt: number
) => {
  const cart = await CartModel.findOneAndUpdate(
    {
      user,
      "items.productId": { $ne: productId },
    },
    {
      $push: { items: { productId, quantity } },
      $setOnInsert: { createdAt },
    },
    { new: true, upsert: true }
  );
  return cart;
};
export const findCartByUserId = async (
  userId: string
): Promise<CartInterfaceModel | null> => {
  const cart = await CartModel.findOne({ user: userId });
  return cart;
};
export const getAllProductsInCartByUserId = async (userId: string) => {
  const cart = await CartModel.findOne({ user: userId }).populate({
    path: "items.productId",
    select:
      "productName price salePrice discount discountPercentage isSale defaultImage albumImages",
  });
  return cart;
};
export const updateQuantity = async (
  productId: string,
  quantity: number,
  userId: string
) => {
  const cart = await CartModel.findOneAndUpdate(
    { user: userId, "items.productId": productId },
    {$set:{"items.$.quantity": quantity}},
    {new: true}
  );
  return cart;
};
export const removeProductInCart = async(userId: string, productId: string) => {
  const cart = await CartModel.findOneAndUpdate(
    { user: userId, "items.productId": productId },
    {$pull:{items:{productId}}},
    {new: true}
  );
  return cart;

}
export const clearCart = async (userId: string) => {
  const cart = await CartModel.findOneAndUpdate(
    { user: userId },
    { $set: { items: [] } },
    { new: true }
  );
  return cart;
};