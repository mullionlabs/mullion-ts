import type {H3Event} from 'h3';
import type {UserSession} from './auth';
import {kv} from '@vercel/kv';

/**
 * Rate limit status for a user
 */
export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: string; // ISO timestamp
}

/**
 * Rate limit data stored in KV
 */
interface RateLimitData {
  count: number;
  resetAt: string; // ISO string for serialization
}

/**
 * Get rate limit key for a user
 */
function getRateLimitKey(userId: string): string {
  return `rate-limit:${userId}`;
}

/**
 * Check if rate limit has expired and should be reset
 */
function shouldReset(resetAt: string): boolean {
  return new Date() >= new Date(resetAt);
}

/**
 * Get the next reset time (midnight UTC tomorrow)
 */
function getNextResetTime(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0); // Next midnight UTC
  return tomorrow;
}

/**
 * Get rate limit status for a user
 */
export async function getRateLimitStatus(
  userId: string,
): Promise<RateLimitStatus> {
  const key = getRateLimitKey(userId);
  const entry = await kv.get<RateLimitData>(key);

  const {rateLimit} = useRuntimeConfig();

  // If no entry or expired, reset
  if (!entry || shouldReset(entry.resetAt)) {
    const resetAt = getNextResetTime();
    const newEntry: RateLimitData = {
      count: 0,
      resetAt: resetAt.toISOString(),
    };

    // Store in KV with TTL until reset time
    const ttlSeconds = Math.floor((resetAt.getTime() - Date.now()) / 1000);
    await kv.set(key, newEntry, {ex: ttlSeconds});

    return {
      remaining: rateLimit.maxRequests,
      limit: rateLimit.maxRequests,
      resetAt: resetAt.toISOString(),
    };
  }

  return {
    remaining: Math.max(0, rateLimit.maxRequests - entry.count),
    limit: rateLimit.maxRequests,
    resetAt: entry.resetAt,
  };
}

/**
 * Check if user has exceeded rate limit
 */
export async function isRateLimited(userId: string): Promise<boolean> {
  const status = await getRateLimitStatus(userId);
  return status.remaining <= 0;
}

/**
 * Increment rate limit counter for a user
 */
export async function incrementRateLimit(userId: string): Promise<void> {
  const key = getRateLimitKey(userId);
  const entry = await kv.get<RateLimitData>(key);

  if (!entry || shouldReset(entry.resetAt)) {
    // Initialize with first request
    const resetAt = getNextResetTime();
    const newEntry: RateLimitData = {
      count: 1,
      resetAt: resetAt.toISOString(),
    };

    const ttlSeconds = Math.floor((resetAt.getTime() - Date.now()) / 1000);
    await kv.set(key, newEntry, {ex: ttlSeconds});
  } else {
    // Increment existing counter
    const updatedEntry: RateLimitData = {
      count: entry.count + 1,
      resetAt: entry.resetAt,
    };

    const resetDate = new Date(entry.resetAt);
    const ttlSeconds = Math.floor((resetDate.getTime() - Date.now()) / 1000);
    await kv.set(key, updatedEntry, {ex: ttlSeconds});
  }
}

/**
 * Middleware to enforce rate limiting
 * Throws 429 error if rate limit exceeded
 */
export async function enforceRateLimit(
  event: H3Event,
  user: UserSession,
): Promise<void> {
  const limited = await isRateLimited(user.id);

  if (limited) {
    const status = await getRateLimitStatus(user.id);

    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Rate limit exceeded. Resets at ${status.resetAt}`,
      data: status,
    });
  }

  // Increment counter for this request
  await incrementRateLimit(user.id);

  // Set rate limit headers
  const status = await getRateLimitStatus(user.id);
  setHeader(event, 'X-RateLimit-Limit', status.limit.toString());
  setHeader(event, 'X-RateLimit-Remaining', status.remaining.toString());
  setHeader(event, 'X-RateLimit-Reset', status.resetAt);
}

/**
 * Helper to get rate limit status without enforcement
 * Useful for displaying current status to users
 */
export async function getRateLimitForUser(
  user: UserSession,
): Promise<RateLimitStatus> {
  return getRateLimitStatus(user.id);
}
