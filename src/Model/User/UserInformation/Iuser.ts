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
  isDeleted?: boolean;
  user: Types.ObjectId | string;
}
