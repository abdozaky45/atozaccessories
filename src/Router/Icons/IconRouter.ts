import { Router } from "express";
import * as iconController from "../../Controller/Icons/IconController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as IconValidation from "../../Validation/Icon/IconValidation";

const iconRouter = Router();

iconRouter.get(
  "/",
  Validation(IconValidation.listIconsValidation),
  iconController.getIcons
);

iconRouter.get(
  "/:_id",
  Validation(IconValidation.getIconValidation),
  iconController.getIconById
);

iconRouter.post(
  "/",
  Validation(IconValidation.createIconValidation),
  iconController.createNewIcon
);

iconRouter.put(
  "/:_id",
  Validation(IconValidation.updateIconValidation),
  iconController.updateIcon
);

iconRouter.delete(
  "/:_id",
  Validation(IconValidation.deleteIconValidation),
  iconController.deleteIcon
);

export default iconRouter;
