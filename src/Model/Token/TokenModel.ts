import { Schema, model } from "mongoose";
import TokenInterfaceModel from "./TokenInterfaceModel";
import {
  createdAtTokenModel,
  expiresAtTokenModel,
  RefType,
  RequiredString,
} from "../../Utils/Schemas";
import SchemaTypesReference from "../../Utils/Schemas/SchemaTypesReference";
const TokenSchema = new Schema<TokenInterfaceModel>({
  accessToken: RequiredString,
  refreshToken: RequiredString,
  user: RefType(SchemaTypesReference.User, true),
  userAgent: RequiredString,
  createdAt: createdAtTokenModel,
  expiresAt: expiresAtTokenModel,
});
const TokenModel = model(SchemaTypesReference.Token, TokenSchema);
export default TokenModel;
