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
},{toJSON:{virtuals:true},toObject:{virtuals:true}});
CartSchema.virtual("total").get(function (this: CartInterfaceModel) {
  if (!this.items || this.items.length === 0) return 0;

  return this.items.reduce((total, item) => {
    const product = item.productId as any; 
    const price = product?.price || 0;  
    const salePrice = product?.salePrice || 0;  
    const discount = product?.discount || 0;  

    const finalPrice = salePrice > 0 ? salePrice : price - (price * Math.min(discount, 100)) / 100;

    return total + item.quantity * finalPrice;
  }, 0);
});



const CartModel = model(SchemaTypesReference.Cart, CartSchema);
export default CartModel;
