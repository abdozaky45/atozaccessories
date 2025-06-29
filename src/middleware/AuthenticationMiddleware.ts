import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../Utils/ErrorHandling";
import { ApiError } from "../Utils/ErrorHandling";
import { verifyToken } from "../Utils/GenerateAndVerifyToken";
import ErrorMessages from "../Utils/Error";
import { findUserByAccessTokenAndUserId } from "../Service/Authentication/AuthService";
const checkAuthority = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { authorization } = req.headers;
    if (!authorization) {
    return res.status(401).json({
        success: false,
        message: "no token provided or in-valid Bearer Key",
      });
    }
    if (req.originalUrl.startsWith("/public")) {
      return next();
    }
    const token = authorization.split(" ")[1];
    let decoded;
    try {
      decoded = verifyToken({ token });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or expired",
      });
    }

    if (!decoded?._id) {
      throw new ApiError(401, ErrorMessages.INVALID_PAYLOAD);
    }
    const user = await findUserByAccessTokenAndUserId(decoded._id, token);
    if (!user || !(user.accessToken === token)) {
      throw new ApiError(401, ErrorMessages.USER_TOKEN_IS_INVALID);
    }
    console.log({ checkAuthority: true });
    const currentUser = {
      userInfo: decoded,
      token,
    };
    req.body.currentUser = currentUser;
    next();
  }
);
const checkRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { currentUser } = req.body;
    if (!requiredRoles.includes(currentUser.userInfo.role)) {
      throw new ApiError(403, ErrorMessages.ROLE_ERROR);
    }
    next();
  };
};
export { checkAuthority, checkRole };
