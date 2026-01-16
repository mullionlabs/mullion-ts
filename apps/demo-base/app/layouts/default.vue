<template>
  <div class="default-layout">
    <header class="default-layout-header">
      <MullionHeader />
    </header>

    <main class="default-layout-main">
      <slot />
    </main>

    <footer class="default-layout-footer">
      <div class="footer-content">
        <p class="footer-text">
          Built with
          <a
            href="https://github.com/mullionlabs/mullion-ts"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-link"
          >
            Mullion
          </a>
          - Type-safe LLM context management
        </p>
        <p class="footer-copyright">
          © {{ new Date().getFullYear() }} Mullion Labs
        </p>
      </div>
    </footer>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'DefaultLayout',
});
</script>

<style lang="scss">
.default-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.default-layout-header {
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid var(--ui-border);
  background-color: var(--ui-bg);
}

.default-layout-main {
  flex: 1;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem 1rem;

  @media (min-width: 768px) {
    padding: 3rem 2rem;
  }
}

.default-layout-footer {
  border-top: 1px solid var(--ui-border);
  background-color: var(--ui-bg-elevated);
  padding: 2rem 1rem;
}

.footer-content {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
  }
}

.footer-text {
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}

.footer-link {
  color: var(--ui-primary);
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

.footer-copyright {
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
