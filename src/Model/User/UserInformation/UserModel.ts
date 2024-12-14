import { Types, Schema, model } from "mongoose";
import Iuser from "./Iuser";
import {
  EnumStringRequired,
  NotRequiredString,
  RefType,
  RequiredNumber,
  RequiredString,
} from "../../../Utils/Schemas";
import { governorateArray } from "../../../Utils/Governorate";
import SchemaTypesReference from "../../../Utils/Schemas/SchemaTypesReference";
const userSchema = new Schema<Iuser>({
  user: RefType(SchemaTypesReference.User, true),
  country: RequiredString,
  firstName: RequiredString,
  lastName: RequiredString,
  address: RequiredString,
  apartmentSuite: String,
  governorate: EnumStringRequired(governorateArray),
  postalCode: RequiredString,
  primaryPhone: RequiredString,
  secondaryPhone: NotRequiredString,
  createdAt: RequiredNumber,
});
const UserModel = model(SchemaTypesReference.UserInformation, userSchema);
export default UserModel;
