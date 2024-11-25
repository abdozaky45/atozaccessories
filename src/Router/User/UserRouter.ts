import { Router } from "express";
import { logout } from "../../Controller/User/UserController";
const userRouter = Router();
userRouter.post("/logout", logout);
export default userRouter;