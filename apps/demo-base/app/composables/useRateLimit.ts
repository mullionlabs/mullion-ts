/**
 * Rate limit tracking composable
 *
 * Tracks per-user request usage (20 requests/day limit)
 */

interface RateLimitResponse {
  remaining: number;
  limit: number;
  resetAt: string;
}

export const useRateLimit = () => {
  const remaining = useState<number>('rate-limit-remaining', () => 20);
  const limit = useState<number>('rate-limit-limit', () => 20);
  const resetAt = useState<Date | null>('rate-limit-reset', () => null);

  const isLimitReached = computed(() => remaining.value <= 0);
  const hasWarning = computed(
    () => remaining.value <= 5 && remaining.value > 0
  );

  const fetchRateLimit = async (): Promise<void> => {
    if (import.meta.server) return;

    try {
      const response = await $fetch<RateLimitResponse>('/api/rate-limit');

      remaining.value = response.remaining;
      limit.value = response.limit;
      resetAt.value = new Date(response.resetAt);
    } catch {
      // Default values on error
      remaining.value = 20;
      limit.value = 20;
      resetAt.value = null;
    }
  };

  const decrementRemaining = (): void => {
    if (remaining.value > 0) {
      remaining.value -= 1;
    }
  };

  const formatResetTime = computed(() => {
    if (!resetAt.value) return 'unknown';

    const now = new Date();
    const reset = new Date(resetAt.value);
    const diff = reset.getTime() - now.getTime();

    if (diff <= 0) return 'now';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  });

  return {
    remaining: readonly(remaining),
    limit: readonly(limit),
    resetAt: readonly(resetAt),
    isLimitReached,
    hasWarning,
    formatResetTime,
    fetchRateLimit,
    decrementRemaining,
  };
};
