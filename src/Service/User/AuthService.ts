import { Types } from "mongoose";
import TokenModel from "../../Model/Token/TokenModel";
import Iuser from "../../Model/User/UserInformation/Iuser";
import UserModel from "../../Model/User/UserInformation/UserModel";
export const createUser = async (userData: Iuser) => {
  const user = await UserModel.create(userData);
  return user;
};
export const updateUserInformation = async (_id: Types.ObjectId | string, userData: Iuser) => {
  const updatedUser = await UserModel.findByIdAndUpdate(
   _id,
    { $set: userData },
    { new: true }
  );
  return updatedUser;
};
export const findUserInformationById = async (id: Types.ObjectId | string) => {
  const user = await UserModel.findById(id);
  return user;
};
export const getAllUserInformationRelatedToUser = async (user: Types.ObjectId | string) => {
  const users = await UserModel.find({user});
  return users;
};
export const deleteUserInformation = async (_id: Types.ObjectId | string) => {
  const deletedUser = await UserModel.findByIdAndDelete(_id);
  return deletedUser;
};
export const getAllUserInformation = async () => {
  const users = await UserModel.find();
  return users;
};
export const deleteUserTokens = async (
  user: Types.ObjectId,
  accessToken: string
) => {
  const tokens = await TokenModel.findOneAndDelete({ user, accessToken });
  return tokens;
};

