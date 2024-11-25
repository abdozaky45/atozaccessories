import { NextFunction, Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { findUserById } from "../../Service/Authentication/AuthService";
import { StatusEnum } from "../../Utils/StatusType";
import ErrorMessages from "../../Utils/Error";
import SuccessMessage from "../../Utils/SuccessMessages";
import { deleteUserTokens } from "../../Service/User/AuthService";
export const logout = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { _id } = req.body.currentUser.userInfo;
    const { token } = req.body.currentUser;
    const user = await findUserById(_id);
    user!.status = StatusEnum.Offline;
    await user!.save();
    const checkTokens = await deleteUserTokens(_id, token);
    if (!checkTokens) {
      throw new ApiError(400, ErrorMessages.TOKEN_NOT_FOUND);
    }
    res.clearCookie("refreshToken");
    return res
      .status(200)
      .json(new ApiResponse(200, {}, SuccessMessage.LOGOUT_SUCCESS));
  }
);
