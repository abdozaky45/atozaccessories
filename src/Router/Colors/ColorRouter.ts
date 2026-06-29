import { Router } from "express";
import * as colorController from "../../Controller/Colors/ColorController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as ColorValidation from "../../Validation/Color/ColorValidation";

const colorRouter = Router();

colorRouter.get(
  "/",
  Validation(ColorValidation.listColorsValidation),
  colorController.getColors
);

colorRouter.get(
  "/:_id",
  Validation(ColorValidation.getColorValidation),
  colorController.getColorById
);

colorRouter.post(
  "/",
  Validation(ColorValidation.createColorValidation),
  colorController.createNewColor
);

colorRouter.put(
  "/:_id",
  Validation(ColorValidation.updateColorValidation),
  colorController.updateColor
);

colorRouter.delete(
  "/:_id",
  Validation(ColorValidation.deleteColorValidation),
  colorController.deleteColor
);

export default colorRouter;
