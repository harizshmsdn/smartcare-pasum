// In-memory sliding window rate limiter for edge middleware and server actions
const rateLimitStore = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  const timestamps = rateLimitStore.get(key) || [];
  // Prune timestamps older than window cutoff
  const validTimestamps = timestamps.filter((ts) => ts > cutoff);

  if (validTimestamps.length >= maxRequests) {
    const oldestTimestamp = validTimestamps[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
    rateLimitStore.set(key, validTimestamps);
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }

  // Append current timestamp and save
  validTimestamps.push(now);
  rateLimitStore.set(key, validTimestamps);

  return {
    allowed: true,
    remaining: maxRequests - validTimestamps.length,
    retryAfter: 0,
  };
}
