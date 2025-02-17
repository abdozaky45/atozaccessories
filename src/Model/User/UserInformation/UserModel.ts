import { Types, Schema, model } from "mongoose";
import Iuser from "./Iuser";
import {
  EnumStringRequired,
  NotRequiredBoolean,
  NotRequiredString,
  RefType,
  RequiredDefaultStringCity,
  RequiredString,
} from "../../../Utils/Schemas";
import SchemaTypesReference from "../../../Utils/Schemas/SchemaTypesReference";
const userSchema = new Schema<Iuser>({
  user: RefType(SchemaTypesReference.User, true),
  country: RequiredDefaultStringCity,
  firstName: RequiredString,
  lastName: RequiredString,
  address: RequiredString,
  apartmentSuite: NotRequiredString,
  shipping:  RefType(SchemaTypesReference.Shipping, true),
  postalCode: NotRequiredString,
  primaryPhone: RequiredString,
  secondaryPhone: NotRequiredString,
  isDeleted: NotRequiredBoolean
}, { timestamps: true });
const UserModel = model(SchemaTypesReference.UserInformation, userSchema);
export default UserModel;
