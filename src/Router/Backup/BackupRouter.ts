import { Router } from "express";
import * as BackupController from "../../Controller/Backup/BackupController";

const BackupRouter = Router();

BackupRouter.get("/", BackupController.getBackups);

export default BackupRouter;
