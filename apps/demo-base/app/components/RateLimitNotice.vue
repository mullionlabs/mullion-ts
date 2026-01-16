<template>
  <div v-if="shouldShow" class="rate-limit-notice">
    <UAlert
      :color="alertColor"
      :variant="alertVariant"
      :icon="alertIcon"
      :title="alertTitle"
      :description="alertDescription"
    />
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'RateLimitNotice',
});

const { remaining, limit, isLimitReached, hasWarning, formatResetTime, fetchRateLimit } =
  useRateLimit();

// Fetch rate limit data on mount
onMounted(() => {
  fetchRateLimit();
});

// Only show if there's a warning or limit reached
const shouldShow = computed(() => hasWarning.value || isLimitReached.value);

const alertColor = computed(() => {
  if (isLimitReached.value) return 'error';
  if (hasWarning.value) return 'warning';
  return 'info';
});

const alertVariant = computed(() => {
  if (isLimitReached.value) return 'soft';
  return 'subtle';
});

const alertIcon = computed(() => {
  if (isLimitReached.value) return 'i-lucide-x-circle';
  if (hasWarning.value) return 'i-lucide-alert-triangle';
  return 'i-lucide-info';
});

const alertTitle = computed(() => {
  if (isLimitReached.value) return 'Rate Limit Reached';
  if (hasWarning.value) return 'Low Request Count';
  return 'Rate Limit Info';
});

const alertDescription = computed(() => {
  if (isLimitReached.value) {
    return `You've used all ${limit.value} requests for today. Resets in ${formatResetTime.value}.`;
  }
  if (hasWarning.value) {
    return `${remaining.value} of ${limit.value} requests remaining. Resets in ${formatResetTime.value}.`;
  }
  return `${remaining.value} of ${limit.value} requests remaining today.`;
});
</script>

<style lang="scss">
.rate-limit-notice {
  width: 100%;
  margin-bottom: 1.5rem;
}
</style>
