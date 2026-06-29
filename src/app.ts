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
import ProductPublicRouter from "./Router/Product/ProductPublicRouter";
import imageSliderRouter from "./Router/ImageSlider/ImageSliderRouter";
import wishlistRouter from "./Router/Wishlist/WishlistRouter";
import shippingRouter from "./Router/Shipping/ShippingRouter";
import ShippingPublicRouter from "./Router/Shipping/ShippingPublicRouter";
import OrderRouter from "./Router/Order/OrderRouter";
import PublicOrderRouter from "./Router/Order/PublicOrderRouter";
import iconRouter from "./Router/Icons/IconRouter";
import colorRouter from "./Router/Colors/ColorRouter";
import sizeRouter from "./Router/Sizes/SizeRouter";
import offerRouter from "./Router/Offers/OfferRouter";
import homeRouter from "./Router/Home/HomeRouter";
import BackupRouter from "./Router/Backup/BackupRouter";
import AnalyticsRouter from "./Router/Analytics/AnalyticsRouter";
import videoRouter from "./Router/Video/VideoRouter";
import { getCorsOptions } from "./config";
//import { blockScrapers, enforcePublicApiRestrictions } from "./middleware/Security";
const app: Application = express();
app.use(express.json());
app.use(cors({
  origin: '*',
}));
app.options('*', cors());

//  app.use(cors(getCorsOptions()));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get("/", async (_, res) => {
  return res.json("Hello world!");
});
app.use(`/${RouterEnum.authentication}`, authenticationRouter);
//app.use(`/${RouterEnum.public}`, enforcePublicApiRestrictions, blockScrapers, publicRouter);
app.use(`/${RouterEnum.public}`, publicRouter);
app.use(`/${RouterEnum.products}`, ProductPublicRouter);
app.use("/home", homeRouter);
// Public read-only shipping costs (mutations stay admin-only below).
app.use(`/${RouterEnum.shipping}`, ShippingPublicRouter);
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
app.use(`/${RouterEnum.shipping}`, checkRole([UserTypeEnum.ADMIN]), shippingRouter);
app.use(`/${RouterEnum.order}`, checkRole([UserTypeEnum.USER, UserTypeEnum.ADMIN]), PublicOrderRouter);
app.use(`/${RouterEnum.adminOrder}`, checkRole([UserTypeEnum.ADMIN]), OrderRouter);
app.use(`/${RouterEnum.icon}`, checkRole([UserTypeEnum.ADMIN]), iconRouter);
app.use(`/${RouterEnum.color}`, checkRole([UserTypeEnum.ADMIN]), colorRouter);
app.use(`/${RouterEnum.size}`, checkRole([UserTypeEnum.ADMIN]), sizeRouter);
app.use(`/${RouterEnum.offer}`, checkRole([UserTypeEnum.ADMIN]), offerRouter);
app.use(`/${RouterEnum.backup}`, checkRole([UserTypeEnum.ADMIN]), BackupRouter);
app.use(`/${RouterEnum.analytics}`, checkRole([UserTypeEnum.ADMIN]), AnalyticsRouter);
app.use(`/${RouterEnum.video}`, checkRole([UserTypeEnum.ADMIN]), videoRouter);
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  globalErrorHandling(error, req, res, next);
});
export { app };
