import WishListModel from "../../Model/Wishlist/WishlistModel";
import UserModel from "../../Model/User/UserInformation/UserModel";
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
      // Auth user: only safe fields (never expose activeCode / codeCreatedAt)
      path: "user",
      select: "email role status isConfirmed",
    })
    .populate({
      path: "productId",
      select:
        "productName price salePrice discount discountPercentage isSale defaultImage albumImages soldItems availableItems",
     populate:{
      path: "category",
      select: "categoryName image slug"
     }
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  // Enrich each entry with the customer's profile (name / phone / address), which
  // lives in the UserInformation collection — not on the auth user document.
  // A user may have several saved profiles; we attach the most recently created one.
  const userIds = products.map((w: any) => w.user?._id).filter(Boolean);

  const profiles = userIds.length
    ? await UserModel.find({ user: { $in: userIds }, isDeleted: false })
        .select(
          "user firstName lastName primaryPhone secondaryPhone country address apartmentSuite postalCode createdAt"
        )
        .populate({ path: "shipping", select: "category cost" })
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const profileByUser = new Map<string, any>();
  for (const profile of profiles) {
    const key = profile.user.toString();
    if (!profileByUser.has(key)) profileByUser.set(key, profile); // most recent wins
  }

  const enriched = products.map((w: any) => ({
    ...w,
    userInformation: w.user ? profileByUser.get(w.user._id.toString()) ?? null : null,
  }));

  return { totalItems, totalPages, currentPage: page, products: enriched };
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