<script setup lang="ts">
/**
 * ResultCard Component (Nuxt UI)
 *
 * A card component for displaying results using Nuxt UI Card.
 */

defineOptions({
  name: 'ResultCard',
});

withDefaults(
  defineProps<{
    title?: string;
    loading?: boolean;
    error?: string | null;
  }>(),
  {
    title: 'Result',
    loading: false,
    error: null,
  },
);
</script>

<template>
  <UCard class="result-card">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold">{{ title }}</h3>
        <UIcon v-if="loading" name="i-lucide-loader-circle" class="animate-spin" />
      </div>
    </template>

    <!-- Error state -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-triangle"
      :title="error"
    />

    <!-- Loading state -->
    <div v-else-if="loading" class="flex items-center gap-2 text-muted">
      <UIcon name="i-lucide-loader-circle" class="animate-spin" />
      <span>Processing...</span>
    </div>

    <!-- Content slot -->
    <template v-else>
      <slot />
    </template>

    <!-- Footer slot -->
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UCard>
</template>
