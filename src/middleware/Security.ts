import { Request, Response, NextFunction } from "express";

const allowedOrigins = process.env.MAIN_ORIGIN ? [process.env.MAIN_ORIGIN] : [];
export function enforcePublicApiRestrictions(req: Request, res: Response, next: NextFunction) {
  const origin = req.get("origin") || req.get("referer");

  if (!origin || !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
    return res.status(403).json({ message: "🚫 Forbidden: Unauthorized origin" });
  }

  next();
}

export function blockScrapers(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.get("User-Agent");

  if (!userAgent || userAgent.includes("Postman") || userAgent.includes("curl")) {
    return res.status(403).json({ message: "🚫 Forbidden: Unauthorized tool detected!" });
  }

  next();
}
