import { Router } from "express";
import * as ImageSliderController from "../../Controller/ImageSlider/ImageSliderController";
const imageSliderRouter = Router();
imageSliderRouter.post("/create",ImageSliderController.createHeroSection);
imageSliderRouter.post("/delete",ImageSliderController.deleteHeroSection);
export default imageSliderRouter;