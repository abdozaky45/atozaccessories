import CartInterfaceModel from "../../Model/Cart/CartInterfaceModel";
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
      $setOnInsert: { createdAt  }, 
    },
    { new: true, upsert: true } 
  );
  return cart;
};
