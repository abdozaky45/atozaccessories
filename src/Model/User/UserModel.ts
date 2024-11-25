import { model, Schema } from "mongoose";
import UserInterfaceModel from "./UserInterfaceModel";
import {
  EnumStringRole,
  EnumStringStatus,
  RequiredUniqueEmail,
} from "../../Utils/Schemas";
import { statusType } from "../../Utils/StatusType";
import { userType } from "../../Utils/UserType";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
const userSchema = new Schema<UserInterfaceModel>({
  email: RequiredUniqueEmail,
  status: EnumStringStatus(statusType),
  role: EnumStringRole(userType),
});
const UserModel = model(SchemaTypesReference.User, userSchema);
export default UserModel;
