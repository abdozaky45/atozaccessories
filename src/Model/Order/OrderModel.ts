import { model, Schema, Types } from 'mongoose';
import { EnumStringRequired, RefType, RequiredNumber, RequiredString, RequiredUniqueString } from '../../Utils/Schemas';
import SchemaTypesReference from '../../Utils/Schemas/SchemaTypesReference';
import { orderStatusArray } from '../../Utils/OrderStatusType';
import { IOrder } from './Iorder';
const OrderSchema = new Schema<IOrder>({
    user: RefType(SchemaTypesReference.User, true),
    userInformation: RefType(SchemaTypesReference.UserInformation, true),
    shipping: RefType(SchemaTypesReference.Shipping, true),
    products: [{
        _id: false,
        productId: {
            type: Types.ObjectId,
            ref: SchemaTypesReference.Product,
            required: true
        },
        productName:RequiredString,
        quantity: RequiredNumber,
        itemPrice: RequiredNumber,
        totalPrice: RequiredNumber
    }],
    price: RequiredNumber,
    status: EnumStringRequired(orderStatusArray),
}, {
    timestamps: true
});
export default model(SchemaTypesReference.Order, OrderSchema);