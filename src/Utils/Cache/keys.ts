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
  reference: 3600, // 1 hour — categories/colors/sizes/icons
};
