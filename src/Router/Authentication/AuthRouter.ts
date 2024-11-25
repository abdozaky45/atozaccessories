import { Router } from "express";
const authenticationRouter = Router();
import * as authenticationController from "../../Controller/Authentication/AuthController";
authenticationRouter.post("/registration", authenticationController.registration);
authenticationRouter.post("/refresh-token", authenticationController.refreshedToken);
export default authenticationRouter;