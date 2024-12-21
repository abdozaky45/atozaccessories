import { Types } from "mongoose";

export default interface Iuser {
  country?: string;
  firstName: string;
  lastName: string;
  address: string;
  apartmentSuite?: string;
  governorate: string;
  postalCode?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  user: Types.ObjectId | string;
}
