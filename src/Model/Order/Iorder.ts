import { Types } from "mongoose";

interface UserInfoSnapshot {
  firstName: string;
  lastName: string;
  address: string;
  primaryPhone: string;
  secondaryPhone?: string;
  country?: string;
  postalCode?: string;
}

interface ShippingSnapshot {
  name: string;
  cost: number;
}

interface ProductOrder {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  quantity: number;
  productName: string;
  itemPrice: number;
  totalPrice: number;
  size: string;
  color: string;
}

interface IOrder {
  user: Types.ObjectId;
  userInformation: UserInfoSnapshot;
  shipping: ShippingSnapshot;
  products: ProductOrder[];
  subTotal: number;
  discount: number;
  freeShipping: boolean;
  shippingCost: number;
  totalAmount: number;
  appliedOffer: Types.ObjectId | null;
  status: string;
}

export { IOrder, ProductOrder, UserInfoSnapshot, ShippingSnapshot };
