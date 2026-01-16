/**
 * Google OAuth state management composable
 *
 * Provides authentication state and methods for sign in/out
 */

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export const useAuth = () => {
  const user = useState<User | null>('auth-user', () => null);

  const isAuthenticated = computed(() => user.value !== null);

  const signIn = async (): Promise<void> => {
    // Redirect to Google OAuth
    await navigateTo('/api/auth/google', {external: true});
  };

  const signOut = async (): Promise<void> => {
    try {
      await $fetch('/api/auth/logout', {method: 'POST'});
      user.value = null;
      await navigateTo('/');
    } catch (error: unknown) {
      console.error('Sign out error:', error);
    }
  };

  // Fetch current user on mount (client-side only)
  const fetchUser = async (): Promise<void> => {
    if (import.meta.server) return;

    try {
      const response = await $fetch<User>('/api/auth/user');
      user.value = response;
    } catch {
      // Not authenticated or error
      user.value = null;
    }
  };

  return {
    user: readonly(user),
    isAuthenticated,
    signIn,
    signOut,
    fetchUser,
  };
};
