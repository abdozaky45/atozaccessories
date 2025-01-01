import { Router } from "express";
import categoryPublicRouter from "../Categories/CategoryPublicRouter";
import ProductPublicRouter from "../Product/ProductPublicRouter";
import PublicImageSliderRouter from "../ImageSlider/PublicImageSliderRouter";
const publicRouter = Router();
publicRouter.use("/category", categoryPublicRouter);
publicRouter.use("/product", ProductPublicRouter);
publicRouter.use("/hero-section",PublicImageSliderRouter)
export default publicRouter;
