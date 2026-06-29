import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { createPrivateKey } from "crypto";
import { ApiError } from "../../Utils/ErrorHandling";

/**
 * Server-side GA4 reporting (Data API). We only READ reports here — events are
 * sent from the browser via gtag (see the frontend lib/analytics.ts). The admin
 * panel calls these to render traffic dashboards.
 *
 * Auth is via a Service Account (client_email + private_key). The account must
 * be added as a Viewer on the GA4 property, otherwise every call fails with
 * PERMISSION_DENIED even when the keys are correct.
 */

// ── private key handling ─────────────────────────────────────────────────────
// The PEM is multi-line, but env vars are single-line. We standardise on:
//   GA_PRIVATE_KEY_BASE64 — base64 of the full PEM. Its alphabet is A–Z a–z 0–9
//   + / = only: no backslashes, newlines or quotes, so it survives any deployment
//   console (e.g. Elastic Beanstalk) untouched. We decode it back to the PEM here.
// We also accept the raw PEM in GA_PRIVATE_KEY (with literal "\n" escapes) as a
// fallback. Either way, deployment consoles mangle the key in many ways: wrapping
// it in quotes, turning the body's newlines into spaces, or leaving literal "\n"
// escapes in place. Any of these yields the opaque gRPC error
// `error:1E08010C:DECODER routines::unsupported`. Checking for the BEGIN/END
// markers is not enough — the markers can survive while the body is broken. So we
// REBUILD a canonical PEM from whatever we get (extract the base64 body, strip
// everything that isn't base64, re-wrap at 64 chars) and then prove it parses with
// crypto.createPrivateKey before handing it to the client.

const stripWrappingQuotes = (s: string): string =>
  s.replace(/^\s*['"]|['"]\s*$/g, "");

// Reconstruct a clean PEM from a possibly-mangled one. Tolerates lost newlines,
// literal "\n" escapes, and stray whitespace inside the base64 body.
const normalizePem = (input: string): string | undefined => {
  const begin = input.match(/-----BEGIN ([A-Z0-9 ]+?)-----/);
  const end = input.match(/-----END ([A-Z0-9 ]+?)-----/);
  if (!begin || !end) return undefined;

  const label = begin[1].trim();
  const bodyStart = input.indexOf(begin[0]) + begin[0].length;
  const bodyEnd = input.indexOf(end[0]);
  if (bodyEnd <= bodyStart) return undefined;

  // Keep only base64 chars — drops spaces, real newlines and literal "\n".
  const body = input.slice(bodyStart, bodyEnd).replace(/[^A-Za-z0-9+/=]/g, "");
  if (!body) return undefined;

  const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`;
};

// Throws a precise ApiError if the key still won't parse after normalisation.
const assertUsable = (pem: string, source: string): string => {
  try {
    createPrivateKey(pem);
    return pem;
  } catch {
    throw new ApiError(
      500,
      `${source} is set but the private key still cannot be parsed (OpenSSL ` +
        `DECODER error). The value in this environment is corrupted — most likely ` +
        `truncated or copied from a mangled key. Re-generate it from the original ` +
        `service-account JSON: ` +
        `node -e "console.log(Buffer.from(require('./key.json').private_key).toString('base64'))" ` +
        `and set the result as GA_PRIVATE_KEY_BASE64 (no quotes, no spaces).`
    );
  }
};

const resolvePrivateKey = (): string | undefined => {
  const rawB64 = process.env.GA_PRIVATE_KEY_BASE64;
  if (rawB64) {
    // Drop quotes and ALL whitespace a console may have injected into the base64.
    const cleaned = stripWrappingQuotes(rawB64).replace(/\s+/g, "");
    const decoded = Buffer.from(cleaned, "base64").toString("utf8");
    const pem = normalizePem(decoded);
    if (!pem) {
      throw new ApiError(
        500,
        "GA_PRIVATE_KEY_BASE64 did not decode to a PEM (no BEGIN/END markers found). " +
          "Re-set it to the exact base64 of the service account PEM, with no quotes."
      );
    }
    return assertUsable(pem, "GA_PRIVATE_KEY_BASE64");
  }

  // Fallback: raw PEM (with real newlines or literal "\n" escapes).
  const rawPem = process.env.GA_PRIVATE_KEY;
  if (rawPem) {
    const pem = normalizePem(stripWrappingQuotes(rawPem));
    if (!pem) {
      throw new ApiError(
        500,
        "GA_PRIVATE_KEY is set but has no BEGIN/END PRIVATE KEY markers."
      );
    }
    return assertUsable(pem, "GA_PRIVATE_KEY");
  }

  return undefined;
};

let cachedClient: BetaAnalyticsDataClient | null = null;

const getClient = (): BetaAnalyticsDataClient => {
  if (cachedClient) return cachedClient;

  const client_email = process.env.GA_CLIENT_EMAIL;
  const private_key = resolvePrivateKey();
  if (!client_email || !private_key) {
    throw new ApiError(
      500,
      "GA credentials are not configured (GA_CLIENT_EMAIL / GA_PRIVATE_KEY_BASE64)."
    );
  }

  cachedClient = new BetaAnalyticsDataClient({
    credentials: { client_email, private_key },
    projectId: process.env.GA_PROJECT_ID,
  });
  return cachedClient;
};

const getProperty = (): string => {
  const id = process.env.GA_PROPERTY_ID;
  if (!id) {
    throw new ApiError(
      500,
      "GA_PROPERTY_ID is not set (the numeric Property ID from GA4 → Admin → Property Settings, not the G-XXXX measurement id)."
    );
  }
  return `properties/${id}`;
};

// GA4 returns dates as YYYYMMDD; reshape to YYYY-MM-DD for the UI/charts.
const reshapeDate = (yyyymmdd: string): string =>
  yyyymmdd?.length === 8
    ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
    : yyyymmdd;

export interface DateRange {
  startDate: string; // ISO (2026-01-31) or keyword (7daysAgo)
  endDate: string; // ISO or keyword (today)
}

// Default to the last 7 days when no range is supplied.
const DEFAULT_RANGE: DateRange = { startDate: "7daysAgo", endDate: "today" };

export interface OverviewRow {
  date: string;
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  newUsers: number;
  averageSessionDuration: number;
}

export interface OverviewTotals {
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  newUsers: number;
}

export interface OverviewReport {
  range: DateRange;
  rows: OverviewRow[];
  totals: OverviewTotals;
}

const num = (v: string | null | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const getOverview = async (
  range: DateRange = DEFAULT_RANGE
): Promise<OverviewReport> => {
  const [response] = await getClient().runReport({
    property: getProperty(),
    dateRanges: [range],
    dimensions: [{ name: "date" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "newUsers" },
      { name: "averageSessionDuration" },
    ],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });

  const rows: OverviewRow[] = (response.rows ?? []).map((r) => ({
    date: reshapeDate(r.dimensionValues?.[0]?.value ?? ""),
    activeUsers: num(r.metricValues?.[0]?.value),
    sessions: num(r.metricValues?.[1]?.value),
    screenPageViews: num(r.metricValues?.[2]?.value),
    newUsers: num(r.metricValues?.[3]?.value),
    averageSessionDuration: num(r.metricValues?.[4]?.value),
  }));

  const totals = rows.reduce<OverviewTotals>(
    (acc, r) => ({
      activeUsers: acc.activeUsers + r.activeUsers,
      sessions: acc.sessions + r.sessions,
      screenPageViews: acc.screenPageViews + r.screenPageViews,
      newUsers: acc.newUsers + r.newUsers,
    }),
    { activeUsers: 0, sessions: 0, screenPageViews: 0, newUsers: 0 }
  );

  return { range, rows, totals };
};

export interface TopPageRow {
  pagePath: string;
  screenPageViews: number;
}

export const getTopPages = async (
  range: DateRange = DEFAULT_RANGE,
  limit = 10
): Promise<{ range: DateRange; rows: TopPageRow[] }> => {
  const [response] = await getClient().runReport({
    property: getProperty(),
    dateRanges: [range],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit,
  });

  const rows: TopPageRow[] = (response.rows ?? []).map((r) => ({
    pagePath: r.dimensionValues?.[0]?.value ?? "",
    screenPageViews: num(r.metricValues?.[0]?.value),
  }));

  return { range, rows };
};

export interface TrafficSourceRow {
  source: string;
  sessions: number;
}

export const getTrafficSources = async (
  range: DateRange = DEFAULT_RANGE,
  limit = 10
): Promise<{ range: DateRange; rows: TrafficSourceRow[] }> => {
  const [response] = await getClient().runReport({
    property: getProperty(),
    dateRanges: [range],
    dimensions: [{ name: "sessionSource" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });

  const rows: TrafficSourceRow[] = (response.rows ?? []).map((r) => ({
    source: r.dimensionValues?.[0]?.value ?? "",
    sessions: num(r.metricValues?.[0]?.value),
  }));

  return { range, rows };
};
