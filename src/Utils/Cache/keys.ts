// ─── Central cache key + TTL registry ───────────────────────────────────────────
//
// Keep every cache key and its lifetime in one place so invalidation stays honest:
// whoever writes data can see exactly which keys/prefixes to drop.

export const CacheKeys = {
  home: "home:v1",

  // Reference data — small and changes rarely.
  categories: "ref:categories:v1",
  colors: "ref:colors:v1",
  sizes: "ref:sizes:v1",
  icons: "ref:icons:v1",
};

// TTLs in seconds.
export const CacheTTL = {
  home: 120, // 2 min — heavy aggregation, changes slowly
  // 5 min — categories/colors/sizes/icons. Writes refresh these immediately
  // (write-through, see Utils/Cache/invalidate.ts), so this TTL is only the
  // safety net that bounds staleness if a Redis op is dropped during a write —
  // never the 1-hour window that caused the production stale-image incident.
  reference: 300,
};
