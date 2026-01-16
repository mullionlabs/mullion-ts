import type { H3Event } from 'h3';

/**
 * User session interface
 */
export interface UserSession {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Get current user session from nuxt-auth-utils
 */
export async function getAuthUser(event: H3Event): Promise<UserSession | null> {
  const session = await getUserSession(event);
  return (session?.user as UserSession) || null;
}

/**
 * Require authentication middleware
 * Throws 401 error if user is not authenticated
 */
export async function requireAuth(event: H3Event): Promise<UserSession> {
  const session = await requireUserSession(event);

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  return session.user as UserSession;
}
