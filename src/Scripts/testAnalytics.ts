import "dotenv/config";
import {
  getOverview,
  getTopPages,
  getTrafficSources,
} from "../Service/Analytics/AnalyticsService";

(async () => {
  try {
    console.log("→ GA_PROPERTY_ID:", process.env.GA_PROPERTY_ID);
    console.log("→ using BASE64 key:", Boolean(process.env.GA_PRIVATE_KEY_BASE64));

    const overview = await getOverview();
    console.log("\n✅ OVERVIEW totals:", overview.totals);
    console.log("   rows:", overview.rows.length, "first:", overview.rows[0]);

    const top = await getTopPages();
    console.log("\n✅ TOP PAGES:", top.rows.slice(0, 5));

    const sources = await getTrafficSources();
    console.log("\n✅ TRAFFIC SOURCES:", sources.rows.slice(0, 5));

    console.log("\nALL GOOD ✓");
    process.exit(0);
  } catch (err: any) {
    console.error("\n❌ FAILED:", err?.message);
    if (err?.details) console.error("   details:", err.details);
    process.exit(1);
  }
})();
