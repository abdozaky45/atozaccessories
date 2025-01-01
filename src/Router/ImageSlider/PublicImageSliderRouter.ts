import {Router} from "express"; 
import * as ImageSliderController from "../../Controller/ImageSlider/ImageSliderController";
const PublicImageSliderRouter = Router();
PublicImageSliderRouter.get("/get",ImageSliderController.getHeroSection);
PublicImageSliderRouter.get("/get/:id",ImageSliderController.getHeroSectionById);
export default PublicImageSliderRouter;