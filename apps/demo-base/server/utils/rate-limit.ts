import type { H3Event } from 'h3';
import type { UserSession } from './auth';

/**
 * Rate limit configuration
 */
export const RATE_LIMIT = {
  MAX_REQUESTS: 20,
  WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Rate limit status for a user
 */
export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: string; // ISO timestamp
}

/**
 * In-memory rate limit store (placeholder)
 *
 * TODO: Replace with Vercel KV in Task 13.5
 * This is a simple in-memory implementation for development
 */
const rateLimitStore = new Map<
  string,
  {
    count: number;
    resetAt: Date;
  }
>();

/**
 * Get rate limit key for a user
 */
function getRateLimitKey(userId: string): string {
  return `rate-limit:${userId}`;
}

/**
 * Check if rate limit has expired and should be reset
 */
function shouldReset(resetAt: Date): boolean {
  return new Date() >= resetAt;
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
  userId: string
): Promise<RateLimitStatus> {
  const key = getRateLimitKey(userId);
  const entry = rateLimitStore.get(key);

  // If no entry or expired, reset
  if (!entry || shouldReset(entry.resetAt)) {
    const resetAt = getNextResetTime();
    rateLimitStore.set(key, {
      count: 0,
      resetAt,
    });

    return {
      remaining: RATE_LIMIT.MAX_REQUESTS,
      limit: RATE_LIMIT.MAX_REQUESTS,
      resetAt: resetAt.toISOString(),
    };
  }

  return {
    remaining: Math.max(0, RATE_LIMIT.MAX_REQUESTS - entry.count),
    limit: RATE_LIMIT.MAX_REQUESTS,
    resetAt: entry.resetAt.toISOString(),
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
  const entry = rateLimitStore.get(key);

  if (!entry || shouldReset(entry.resetAt)) {
    // Initialize with first request
    const resetAt = getNextResetTime();
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
    });
  } else {
    // Increment existing counter
    entry.count += 1;
    rateLimitStore.set(key, entry);
  }
}

/**
 * Middleware to enforce rate limiting
 * Throws 429 error if rate limit exceeded
 */
export async function enforceRateLimit(
  event: H3Event,
  user: UserSession
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
  user: UserSession
): Promise<RateLimitStatus> {
  return getRateLimitStatus(user.id);
}
