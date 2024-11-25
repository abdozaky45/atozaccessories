import { nanoid } from "nanoid";
import { sendEmail } from "../../Utils/Nodemailer/SendEmail";
import UserModel from "../../Model/User/UserModel";
import { activeCodeTemplate } from "../../Utils/Nodemailer/SendCodeTemplate";
import { StatusEnum } from "../../Utils/StatusType";
import TokenModel from "../../Model/Token/TokenModel";
import { Types } from "mongoose";
import { UserTypeEnum } from "../../Utils/UserType";


export const findUserByEmail = async (email: string) => {
  const user = await UserModel.findOne({ email });
  return user;
};
export const findUserById = async (_id: Types.ObjectId) => {
  const user = await UserModel.findById(_id);
  return user;
};
export const CreateNewAccount = async (
  email: string,
) => {
  const user = await UserModel.create({ email , status: StatusEnum.Online , role:UserTypeEnum.USER});
  return user;
};
export const createNewAccessAndRefreshToken = async (
  accessToken: string,
  refreshToken: string,
  user: Types.ObjectId,
  userAgent: string
) => {
  const token = await TokenModel.create({
    accessToken,
    refreshToken,
    user,
    userAgent,
  });
  return token;
};
export const findRefreshToken = async (refreshToken: string) => {
  const token = await TokenModel.findOne({
    refreshToken,
  });
  return token;
};
export const SaveAccessToken = async (
  _id: Types.ObjectId,
  accessToken: string
) => {
  const token = await TokenModel.findByIdAndUpdate({ _id }, { accessToken });
  return token;
};
export const findUserByAccessTokenAndUserId = async (
  user: Types.ObjectId,
  accessToken: string
) => {
  const token = await TokenModel.findOne({
    user,
    accessToken,
  });
  return token;
};
