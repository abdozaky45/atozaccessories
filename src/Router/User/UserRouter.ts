import { Router } from "express";
import * as UserController from "../../Controller/User/UserController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as userValidation from "../../Validation/User/UserInformation";
const userRouter = Router();
userRouter.post(
  "/add-user-information",
  Validation(userValidation.createUser),
  UserController.addUserInformation
);
userRouter.post("/logout", UserController.logout);
export default userRouter;
