import { Router } from "express";
import * as offerController from "../../Controller/Offers/OfferController";

// Public storefront offers — only live offers, no auth required.
const publicOfferRouter = Router();

publicOfferRouter.get("/", offerController.getPublicActiveOffers);

export default publicOfferRouter;
