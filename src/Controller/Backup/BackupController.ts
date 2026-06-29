import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import { listBackups } from "../../Service/Backup/BackupService";

export const getBackups = asyncHandler(
  async (_req: Request, res: Response) => {
    const { summary, backups } = await listBackups();
    return res.json(new ApiResponse(200, { summary, backups }));
  }
);
