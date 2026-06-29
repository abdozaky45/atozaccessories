import { getRedis } from "../../config/redis";

// ─── Best-effort cache helpers ──────────────────────────────────────────────────
//
// Every helper degrades gracefully: if Redis is missing or down, reads fall back
// to the source function and writes/invalidations are silently skipped. A cache
// failure must never break a request.

/**
 * Return the cached value for `key`, or compute it with `fn`, cache it for
 * `ttlSeconds`, and return it. Falls back to `fn()` on any cache error.
 */
export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const client = getRedis();

  if (client) {
    try {
      const cached = await client.get(key);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch {
      // ignore — treat as cache miss
    }
  }

  const fresh = await fn();

  if (client) {
    try {
      await client.set(key, JSON.stringify(fresh), "EX", ttlSeconds);
    } catch {
      // ignore — value is still returned to the caller
    }
  }

  return fresh;
}

/**
 * Write `value` to `key` for `ttlSeconds`, overwriting any existing entry.
 * Use after a mutation (write-through) so the cache reflects the new state
 * immediately instead of depending on a prior `cacheDel` having succeeded —
 * a swallowed delete error would otherwise leave the stale value alive for
 * the full TTL.
 */
export async function cacheSet<T>(key: string, ttlSeconds: number, value: T): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // ignore
  }
}

/** Delete one or more exact keys. */
export async function cacheDel(...keys: string[]): Promise<void> {
  const client = getRedis();
  if (!client || keys.length === 0) return;
  try {
    await client.del(...keys);
  } catch {
    // ignore
  }
}

/**
 * Delete every key matching `prefix*` using a non-blocking SCAN (safe on the
 * free tier — never use KEYS in production). Used to drop a whole family of
 * cached entries, e.g. all product-listing variations.
 */
export async function cacheDelByPrefix(prefix: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    let cursor = "0";
    do {
      const [next, batch] = await client.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
      cursor = next;
      if (batch.length) await client.del(...batch);
    } while (cursor !== "0");
  } catch {
    // ignore
  }
}
