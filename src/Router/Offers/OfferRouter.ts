import { Router } from "express";
import * as offerController from "../../Controller/Offers/OfferController";
import { Validation } from "../../middleware/ValidationMiddleware";
import * as OfferValidation from "../../Validation/Offer/OfferValidation";

const offerRouter = Router();

offerRouter.get(
  "/",
  Validation(OfferValidation.listOffersValidation),
  offerController.getOffers
);

offerRouter.get(
  "/:id",
  Validation(OfferValidation.getOfferValidation),
  offerController.getOfferById
);

offerRouter.post(
  "/",
  Validation(OfferValidation.createOfferValidation),
  offerController.createNewOffer
);

offerRouter.put(
  "/:id",
  Validation(OfferValidation.updateOfferValidation),
  offerController.updateOffer
);

offerRouter.delete(
  "/:id",
  Validation(OfferValidation.deleteOfferValidation),
  offerController.deleteOffer
);

offerRouter.patch(
  "/:id/toggle",
  Validation(OfferValidation.toggleOfferValidation),
  offerController.toggleOffer
);

export default offerRouter;
