import Redis from "ioredis";

// ─── Redis client (singleton) ───────────────────────────────────────────────────
//
// Used only as a best-effort cache in front of read-heavy endpoints. The app must
// keep working if Redis is unreachable, so:
//   • the client is created only when REDIS_HOST is configured,
//   • errors are swallowed (logged once) instead of crashing the process,
//   • commands fail fast (enableOfflineQueue: false) so requests fall back to the
//     DB immediately rather than hanging while disconnected.

let instance: Redis | null = null;
let disabled = false;

export const getRedis = (): Redis | null => {
  if (disabled) return null;
  if (instance) return instance;

  const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env;
  if (!REDIS_HOST) {
    // No Redis configured — caching is simply skipped everywhere.
    disabled = true;
    return null;
  }

  instance = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT ? Number(REDIS_PORT) : 6379,
    password: REDIS_PASSWORD || undefined,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    // Back off, but cap retries so we don't hammer a dead instance.
    retryStrategy: (times) => (times > 10 ? null : Math.min(times * 200, 2000)),
  });

  instance.on("error", (err) => {
    // ioredis emits frequently while down; log sparingly.
    if ((instance as any)?._loggedError) return;
    (instance as any)._loggedError = true;
    console.error("[Redis] connection error (cache disabled until it recovers):", err.message);
  });

  instance.on("ready", () => {
    if (instance) (instance as any)._loggedError = false;
    console.log("[Redis] connected");
  });

  return instance;
};

export const closeRedis = async (): Promise<void> => {
  if (instance) {
    await instance.quit().catch(() => {});
    instance = null;
  }
};
