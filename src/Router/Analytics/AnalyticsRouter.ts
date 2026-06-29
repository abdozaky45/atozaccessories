import { Router } from "express";
import * as AnalyticsController from "../../Controller/Analytics/AnalyticsController";

const AnalyticsRouter = Router();

// All routes are mounted under /admin/analytics and protected by the ADMIN role
// in app.ts. Each accepts optional ?startDate=&endDate= (ISO or GA keywords).
AnalyticsRouter.get("/overview", AnalyticsController.getOverviewReport);
AnalyticsRouter.get("/top-pages", AnalyticsController.getTopPagesReport);
AnalyticsRouter.get("/traffic-sources", AnalyticsController.getTrafficSourcesReport);

export default AnalyticsRouter;
