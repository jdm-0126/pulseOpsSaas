import Redis from "ioredis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not set");
    _redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
  }
  return _redis;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function tenantKey(accountId: number, key: string): string {
  return `account:${accountId}:${key}`;
}

export async function cacheGet<T>(accountId: number, key: string): Promise<T | null> {
  const raw = await getRedis().get(tenantKey(accountId, key));
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cacheSet(
  accountId: number,
  key: string,
  value: unknown,
  ttlSeconds = 60
): Promise<void> {
  await getRedis().set(tenantKey(accountId, key), JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheInvalidate(accountId: number, key: string): Promise<void> {
  await getRedis().del(tenantKey(accountId, key));
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────
// Sliding window: max `limit` requests per `windowSeconds` per tenant

export async function checkRateLimit(
  accountId: number,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const key = `ratelimit:${accountId}:${action}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, now - windowMs);
  pipeline.zadd(key, now, `${now}`);
  pipeline.zcard(key);
  pipeline.expire(key, windowSeconds);

  const results = await pipeline.exec();
  const count = (results?.[2]?.[1] as number) ?? 0;
  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);
  const resetIn = windowSeconds;

  return { allowed, remaining, resetIn };
}
