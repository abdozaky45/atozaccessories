import { Router } from "express";   
import categoryPublicRouter from "../Categories/CategoryPublicRouter";
const publicRouter = Router();
publicRouter.use("/category",categoryPublicRouter)
export default publicRouter;