import { Router } from "express";
import * as VideoController from "../../Controller/Video/VideoController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as VideoValidation from "../../Validation/Video/VideoValidation";
const videoRouter = Router();
videoRouter.post(
  "/create",
  Validation(VideoValidation.createVideoValidation),
  VideoController.createOneVideo
);
videoRouter.post(
  "/delete/:id",
  Validation(VideoValidation.deleteVideoValidation),
  VideoController.deleteOneVideo
);
export default videoRouter;
