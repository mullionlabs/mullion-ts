import {getAuthUser} from '../../utils/auth';

/**
 * Get current user endpoint
 * Returns authenticated user or null
 */
export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Not authenticated',
    });
  }

  return user;
});
