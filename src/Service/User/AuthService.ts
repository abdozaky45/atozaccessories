import { Types } from "mongoose";
import TokenModel from "../../Model/Token/TokenModel";
import Iuser from "../../Model/User/UserInformation/Iuser";
import UserModel from "../../Model/User/UserInformation/UserModel";
export const createUser = async (userData: Iuser) => {
  const user = await UserModel.create(userData);
  return user;
};
export const updateUserInformation = async (user: Types.ObjectId, userData: Iuser) => {
  const updatedUser = await UserModel.findOneAndUpdate(
    { user },
    { $set: userData },
    { new: true }
  );
  return updatedUser;
};
export const findUserInformationById = async (id: Types.ObjectId | string) => {
  const user = await UserModel.findOne({user: id});
  return user;
};
export const deleteUserInformation = async (user: string) => {
  const deletedUser = await UserModel.findOneAndDelete({user});
  return deletedUser;
};
export const getAllUserInformation = async (user: string) => {
  const users = await UserModel.find({ user });
  return users;
};
export const deleteUserTokens = async (
  user: Types.ObjectId,
  accessToken: string
) => {
  const tokens = await TokenModel.findOneAndDelete({ user, accessToken });
  return tokens;
};
