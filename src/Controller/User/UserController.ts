import { NextFunction, Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { findUserById } from "../../Service/Authentication/AuthService";
import { StatusEnum } from "../../Utils/StatusType";
import ErrorMessages from "../../Utils/Error";
import SuccessMessage from "../../Utils/SuccessMessages";
import * as userService from "../../Service/User/AuthService";
import Iuser from "../../Model/User/UserInformation/Iuser";
export const addUserInformation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
  const userData : Iuser = req.body;
  const user = await userService.createUser(userData);
  return res.json(new ApiResponse(200, {user}, SuccessMessage.USER_CREATED));
  }
);
export const logout = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { _id } = req.body.currentUser.userInfo;
    const { token } = req.body.currentUser;
    const user = await findUserById(_id);
    user!.status = StatusEnum.Offline;
    await user!.save();
    const checkTokens = await userService.deleteUserTokens(_id, token);
    if (!checkTokens) {
      throw new ApiError(400, ErrorMessages.TOKEN_NOT_FOUND);
    }
    res.clearCookie("refreshToken");
    return res
      .status(200)
      .json(new ApiResponse(200, {}, SuccessMessage.LOGOUT_SUCCESS));
  }
);
