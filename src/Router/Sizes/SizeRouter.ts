import { Router } from "express";
import * as sizeController from "../../Controller/Sizes/SizeController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as SizeValidation from "../../Validation/Size/SizeValidation";

const sizeRouter = Router();

sizeRouter.get(
  "/",
  Validation(SizeValidation.listSizesValidation),
  sizeController.getSizes
);

sizeRouter.get(
  "/:_id",
  Validation(SizeValidation.getSizeValidation),
  sizeController.getSizeById
);

sizeRouter.post(
  "/",
  Validation(SizeValidation.createSizeValidation),
  sizeController.createNewSize
);

sizeRouter.put(
  "/:_id",
  Validation(SizeValidation.updateSizeValidation),
  sizeController.updateSize
);

sizeRouter.delete(
  "/:_id",
  Validation(SizeValidation.deleteSizeValidation),
  sizeController.deleteSize
);

export default sizeRouter;
