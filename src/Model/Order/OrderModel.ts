import { model, Schema, Types } from 'mongoose';
import { EnumStringRequired, RefType, RequiredNumber, RequiredUniqueString } from '../../Utils/Schemas';
import SchemaTypesReference from '../../Utils/Schemas/SchemaTypesReference';
import { orderStatusArray } from '../../Utils/OrderStatusType';
import { IOrder } from './Iorder';
const OrderSchema = new Schema<IOrder>({
    orderCode: RequiredUniqueString,
    user: RefType(SchemaTypesReference.User, true),
    userInformation: RefType(SchemaTypesReference.UserInformation, true),
    shipping: RefType(SchemaTypesReference.Shipping, true),
    products: [{
        productId: {
            type: Types.ObjectId,
            ref: SchemaTypesReference.Product,
            required: true
        },
        quantity: RequiredNumber,
        itemPrice: RequiredNumber,
        totalPrice: RequiredNumber
    }],
    invoice: {
        secure_url: {
            type: String
        },
        public_id: {
            type: String
        }
    },
    price: RequiredNumber,
    status: EnumStringRequired(orderStatusArray),
}, {
    timestamps: true
});
export default model(SchemaTypesReference.Order, OrderSchema);