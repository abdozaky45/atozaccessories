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
  /** True for a free item granted by the spend_x_get_free_item offer. */
  isFreeGift?: boolean;
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
  /** The single cart offer applied to this order (most valuable to the customer). */
  appliedOffer: Types.ObjectId | null;
  /** Flash-sale offers applied to specific products in this order (independent of the cart offer). */
  appliedFlashOffers: Types.ObjectId[];
  status: string;
}

export { IOrder, ProductOrder, UserInfoSnapshot, ShippingSnapshot };
