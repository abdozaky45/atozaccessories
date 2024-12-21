import { Types, Schema, model } from "mongoose";
import Iuser from "./Iuser";
import {
  EnumStringRequired,
  NotRequiredString,
  RefType,
  RequiredDefaultStringCity,
  RequiredString,
} from "../../../Utils/Schemas";
import { governorateArray } from "../../../Utils/Governorate/GovernorateEnum";
import SchemaTypesReference from "../../../Utils/Schemas/SchemaTypesReference";
const userSchema = new Schema<Iuser>({
  user: RefType(SchemaTypesReference.User, true),
  country:RequiredDefaultStringCity,
  firstName: RequiredString,
  lastName: RequiredString,
  address: RequiredString,
  apartmentSuite: NotRequiredString,
  governorate: EnumStringRequired(governorateArray),
  postalCode: NotRequiredString,
  primaryPhone: RequiredString,
  secondaryPhone: NotRequiredString,
},{timestamps:true});
const UserModel = model(SchemaTypesReference.UserInformation, userSchema);
export default UserModel;
