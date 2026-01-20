<script setup lang="ts">
/**
 * Base Landing Page
 *
 * This minimal page will be replaced by scenario-specific
 * implementations (RAG demo, Helpdesk demo, etc.)
 */

const projectName = '{{PROJECT_NAME}}';

defineOptions({
  name: 'BaseLandingPage',
});
</script>

<template>
  <main class="base-page container stack-lg">
    <header class="stack-sm text-center">
      <h1 class="m-0">{{ projectName }}</h1>
      <p class="text-muted text-lg m-0">Powered by Mullion</p>
    </header>

    <section class="stack-md">
      <div class="card bg-muted stack-md">
        <h2 class="m-0">Getting Started</h2>
        <p class="m-0">
          This is a base Mullion application. Your selected scenario will
          provide the specific functionality.
        </p>

        <div class="stack-xs p-md border rounded-md bg-card">
          <p class="m-0">
            <strong>Scenario:</strong>
            Will be added by overlay
          </p>
          <p class="m-0">
            <strong>Mode:</strong>
            Check server configuration
          </p>
        </div>

        <div class="cluster">
          <a
            href="https://github.com/mullionlabs/mullion-ts"
            target="_blank"
            class="btn btn-primary"
          >
            Documentation
          </a>
        </div>
      </div>
    </section>
  </main>
</template>
