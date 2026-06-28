import { Router } from "express";
import * as VideoController from "../../Controller/Video/VideoController";
const PublicVideoRouter = Router();
PublicVideoRouter.get("/get", VideoController.getOneVideo);
export default PublicVideoRouter;
