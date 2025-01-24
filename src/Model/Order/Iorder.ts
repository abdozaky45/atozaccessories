import { Types } from "mongoose";
import Iuser from "../User/UserInformation/Iuser";
import IProduct from "../Product/Iproduct";
import IShipping from "../Shipping/Ishipping";

interface ProductOrder {
    productId: Types.ObjectId | string | IProduct;
    productName?: string;
    quantity?: number;
    itemPrice?: number;
    totalPrice?: number;
}

interface IOrder {
    user: Types.ObjectId | string;
    userInformation: Types.ObjectId | string | Iuser;
    shipping: Types.ObjectId | string | IShipping;
    products: ProductOrder[];
    price: number;
    status: string;
}
export {IOrder , ProductOrder};