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
import wishlistRouter from "./Router/Wishlist/WishlistRouter";
import shippingRouter from "./Router/Shipping/ShippingRouter";
import OrderRouter from "./Router/Order/OrderRouter";
const app: Application = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get("/", async (_, res) => {
  return res.json("Hello world!");
});
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
app.use(`/${RouterEnum.aws}`, checkRole([UserTypeEnum.ADMIN]), AwsRouter);
app.use(
  `/${RouterEnum.imageSlider}`,
  checkRole([UserTypeEnum.ADMIN]),
  imageSliderRouter
);
app.use(
  `/${RouterEnum.wishlist}`,
  checkRole([UserTypeEnum.USER, UserTypeEnum.ADMIN]),
  wishlistRouter
);
app.use(`/${RouterEnum.shipping}`, checkRole([UserTypeEnum.ADMIN, UserTypeEnum.USER]), shippingRouter);
app.use(`/${RouterEnum.order}`, checkRole([UserTypeEnum.ADMIN, UserTypeEnum.USER]), OrderRouter);
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  globalErrorHandling(error, req, res, next);
});
export { app };
