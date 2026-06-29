import { cacheSet, cacheDel } from "./index";
import { CacheKeys, CacheTTL } from "./keys";
import { getAllCategories } from "../../Service/CategoryService/CategoryService";
import { getAllColors } from "../../Service/ColorService/ColorService";
import { getAllSizes } from "../../Service/SizeService/SizeService";
import { getAllIcons } from "../../Service/IconService/IconService";

// ─── Cache invalidation (single source of truth) ────────────────────────────────
//
// One place that knows, for every cached resource, exactly which keys a write
// touches and how to refresh them. Keeping it here (instead of scattered cacheDel
// calls in each controller) is what makes the invalidation auditable.
//
// Reference lists (categories/colors/sizes/icons) are refreshed WRITE-THROUGH:
// after a write we re-read from Mongo and overwrite the cache, instead of just
// deleting the key and hoping the delete lands. A single dropped Redis op can't
// then leave stale data alive for the whole TTL — the failure mode behind the
// production stale-category-image incident.
//
// Each refresher MUST produce the same shape its getOrSet reader caches (see the
// matching controller), otherwise the storefront would read a mismatched payload.

const refreshCategories = async () =>
  cacheSet(CacheKeys.categories, CacheTTL.reference, { categories: await getAllCategories() });

const refreshColors = async () =>
  cacheSet(CacheKeys.colors, CacheTTL.reference, await getAllColors(undefined, undefined));

const refreshSizes = async () =>
  cacheSet(CacheKeys.sizes, CacheTTL.reference, await getAllSizes(undefined));

const refreshIcons = async () =>
  cacheSet(CacheKeys.icons, CacheTTL.reference, await getAllIcons(1));

// `home` is a heavy aggregation on a short TTL (2 min); just drop it and let the
// next request recompute — write-through would mean running the whole aggregation
// on every product/offer write for no real benefit.
const dropHome = () => cacheDel(CacheKeys.home);

// Categories also drive the home sections, so a category write refreshes both.
export const invalidateCategoryCaches = async () => {
  await refreshCategories();
  await dropHome();
};

export const invalidateColorCaches = () => refreshColors();

export const invalidateSizeCaches = () => refreshSizes();

// Categories embed their icon's key/svg (populated) and feed the home page, so an
// icon write must refresh the icon list AND the category list AND drop home.
export const invalidateIconCaches = async () => {
  await refreshIcons();
  await refreshCategories();
  await dropHome();
};
