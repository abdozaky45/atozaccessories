import { nanoid } from "nanoid";
import { sendEmail } from "../../Utils/Nodemailer/SendEmail";
import UserModel from "../../Model/User/UserModel";
import { activeCodeTemplate } from "../../Utils/Nodemailer/SendCodeTemplate";
import { StatusEnum } from "../../Utils/StatusType";
import TokenModel from "../../Model/Token/TokenModel";
import { Types } from "mongoose";
import { ApiError } from "../../Utils/ErrorHandling";
import ErrorMessages from "../../Utils/Error";
export function generateSixDigitCode() {
  let code = nanoid(6);
  code = code.replace(/[^0-9]/g, "");
  while (code.length < 6) {
    code = nanoid(6).replace(/[^0-9]/g, "");
  }
  return code;
}
export const sendActivationEmail = async (
  email: string,
  activeCode: string
): Promise<boolean> => {
  try {
    const isSent = await sendEmail({
      to: email,
      subject: "Your Login Code",
      html: activeCodeTemplate(activeCode),
    });
    return isSent;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
export const findUserByEmail = async (email: string) => {
  const user = await UserModel.findOne({ email });
  return user;
};
export const findUserByPhone = async (phone: string) => {
  const user = await UserModel.findOne({ phone });
  return user;
};
export const findUserById = async (_id: Types.ObjectId) => {
  const user = await UserModel.findById(_id);
  return user;
};
export const CreateNewAccount = async ({
  email,
  phone,
  activeCode,
  codeCreatedAt,
}: {
  email: string | null;
  phone: string | null;
  activeCode: string;
  codeCreatedAt: number;
}) => {
  const user = await UserModel.create({
    email,
    phone,
    activeCode,
    codeCreatedAt,
  });
  return user;
};
export const updateUserAndDeleteActiveCode = async (searchKey: string) => {
  const user = await UserModel.findOneAndUpdate(
   {$or:[{ email :searchKey}, { phone:searchKey }]},
    {
      isConfirmed: true,
      status: StatusEnum.Online,
      $unset: { activeCode: 1, codeCreatedAt: 1 },
    }
  );
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
export const findOneUserById = async (id: Types.ObjectId) => {
  const user = await UserModel.findById(id);
  return user;
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
