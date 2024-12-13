import { Schema, model } from "mongoose";
import {Iwishlist} from "./Iwishlist";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import { RefType, RequiredNumber } from "../../Utils/Schemas";
const WishlistSchema = new Schema<Iwishlist>(
  {
    user: RefType(SchemaTypesReference.User, true),
    productId: RefType(SchemaTypesReference.Product, true),
    createdAt: RequiredNumber,
  },
);
const WishListModel = model(SchemaTypesReference.Wishlist, WishlistSchema);
export default WishListModel;