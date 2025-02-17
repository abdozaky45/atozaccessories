import { Types } from "mongoose";
import IShipping from "../../Shipping/Ishipping";

export default interface Iuser {
  country?: string;
  firstName: string;
  lastName: string;
  address: string;
  apartmentSuite?: string;
  shipping: string | Types.ObjectId | IShipping | any;
  postalCode?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  isDeleted?: boolean;
  user: Types.ObjectId | string;
}
