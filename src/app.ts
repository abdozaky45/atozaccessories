import cors from "cors";
import express, { Application } from "express";
import { Request, Response, NextFunction } from "express";
import { globalErrorHandling } from "./Utils/ErrorHandling";
import cookieParser from "cookie-parser";
import RouterEnum from "./Utils/Routes";
import authenticationRouter from "./Router/Authentication/AuthRouter";
import {
  checkAuthority,
  checkRole,
} from "./middleware/AuthenticationMiddleware";
import userRouter from "./Router/User/UserRouter";
import { UserTypeEnum } from "./Utils/UserType";
import categoryRouter from "./Router/Categories/CategoryRouter";
import publicRouter from "./Router/PublicRouters/PublicRouter";
import AwsRouter from "./Router/Aws/AwsRouter";
import ProductRouter from "./Router/Product/ProductRouter";
import imageSliderRouter from "./Router/ImageSlider/ImageSliderRouter";
const app: Application = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(`/${RouterEnum.authentication}`, authenticationRouter);
app.use(`/${RouterEnum.public}`, publicRouter);
app.use(checkAuthority);
app.use(
  `/${RouterEnum.user}`,
  checkRole([UserTypeEnum.ADMIN, UserTypeEnum.USER]),
  userRouter
);
app.use(
  `/${RouterEnum.category}`,
  checkRole([UserTypeEnum.ADMIN]),
  categoryRouter
);
app.use(
  `/${RouterEnum.product}`,
  checkRole([UserTypeEnum.ADMIN]),
  ProductRouter
);
app.use(`/${RouterEnum.aws}`, AwsRouter);
app.use(`${RouterEnum.imageSlider}`,imageSliderRouter)
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  globalErrorHandling(error, req, res, next);
});
export { app };
