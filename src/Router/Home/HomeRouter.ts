import { Router } from "express";
import { getHome } from "../../Controller/Home/HomeController";

const homeRouter = Router();
homeRouter.get("/", getHome);
export default homeRouter;
