<script setup lang="ts">
/**
 * ResultCard Component
 *
 * A reusable card component for displaying results with optional metadata.
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
  <div class="result-card card" :class="{ 'border-error': error }">
    <div v-if="title" class="card-header flex items-center justify-between">
      <h3 class="card-title text-base">{{ title }}</h3>
      <span v-if="loading" class="loading" />
    </div>

    <div class="card-body">
      <!-- Error state -->
      <div v-if="error" class="flex items-start gap-sm text-error">
        <span aria-hidden="true">!</span>
        <span>{{ error }}</span>
      </div>

      <!-- Loading state -->
      <div v-else-if="loading" class="flex items-center gap-sm text-muted">
        <span class="loading" />
        <span>Processing...</span>
      </div>

      <!-- Content slot -->
      <template v-else>
        <slot />
      </template>
    </div>

    <!-- Footer slot for actions or metadata -->
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>
