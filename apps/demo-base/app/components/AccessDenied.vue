<template>
  <div class="access-denied">
    <UCard variant="outline">
      <div class="access-denied-content">
        <div class="access-denied-icon">
          <UIcon name="i-lucide-lock" class="icon" />
        </div>

        <h2 class="access-denied-title">
          {{ title || 'Authentication Required' }}
        </h2>

        <p class="access-denied-message">
          {{ message || 'You need to sign in with Google to access this demo.' }}
        </p>

        <div class="access-denied-actions">
          <UButton
            icon="i-lucide-log-in"
            label="Sign In with Google"
            color="primary"
            variant="solid"
            size="lg"
            @click="signIn"
          />
        </div>

        <div v-if="showInfo" class="access-denied-info">
          <UAlert
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            title="Why sign in?"
            description="We use Google OAuth to limit demo usage to 20 requests per day and protect our API costs. Your data is not stored."
          />
        </div>
      </div>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'AccessDenied',
});

defineProps<{
  title?: string;
  message?: string;
  showInfo?: boolean;
}>();

const { signIn } = useAuth();
</script>

<style lang="scss">
.access-denied {
  max-width: 600px;
  margin: 2rem auto;
}

.access-denied-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem 1rem;
}

.access-denied-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background-color: color-mix(in oklch, var(--ui-primary) 10%, transparent);
  margin-bottom: 1.5rem;

  .icon {
    width: 2rem;
    height: 2rem;
    color: var(--ui-primary);
  }
}

.access-denied-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ui-text);
  margin-bottom: 0.75rem;
}

.access-denied-message {
  font-size: 1rem;
  color: var(--ui-text-muted);
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 400px;
}

.access-denied-actions {
  margin-bottom: 2rem;
}

.access-denied-info {
  width: 100%;
}
</style>
