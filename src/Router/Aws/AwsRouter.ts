import { Router } from "express";
import * as AwsController from "../../Controller/Aws/AwsController";
const AwsRouter = Router();
AwsRouter.get("/get-presigned-url", AwsController.getPresignedURL);
AwsRouter.get("/delete-presigned-url", AwsController.deleteImage);
export default AwsRouter;
