import { Request, Response, NextFunction } from "express";

// DEV: security restrictions disabled — allow all origins and tools.
export function enforcePublicApiRestrictions(req: Request, res: Response, next: NextFunction) {
  next();
}

export function blockScrapers(req: Request, res: Response, next: NextFunction) {
  next();
}
