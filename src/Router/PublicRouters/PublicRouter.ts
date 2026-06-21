import { Router } from "express";
import categoryPublicRouter from "../Categories/CategoryPublicRouter";
import PublicImageSliderRouter from "../ImageSlider/PublicImageSliderRouter";
import publicOfferRouter from "../Offers/PublicOfferRouter";
const publicRouter = Router();
publicRouter.use("/category", categoryPublicRouter);
publicRouter.use("/hero-section", PublicImageSliderRouter);
publicRouter.use("/offers", publicOfferRouter);
export default publicRouter;
