import WishListModel from "../../Model/Wishlist/WishlistModel";
import { Types } from "mongoose";

export const AddProductToFavorites = async (
  user: string,
  productId: string,
  createdAt: number
) => {
  const product = await WishListModel.create({ user, productId, createdAt });
  return product;
};
export const removeProductFromFavorites = async (
  user: string,
  productId: string
) => {
  const product = await WishListModel.findOneAndDelete({ user, productId });
  return product;
};
export const getUserWishlist = async (user: string) => {
  const product = await WishListModel.find({ user }).populate({
    path: "productId",
    select:
      "productName price salePrice discount discountPercentage isSale defaultImage albumImages",
  });
  return product;
};
export const getAllWishlist = async (page: number) => {
  let limit = 20;
  page = !page || page < 1 || isNaN(page) ? 1 : page;
  const skip = limit * (page - 1);
  const totalItems = await WishListModel.countDocuments();
  const totalPages = Math.ceil(totalItems / limit);
  const products = await WishListModel.find({})
    .populate({
      path: "user"
    })
    .populate({
      path: "productId",
      select:
        "productName price salePrice discount discountPercentage isSale defaultImage albumImages soldItems availableItems",
    })
    .skip(skip)
    .limit(limit)
    .exec();
  return { totalItems, totalPages, currentPage: page, products };
};
export const getWishlistById = async (userId: string, wishlistId: string) => {
  const product = await WishListModel.findOne({
    _id: wishlistId,
    user: userId,
  }).populate({
    path: "productId",
    select:
      "productName price salePrice discount discountPercentage isSale defaultImage albumImages",
  });
  return product;
};
export const getProductWishlist = async (productId: Types.ObjectId | string, user: Types.ObjectId | string) => {
  const wishlistEntry = await WishListModel.findOne({
    user,
    productId
  });
  return wishlistEntry;
}