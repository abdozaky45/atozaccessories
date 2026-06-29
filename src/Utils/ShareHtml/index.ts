// Server-rendered Open Graph page for social-media sharing.
//
// Why this exists: social crawlers (WhatsApp, Facebook, Telegram, X) do NOT run
// JavaScript. The storefront is a client-rendered Next app, so OG tags injected
// on the client are invisible to them. This endpoint returns a tiny HTML page
// with the OG tags already in the markup; real users are bounced to the product
// page with a JS redirect (never 301/302 or meta-refresh — crawlers follow those
// and would miss the OG page).

// 1) Escape so a product name/description can't break the HTML or inject markup.
export const escapeHtml = (v: string): string =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// 2) Decode HTML entities AFTER stripping tags (&amp; &nbsp; &#39; ...).
const decodeHtmlEntities = (v: string): string =>
  v
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/(?:&#0*39;|&apos;)/gi, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));

// 3) Descriptions may hold rich HTML — turn it into clean text. Block-level tags
//    become a space so words don't fuse together.
export const stripHtml = (html: string): string =>
  decodeHtmlEntities(
    html
      .replace(/<\s*\/?\s*(p|div|li|ul|ol|br|h[1-6]|tr|table)\b[^>]*>/gi, " ")
      .replace(/<[^>]*>/g, "")
  );

// 4) strip + collapse whitespace + clamp length.
const normalizeDescription = (v: string, max = 200): string => {
  const s = stripHtml(v).replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

export interface ProductShareMeta {
  title: string;
  description: string;
  imageUrl: string;
  shareUrl: string; // The share page URL itself (og:url).
  redirectUrl: string; // The storefront product page real users land on.
  siteName?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageType?: string;
}

export const renderProductShareHtml = (meta: ProductShareMeta): string => {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(
    normalizeDescription(meta.description || meta.title)
  );
  const imageUrl = escapeHtml(meta.imageUrl);
  const shareUrl = escapeHtml(meta.shareUrl);
  const siteName = escapeHtml(meta.siteName || "A to Z Accessories");
  const w = meta.imageWidth ?? 1080;
  const h = meta.imageHeight ?? 1080;
  const imageType = escapeHtml(meta.imageType || "image/jpeg");

  // Image tags only when there's an image — an empty og:image kills the card.
  const imageTags = meta.imageUrl
    ? `
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:type" content="${imageType}" />
  <meta property="og:image:width" content="${w}" />
  <meta property="og:image:height" content="${h}" />
  <meta property="og:image:alt" content="${title}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${imageUrl}" />`
    : `
  <meta name="twitter:card" content="summary" />`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="${siteName}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:locale" content="ar_EG" />${imageTags}

  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
</head>
<body>
  <p>جارٍ التحويل…</p>
  <!-- JS redirect only. No meta-refresh / 301 / 302: crawlers follow those and
       would scrape the product page instead of this OG page. -->
  <script>window.location.replace(${JSON.stringify(meta.redirectUrl)});</script>
</body>
</html>`;
};
