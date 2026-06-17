import { Router } from "express";
import categoryPublicRouter from "../Categories/CategoryPublicRouter";
import PublicImageSliderRouter from "../ImageSlider/PublicImageSliderRouter";
const publicRouter = Router();
publicRouter.use("/category", categoryPublicRouter);
publicRouter.use("/hero-section", PublicImageSliderRouter);
export default publicRouter;
