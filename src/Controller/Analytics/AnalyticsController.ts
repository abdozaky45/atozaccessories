import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../Utils/ErrorHandling";
import {
  DateRange,
  getOverview,
  getTopPages,
  getTrafficSources,
} from "../../Service/Analytics/AnalyticsService";

/**
 * Reads the date range from the query string. When startDate/endDate are
 * omitted the service defaults to the last 7 days. Values may be ISO dates
 * (2026-01-31) or GA keywords (7daysAgo / today).
 */
const rangeFromQuery = (req: Request): DateRange | undefined => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  if (startDate && endDate) return { startDate, endDate };
  return undefined;
};

export const getOverviewReport = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await getOverview(rangeFromQuery(req));
    return res.json(new ApiResponse(200, data));
  }
);

export const getTopPagesReport = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await getTopPages(rangeFromQuery(req));
    return res.json(new ApiResponse(200, data));
  }
);

export const getTrafficSourcesReport = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await getTrafficSources(rangeFromQuery(req));
    return res.json(new ApiResponse(200, data));
  }
);
