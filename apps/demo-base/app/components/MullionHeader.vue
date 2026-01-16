<template>
  <div class="mullion-header">
    <div class="mullion-header-container">
      <!-- Logo and Title -->
      <div class="mullion-header-brand">
        <NuxtLink to="/" class="mullion-header-logo">
          <span class="logo-text">Mullion</span>
        </NuxtLink>
        <span class="mullion-header-divider">|</span>
        <span class="mullion-header-title">{{ demoTitle }}</span>
      </div>

      <!-- Right side: Auth and GitHub -->
      <div class="mullion-header-actions">
        <AuthButton />
        <UButton
          icon="i-lucide-github"
          to="https://github.com/mullionlabs/mullion-ts"
          target="_blank"
          color="neutral"
          variant="ghost"
          aria-label="View on GitHub"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'MullionHeader',
});

const props = defineProps<{
  demoTitle?: string;
}>();

// Default to "Demo" if no title provided
const demoTitle = computed(() => props.demoTitle || 'Demo');
</script>

<style lang="scss">
.mullion-header {
  width: 100%;
  background-color: var(--ui-bg);
}

.mullion-header-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.mullion-header-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mullion-header-logo {
  text-decoration: none;
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--ui-primary);
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
}

.logo-text {
  background: linear-gradient(135deg, var(--ui-primary) 0%, var(--ui-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mullion-header-divider {
  color: var(--ui-border);
  font-size: 1.25rem;
  font-weight: 300;
}

.mullion-header-title {
  font-size: 1rem;
  color: var(--ui-text-muted);
  font-weight: 500;
}

.mullion-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .mullion-header-title {
    display: none;
  }
}
</style>
