import { model, Schema } from "mongoose";
import Iauth from "./Iauth";
import {
  EnumStringRole,
  EnumStringStatus,
  NotRequiredBoolean,
  NotRequiredNumber,
  NotRequiredString,
  RequiredUniqueEmail,
  RequiredUniquePhone,
} from "../../../Utils/Schemas";
import { statusType } from "../../../Utils/StatusType";
import { userType } from "../../../Utils/UserType";
import SchemaTypesReference from "../../../Utils/Schemas/SchemaTypesReference";
const userSchema = new Schema<Iauth>({
  email: RequiredUniqueEmail,
  phone: RequiredUniquePhone,
  activeCode:NotRequiredString,
  isConfirmed: NotRequiredBoolean,
  status: EnumStringStatus(statusType),
  role: EnumStringRole(userType),
  codeCreatedAt: NotRequiredNumber
});
const AuthModel = model(SchemaTypesReference.User, userSchema);
export default AuthModel;
