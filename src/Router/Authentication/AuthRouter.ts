import { Router } from "express";
const authenticationRouter = Router();
import * as authenticationController from "../../Controller/Authentication/AuthController";
authenticationRouter.post("/register-email", authenticationController.registerWithEmail);
authenticationRouter.post("/active-account", authenticationController.activeAccount);
authenticationRouter.post("/email-new-code", authenticationController.sendNewActiveCodeWithEmail);
authenticationRouter.post("/refresh-token", authenticationController.refreshedToken);
//authenticationRouter.post("/register-phone", authenticationController.registerWithPhone);
//authenticationRouter.post("/phone-new-code", authenticationController.sendNewActiveCodeWithPhone);
export default authenticationRouter;