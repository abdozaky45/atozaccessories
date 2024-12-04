import { Router } from "express";   
import categoryPublicRouter from "../Categories/CategoryPublicRouter";
import ProductPublicRouter from "../Product/ProductPublicRouter";
const publicRouter = Router();
publicRouter.use("/category",categoryPublicRouter)
publicRouter.use("/product",ProductPublicRouter)
export default publicRouter;