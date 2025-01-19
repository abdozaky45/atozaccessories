import { Router } from "express";
import * as AwsController from "../../Controller/Aws/AwsController";
import { Validation } from "../../middleware/ValidationMiddleware";
import { deletePresignedUrlValidation } from "../../Validation/Aws";
const AwsRouter = Router();
AwsRouter.post("/get-presigned-url", AwsController.getPresignedURL);
AwsRouter.get("/delete-presigned-url", Validation(deletePresignedUrlValidation), AwsController.deleteImage);
export default AwsRouter;
