import { Redis } from "@upstash/redis";

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();
let redisClient: Redis | null = null;
let redisInitialized = false;

function getRedis(): Redis | null {
  if (redisInitialized) {
    return redisClient;
  }
  redisInitialized = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

function memoryRateLimit(input: {
  key: string;
  max: number;
  windowMs: number;
}): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = memoryBuckets.get(input.key);

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= input.max) {
    return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }

  bucket.count += 1;
  memoryBuckets.set(input.key, bucket);
  return { allowed: true, retryAfterMs: 0 };
}

export async function checkRateLimit(input: {
  key: string;
  max: number;
  windowMs: number;
}): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const redis = getRedis();
  if (!redis) {
    return memoryRateLimit(input);
  }

  try {
    const windowKey = `rl:${input.key}:${Math.floor(Date.now() / input.windowMs)}`;
    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.pexpire(windowKey, input.windowMs);
    }
    if (count > input.max) {
      const ttlMs = await redis.pttl(windowKey);
      return { allowed: false, retryAfterMs: Math.max(0, ttlMs ?? 0) };
    }
    return { allowed: true, retryAfterMs: 0 };
  } catch {
    return memoryRateLimit(input);
  }
}
