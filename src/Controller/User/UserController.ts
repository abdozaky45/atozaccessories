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
    const userId = req.body.currentUser.userInfo._id;
  const userData : Iuser ={
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    address: req.body.address,
    apartmentSuite: req.body.apartmentSuite,
    shipping: req.body.shipping,
    postalCode: req.body.postalCode,
    primaryPhone: req.body.primaryPhone,
    secondaryPhone: req.body.secondaryPhone,
    user:userId
  };
  const user = await userService.createUser(userData);
  return res.json(new ApiResponse(200, {user}, SuccessMessage.USER_CREATED));
  }
);
export const updateUserInformation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {_id} = req.body.currentUser.userInfo;
    const {userId} = req.params;
    const checkUser = await userService.findUserInformationById(userId);
    if (!checkUser) {
      return next(new ApiError(404, ErrorMessages.USER_NOT_FOUND));
    }
    if(_id.toString() !== checkUser.user.toString()){
      throw new ApiError(403, ErrorMessages.UNAUTHORIZED_ACCESS);
    }
    const userData : Iuser ={
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      address: req.body.address,
      apartmentSuite: req.body.apartmentSuite,
      shipping: req.body.shipping,
      postalCode: req.body.postalCode,
      primaryPhone: req.body.primaryPhone,
      secondaryPhone: req.body.secondaryPhone,
      user:_id
    };
    const user = await userService.updateUserInformation(userId, userData);
    return res.json(new ApiResponse(200, {user}, SuccessMessage.USER_UPDATED));
  }
);
export const deleteUserInformation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {_id} = req.body.currentUser.userInfo;
    const {userId} = req.params;
    const checkUser = await userService.findUserInformationById(userId);
    if (!checkUser) {
      return next(new ApiError(404, ErrorMessages.USER_NOT_FOUND));
    }
    if(_id.toString() !== checkUser.user.toString()){
      throw new ApiError(403, ErrorMessages.UNAUTHORIZED_ACCESS);
    }
    const user = await userService.deleteUserInformation(userId);
    return res.json(new ApiResponse(200, {}, SuccessMessage.USER_DELETED));
  }
);
export const getAllUserInformation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const users = await userService.getAllUserInformation();
    return res.json(new ApiResponse(200, {users}, SuccessMessage.USER_FOUND));
  }
);
export const getUserInformationById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {_id} = req.body.currentUser.userInfo;
    const user = await userService.getAllUserInformationRelatedToUser(_id);
    if (!user) {
      return next(new ApiError(404, ErrorMessages.USER_NOT_FOUND));
    }
    return res.json(new ApiResponse(200, {user}, SuccessMessage.USER_FOUND));
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
