import {
  CreateNewAccount,
  SaveAccessToken,
  createNewAccessAndRefreshToken,
  findRefreshToken,
  findUserByEmail,
  findUserById,
} from "../../Service/Authentication/AuthService";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { Request, Response, NextFunction } from "express";
import moment from "../../Utils/DateAndTime";
import {
  generateRefreshToken,
  generateAccessToken,
  verifyToken,
} from "../../Utils/GenerateAndVerifyToken";
import ErrorMessages from "../../Utils/Error";
import SuccessMessage from "../../Utils/SuccessMessages";
export const registration = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    if (!email) {
      throw new ApiError(400, ErrorMessages.EMAIL_REQUIRED);
    }
    let user = await findUserByEmail(email);
    if (!user) {
      user = await CreateNewAccount(email);
    }
    const accessToken = generateAccessToken({
      payload: {
        _id: user?._id,
        role: user?.role,
        email: user?.email,
      },
    });
    const refreshToken = generateRefreshToken({
      payload: {
        _id: user?._id,
      },
    });
    const agent = req.headers["user-agent"] || "unknown";
    await createNewAccessAndRefreshToken(
      accessToken,
      refreshToken,
      user!._id,
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
