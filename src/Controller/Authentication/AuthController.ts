import {
  CreateNewAccount,
  findUserByEmail,
  generateSixDigitCode,
  saveAccessToken,
  sendActivationEmail,
  sendWelcomeEmail,
  updateUserAndDeleteActiveCode,
} from "../../Service/Authentication/AuthService";
import { UserTypeEnum } from "../../Utils/UserType";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { Request, Response, NextFunction } from "express";
import { compareActiveCode, hashActiveCode } from "../../Utils/HashAndCompare";
import moment from "../../Utils/DateAndTime";
import { generateAccessToken } from "../../Utils/GenerateAndVerifyToken";
import ErrorMessages from "../../Utils/Error";
import SuccessMessage from "../../Utils/SuccessMessages";

// Regular users have no login/OTP step, so on email entry we mint a non-expiring
// access token (carrying their id) and persist it. The frontend stores it and sends
// it as a Bearer token with wishlist / user-information / order requests.
const issueUserToken = async (user: any, userAgent: string): Promise<string> => {
  const accessToken = generateAccessToken({
    payload: { _id: user._id, role: user.role, email: user.email },
    expiresIn: null, // never expires for regular users
  });
  await saveAccessToken(accessToken, user._id, userAgent);
  return accessToken;
};

export const registerWithEmail = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const email = req.body.email.toLowerCase();
    const agent = req.headers["user-agent"] || "unknown";

    const user = await findUserByEmail(email);

    if (!user) {
      const newUser = await CreateNewAccount({ email, activeCode: "", codeCreatedAt: 0 });
      await sendWelcomeEmail(email);
      const accessToken = await issueUserToken(newUser, agent);
      return res
        .status(201)
        .json(new ApiResponse(201, { accessToken, userId: newUser._id }, SuccessMessage.USER_CREATED));
    }

    if (user.role === UserTypeEnum.ADMIN) {
      const activeCode = generateSixDigitCode();
      const hashCode = await hashActiveCode(activeCode);
      user.activeCode = hashCode;
      user.codeCreatedAt = moment().valueOf();
      await user.save();
      const isSend = await sendActivationEmail(email, activeCode);
      return isSend
        ? res.status(200).json(new ApiResponse(200, { email }, SuccessMessage.OTP_SEND))
        : next(new Error(ErrorMessages.EMAIL_NOT_SENT));
    }

    // user exists, role === USER — this acts as a returning-user "login": issue a fresh token.
    const accessToken = await issueUserToken(user, agent);
    return res
      .status(200)
      .json(new ApiResponse(200, { accessToken, userId: user._id }, SuccessMessage.EMAIL_SENT));
  }
);

export const activeAccount = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, activeCode } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
      throw new ApiError(400, ErrorMessages.EMAIL_NOT_FOUND);
    }
    if (user.role !== UserTypeEnum.ADMIN) {
      throw new ApiError(403, ErrorMessages.ROLE_ERROR);
    }
    const currentTime = moment().valueOf();
    const createdAt = user.codeCreatedAt;
    if (currentTime - createdAt > 15 * 60 * 1000) {
      throw new ApiError(400, ErrorMessages.ACTIVE_CODE_EXPIRED);
    }
    const isMatch = await compareActiveCode(activeCode, user.activeCode);
    if (!isMatch) {
      throw new ApiError(400, ErrorMessages.ACTIVE_CODE_NOT_MATCH);
    }
    const updateUser = await updateUserAndDeleteActiveCode(email);
    const accessToken = generateAccessToken({
      payload: {
        _id: updateUser?._id,
        role: updateUser?.role,
        email: updateUser?.email,
      },
    });
    const agent = req.headers["user-agent"] || "unknown";
    await saveAccessToken(accessToken, updateUser!._id, agent);
    return res
      .status(200)
      .json(new ApiResponse(200, { accessToken }, SuccessMessage.SUCCESS_ACCOUNT));
  }
);

export const sendNewActiveCodeWithEmail = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
      throw new ApiError(400, ErrorMessages.EMAIL_NOT_FOUND);
    }
    if (user.role !== UserTypeEnum.ADMIN) {
      throw new ApiError(403, ErrorMessages.ROLE_ERROR);
    }
    const activeCode = generateSixDigitCode();
    const hashCode = await hashActiveCode(activeCode);
    user.codeCreatedAt = moment().valueOf();
    user.activeCode = hashCode;
    await user.save();
    const isSend = await sendActivationEmail(email, activeCode);
    return isSend
      ? res.status(200).json(new ApiResponse(200, {}, SuccessMessage.EMAIL_SENT))
      : next(new Error(ErrorMessages.EMAIL_NOT_SENT));
  }
);
