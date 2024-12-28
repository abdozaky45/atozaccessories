import { Types } from "mongoose";

interface Invoice {
    secure_url?: string;
    public_id?: string;
}
interface ProductOrder {
    productId: Types.ObjectId;
    quantity?: number;
    itemPrice?: number;
    totalPrice?: number;
}

interface IOrder {
    orderCode: string;
    user: Types.ObjectId | string;
    userInformation: Types.ObjectId | string;
    shipping: Types.ObjectId | string;
    products: ProductOrder[];
    invoice?: Invoice;
    price: number;
    status: string;
}
export {IOrder , ProductOrder};