import {getAuthUser} from '../utils/auth';
import {getRateLimitForUser} from '../utils/rate-limit';

/**
 * Get rate limit status endpoint
 * Returns current rate limit info for authenticated user
 */
export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = await getAuthUser(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required to check rate limit',
    });
  }

  // Get rate limit status
  const status = await getRateLimitForUser(user);

  return status;
});
