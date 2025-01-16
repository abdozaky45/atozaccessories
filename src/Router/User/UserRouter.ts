import { Router } from "express";
import * as UserController from "../../Controller/User/UserController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as userValidation from "../../Validation/User/UserInformation";
import { baseSchema } from "../../Validation/BaseSchema";
const userRouter = Router();
userRouter.post(
  "/add-user-information",
  Validation(userValidation.createUser),
  UserController.addUserInformation
);
userRouter.patch(
  "/update-user-information/:userId",
  Validation(userValidation.updateUser),
  UserController.updateUserInformation
);
userRouter.delete(
  "/delete-user-information/:userId",
  Validation(userValidation.CustomUserValidation),
  UserController.deleteUserInformation
);
userRouter.get(
  "/all-user-information",
  Validation(baseSchema),
  UserController.getAllUserInformation
);
userRouter.get(
  "/user-information",
  UserController.getUserInformationById
);
userRouter.post("/logout", UserController.logout);
export default userRouter;
