/**
 * Logout endpoint
 * Clears user session
 */
export default defineEventHandler(async (event) => {
  await clearUserSession(event);

  return {
    success: true,
    message: 'Logged out successfully',
  };
});
