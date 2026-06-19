import { sendEmail } from "../../Utils/Nodemailer/SendEmail";
import AuthModel from "../../Model/User/auth/AuthModel";
import { activeCodeTemplate, welcomeEmailTemplate, welcomeEmailText } from "../../Utils/Nodemailer/SendCodeTemplate";
import { StatusEnum } from "../../Utils/StatusType";
import TokenModel from "../../Model/Token/TokenModel";
import { Types } from "mongoose";
export function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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
  } catch {
    return false;
  }
};
export const sendWelcomeEmail = async (email: string): Promise<boolean> => {
  try {
    const isSent = await sendEmail({
      from: process.env.RESEND_FROM ?? 'A to Z Accessory <onboarding@resend.dev>',
      to: email,
      replyTo: 'atozaccessories0@gmail.com',
      subject: 'أهلاً بك في A to Z Accessory',
      html: welcomeEmailTemplate(),
      text: welcomeEmailText(),
      headers: {
        'X-Mailer': 'A to Z Accessory Mailer',
        'List-Unsubscribe': '<mailto:atozaccessories0@gmail.com?subject=unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    return isSent;
  } catch {
    return false;
  }
};
export const findUserByEmail = async (email: string) => {
  const user = await AuthModel.findOne({ email });
  return user;
};
export const findUserByPhone = async (phone: string) => {
  const user = await AuthModel.findOne({ phone });
  return user;
};
export const findUserById = async (_id: Types.ObjectId) => {
  const user = await AuthModel.findById(_id);
  return user;
};
export const CreateNewAccount = async ({
  email,
  activeCode,
  codeCreatedAt,
}: {
  email:string;
  activeCode: string;
  codeCreatedAt: number;
}) => {
  const user = await AuthModel.create({
    email,
    activeCode,
    codeCreatedAt,
    // Regular users have no confirmation step, so they are confirmed and online from sign-up.
    isConfirmed: true,
    status: StatusEnum.Online,
  });

  return user;
};
export const updateUserAndDeleteActiveCode = async (searchKey: string) => {
  const user = await AuthModel.findOneAndUpdate(
   {$or:[{ email :searchKey}, { phone:searchKey }]},
    {
      isConfirmed: true,
      status: StatusEnum.Online,
      $unset: { activeCode: 1, codeCreatedAt: 1 },
    }
  );
  return user;
};
export const saveAccessToken = async (
  accessToken: string,
  user: Types.ObjectId,
  userAgent: string
) => {
  const token = await TokenModel.create({
    accessToken,
    user,
    userAgent,
  });
  return token;
};
export const findOneUserById = async (id: Types.ObjectId) => {
  const user = await AuthModel.findById(id);
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
