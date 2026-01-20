<script setup lang="ts">
/**
 * Main App Component with Nuxt UI
 *
 * Wraps the application with UApp for global configurations.
 */

defineOptions({
  name: 'App',
});
</script>

<template>
  <UApp class="app-root">
    <NuxtPage />
  </UApp>
</template>
