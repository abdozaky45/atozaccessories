import {
  CreateNewAccount,
  SaveAccessToken,
  createNewAccessAndRefreshToken,
  findRefreshToken,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  generateSixDigitCode,
  sendActivationEmail,
  updateUserAndDeleteActiveCode,
} from "../../Service/Authentication/AuthService";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { Request, Response, NextFunction } from "express";
import { compareActiveCode, hashActiveCode } from "../../Utils/HashAndCompare";
import moment from "../../Utils/DateAndTime";
import {
  generateRefreshToken,
  generateAccessToken,
  verifyToken,
} from "../../Utils/GenerateAndVerifyToken";
import ErrorMessages from "../../Utils/Error";
import SuccessMessage from "../../Utils/SuccessMessages";
import { sendSMS } from "../../Service/Aws/Sns_Simple Notification Service/SendSMS";
export const registerWithEmail = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    if (!email) {
      throw new ApiError(400, ErrorMessages.DATA_IS_REQUIRED);
    }
    const activeCode = generateSixDigitCode();
    const hashCode = await hashActiveCode(activeCode);
    const user = await findUserByEmail(email);
    if (user) {
      user.activeCode = hashCode;
      await user.save();
    } else {
      await CreateNewAccount({
        email,
        phone: null,
        activeCode: hashCode,
        codeCreatedAt: moment().valueOf(),
      });
    }
    const isSend = await sendActivationEmail(email, activeCode);
    return isSend
      ? res
          .status(200)
          .json(new ApiResponse(200, { email }, SuccessMessage.EMAIL_SENT))
      : next(new Error(ErrorMessages.EMAIL_NOT_SENT));
  }
);
export const registerWithPhone = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { phone } = req.body;
    if (!phone) {
      throw new ApiError(400, ErrorMessages.DATA_IS_REQUIRED);
    }
    const activeCode = generateSixDigitCode();
    const hashCode = await hashActiveCode(activeCode);
    const user = await findUserByPhone(phone);
    if (user) {
      user.activeCode = hashCode;
      await user.save();
    } else {
      await CreateNewAccount({
        email: null,
        phone,
        activeCode: hashCode,
        codeCreatedAt: moment().valueOf(),
      });
    }
    await sendSMS(phone, activeCode);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, SuccessMessage.OTP_SEND));
  }
);
export const activeAccount = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, phone, activeCode } = req.body;
    if (!activeCode) {
      throw new ApiError(400, ErrorMessages.DATA_IS_REQUIRED);
    }
    if ((email && phone) || (!email && phone))
      throw new ApiError(
        400,
        ErrorMessages.PLEASE_PROVIDE_EITHER_AN_EMAIL_ADDRESS_OR_A_PHONE_NUMBER_BUT_NOT_BOTH
      );
    const user = email
      ? await findUserByEmail(email)
      : await findUserByPhone(phone);
    if (!user) throw new ApiError(400, ErrorMessages.EMAIL_OR_PHONE_NOT_FOUND);
    const currentTime = moment().valueOf();
    const createdAt = user!.codeCreatedAt;
    if (currentTime - createdAt > 15 * 60 * 1000) {
      throw new ApiError(400, ErrorMessages.ACTIVE_CODE_EXPIRED);
    }
    const isMatch = await compareActiveCode(activeCode, user!.activeCode);
    if (!isMatch) {
      throw new ApiError(400, ErrorMessages.ACTIVE_CODE_NOT_MATCH);
    }
    const searchKey = email || phone;
    const updateUser = await updateUserAndDeleteActiveCode(searchKey);
    const accessToken = generateAccessToken({
      payload: {
        _id: updateUser?._id,
        role: updateUser?.role,
        email: updateUser?.email,
      },
    });
    const refreshToken = generateRefreshToken({
      payload: {
        _id: updateUser?._id,
      },
    });
    const agent = req.headers["user-agent"] || "unknown";
    await createNewAccessAndRefreshToken(
      accessToken,
      refreshToken,
      updateUser!._id,
      agent
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none", // front end domain to be added
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, { accessToken }, SuccessMessage.SUCCESS_ACCOUNT)
      );
  }
);
export const sendNewActiveCodeWithEmail = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    if (!email) {
      throw new ApiError(400, ErrorMessages.DATA_IS_REQUIRED);
    }
    const user = await findUserByEmail(email);
    if (!user) {
      throw new ApiError(400, ErrorMessages.EMAIL_NOT_FOUND);
    }
    const activeCode = generateSixDigitCode();
    const hashCode = await hashActiveCode(activeCode);
    user.codeCreatedAt = moment().valueOf();
    user.activeCode = hashCode;
    await user.save();
    const isSend = await sendActivationEmail(email, activeCode);
    return isSend
      ? res
          .status(200)
          .json(new ApiResponse(200, {}, SuccessMessage.EMAIL_SENT))
      : next(new Error(ErrorMessages.EMAIL_NOT_SENT));
  }
);
export const sendNewActiveCodeWithPhone = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { phone } = req.body;
    if (!phone) {
      throw new ApiError(400, ErrorMessages.PHONE_NOT_FOUND);
    }
    const user = await findUserByPhone(phone);
    if (!user) {
      throw new ApiError(400, ErrorMessages.PHONE_NOT_FOUND);
    }
    const activeCode = generateSixDigitCode();
    const hashCode = await hashActiveCode(activeCode);
    user.codeCreatedAt = moment().valueOf();
    user.activeCode = hashCode;
    await user.save();
    await sendSMS(phone, activeCode);
    return res.status(200).json(new ApiResponse(200, {}, SuccessMessage.OTP_SEND));
  }
);
export const refreshedToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      throw new ApiError(400, ErrorMessages.REFRESH_TOKEN_REQUIRED);
    }
    const checkToken = await findRefreshToken(refreshToken);
    if (!checkToken) {
      throw new ApiError(
        400,
        ErrorMessages.REFRESH_TOKEN_IS_INVALID_OR_EXPIRED
      );
    }
    if (moment().isAfter(moment(checkToken.expiresAt))) {
      await checkToken.deleteOne();
      throw new ApiError(
        401,
        ErrorMessages.REFRESH_TOKEN_EXPIRED_PLEASE_LOGIN_AGAIN
      );
    }
    const decoded = await verifyToken({ token: refreshToken });
    if (!decoded || typeof decoded !== "object" || !decoded._id) {
      throw new ApiError(400, ErrorMessages.INVALID_PAYLOAD);
    }
    const checkUser = await findUserById(decoded?._id);
    if (!checkUser) {
      throw new ApiError(400, ErrorMessages.USER_NOT_FOUND_OR_UNAUTHORIZED);
    }
    const agent = req.headers["user-agent"] || "unknown";
    if (checkToken.userAgent !== agent) {
      throw new ApiError(403, ErrorMessages.UNAUTHORIZED_DEVICE_OR_ACCESS);
    }
    const accessToken = await generateAccessToken({
      payload: {
        _id: checkUser?._id,
        role: checkUser?.role,
        email: checkUser?.email,
      },
    });
    await SaveAccessToken(checkToken._id, accessToken);
    return res
      .status(200)
      .json(
        new ApiResponse(200, { accessToken }, SuccessMessage.TOKEN_REFRESHED)
      );
  }
);
