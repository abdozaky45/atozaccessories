import { Router } from "express";
import * as ImageSliderController from "../../Controller/ImageSlider/ImageSliderController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as ImageSliderValidation from "../../Validation/ImageSlider/ImageSliderValidation";
const imageSliderRouter = Router();
imageSliderRouter.post("/create", Validation(ImageSliderValidation.createImageSliderValidation), ImageSliderController.createHeroSection);
imageSliderRouter.patch("/update/:id", Validation(ImageSliderValidation.updateImageSliderValidation), ImageSliderController.updateOneHeroSection);
imageSliderRouter.post("/delete/:id", Validation(ImageSliderValidation.deleteImageSliderValidation), ImageSliderController.deleteHeroSection);
export default imageSliderRouter;
/**
 https://atozaccessories.s3.us-east-1.amazonaws.com/imageSlider/676576abee893245e6d0d0b9_1737487510450_0
 https://atozaccessories.s3.us-east-1.amazonaws.com/imageSlider/676576abee893245e6d0d0b9_1737487962726_0
 https://atozaccessories.s3.us-east-1.amazonaws.com/imageSlider/676576abee893245e6d0d0b9_1737488160932_0
 https://atozaccessories.s3.us-east-1.amazonaws.com/imageSlider/676576abee893245e6d0d0b9_1737488418547_0
 */