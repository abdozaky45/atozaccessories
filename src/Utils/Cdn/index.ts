/**
 * Central helper for serving media through CloudFront instead of S3 directly.
 *
 * Uploads still go straight to S3 via presigned PUT URLs; CloudFront only sits
 * in front of reads (GET). So everything we *store* and *return* to clients
 * should be a CloudFront URL, while the S3 object key stays the source of truth.
 *
 * Env:
 *   CLOUDFRONT_URL   e.g. https://d1xdt7gkixoxw1.cloudfront.net
 *   AWS_BUCKET_NAME  e.g. atozaccessories
 *
 * Reads env lazily on each call so load order / dotenv timing never matters.
 */

const stripTrailingSlash = (s: string) => s.replace(/\/+$/, "");
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cdnBase = (): string => stripTrailingSlash(process.env.CLOUDFRONT_URL || "");

/**
 * Matches both S3 URL styles for our bucket, any region:
 *   virtual-hosted: https://<bucket>.s3[.region].amazonaws.com/<key>
 *   path-style:     https://s3[.region].amazonaws.com/<bucket>/<key>
 * The match captures the prefix up to (and including) the slash before <key>.
 */
const s3UrlRegex = (): RegExp => {
  const bucket = escapeRegex(process.env.AWS_BUCKET_NAME || "");
  return new RegExp(
    `^https?://(?:${bucket}\\.s3(?:[.-][a-z0-9-]+)*\\.amazonaws\\.com/|s3(?:[.-][a-z0-9-]+)*\\.amazonaws\\.com/${bucket}/)`,
    "i"
  );
};

/** Build a CloudFront URL from an S3 object key. */
export const toCdnUrl = (key: string): string =>
  `${cdnBase()}/${key.replace(/^\/+/, "")}`;

/** Extract the S3 object key from any URL we produce (CloudFront or S3). */
export const extractKey = (url: string): string => {
  if (!url) return url;
  const base = cdnBase();
  if (base && url.startsWith(base + "/")) {
    return url.slice(base.length + 1).split("?")[0];
  }
  const match = url.match(s3UrlRegex());
  if (match) return url.slice(match[0].length).split("?")[0];
  // Fallback: strip protocol + host and any query string.
  return url.replace(/^https?:\/\/[^/]+\//, "").split("?")[0];
};

/**
 * Rewrite an S3 URL to its CloudFront equivalent.
 * Leaves already-CDN URLs and anything unrecognised untouched (idempotent).
 */
export const rewriteToCdn = (url: string): string => {
  if (!url) return url;
  const base = cdnBase();
  if (!base) return url;
  if (url.startsWith(base + "/")) return url;
  const match = url.match(s3UrlRegex());
  if (!match) return url;
  return toCdnUrl(url.slice(match[0].length));
};
