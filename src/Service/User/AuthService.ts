import { Types } from "mongoose";
import TokenModel from "../../Model/Token/TokenModel";

export const deleteUserTokens = async (
    user: Types.ObjectId,
    accessToken: string
  ) => {
    const tokens = await TokenModel.findOneAndDelete({ user, accessToken });
    return tokens;
  };