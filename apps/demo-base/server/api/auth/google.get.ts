/**
 * Google OAuth redirect endpoint
 * Initiates OAuth flow with Google
 */
export default defineOAuthGoogleEventHandler({
  async onSuccess(event, {user}) {
    await setUserSession(event, {
      user: {
        id: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });

    return sendRedirect(event, '/');
  },
  onError(event, error) {
    console.error('Google OAuth error:', error);
    return sendRedirect(event, '/?error=auth_failed');
  },
});
