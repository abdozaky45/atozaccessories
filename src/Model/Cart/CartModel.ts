import { Schema, model } from "mongoose";
import CartInterfaceModel from "./CartInterfaceModel";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
import { RefType, RequiredNumber } from "../../Utils/Schemas";
const CartSchema = new Schema<CartInterfaceModel>({
  user: RefType(SchemaTypesReference.User, false),
  items: {
    type: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: SchemaTypesReference.Product,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
      },
    ],
    required:true,
  },
  createdAt: RequiredNumber,
});
const CartModel = model(SchemaTypesReference.Cart, CartSchema);
export default CartModel;
