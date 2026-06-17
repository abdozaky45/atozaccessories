import { model, Schema, Types } from 'mongoose';
import { EnumStringRequired, NotRequiredString, RequiredNumber, RequiredString } from '../../Utils/Schemas';
import SchemaTypesReference from '../../Utils/Schemas/SchemaTypesReference';
import { orderStatusArray } from '../../Utils/OrderStatusType';
import { IOrder } from './Iorder';

const OrderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: SchemaTypesReference.User, required: true },
  userInformation: {
    _id: false,
    firstName: RequiredString,
    lastName: RequiredString,
    address: RequiredString,
    primaryPhone: RequiredString,
    secondaryPhone: NotRequiredString,
    country: NotRequiredString,
    postalCode: NotRequiredString,
  },
  shipping: {
    _id: false,
    name: RequiredString,
    cost: RequiredNumber,
  },
  products: [{
    _id: false,
    productId:   { type: Types.ObjectId, ref: SchemaTypesReference.Product, required: true },
    variantId:   { type: Types.ObjectId, ref: SchemaTypesReference.ProductVariant, required: true },
    quantity:    RequiredNumber,
    productName: RequiredString,
    itemPrice:   RequiredNumber,
    totalPrice:  RequiredNumber,
    size:        RequiredString,
    color:       RequiredString,
    isFreeGift:  { type: Boolean, default: false },
  }],
  subTotal:     RequiredNumber,
  discount:     RequiredNumber,
  freeShipping: { type: Boolean, default: false },
  shippingCost: RequiredNumber,
  totalAmount:  RequiredNumber,
  appliedOffer: { type: Types.ObjectId, ref: SchemaTypesReference.Offer, default: null },
  appliedFlashOffers: [{ type: Types.ObjectId, ref: SchemaTypesReference.Offer }],
  status:       EnumStringRequired(orderStatusArray),
}, {
  timestamps: true,
});

export default model(SchemaTypesReference.Order, OrderSchema);
