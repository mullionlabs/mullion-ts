<template>
  <div class="code-block">
    <div v-if="title" class="code-block-header">
      <span class="code-block-title">{{ title }}</span>
      <UButton
        v-if="copyable"
        icon="i-lucide-copy"
        size="xs"
        color="neutral"
        variant="ghost"
        :aria-label="copied ? 'Copied!' : 'Copy code'"
        @click="copyCode"
      >
        {{ copied ? 'Copied!' : '' }}
      </UButton>
    </div>
    <pre class="code-block-content"><code :class="languageClass">{{ code }}</code></pre>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'CodeBlock',
});

const props = withDefaults(
  defineProps<{
    code: string;
    language?: string;
    title?: string;
    copyable?: boolean;
  }>(),
  {
    language: 'typescript',
    copyable: true,
  }
);

const copied = ref(false);
let copyTimeout: NodeJS.Timeout | null = null;

const languageClass = computed(() => {
  return `language-${props.language}`;
});

const copyCode = async () => {
  if (!import.meta.client) return;

  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;

    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy code:', error);
  }
};

onUnmounted(() => {
  if (copyTimeout) clearTimeout(copyTimeout);
});
</script>

<style lang="scss">
.code-block {
  border-radius: 0.5rem;
  border: 1px solid var(--ui-border);
  background-color: var(--ui-bg-elevated);
  overflow: hidden;
}

.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ui-border);
  background-color: color-mix(in oklch, var(--ui-bg-accented) 50%, transparent);
}

.code-block-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text);
}

.code-block-content {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-text);

  code {
    display: block;
    font-family: inherit;
    background: transparent;
    padding: 0;
  }
}

// Basic syntax highlighting (can be enhanced with libraries like Shiki)
.code-block-content {
  .language-typescript,
  .language-javascript {
    color: var(--ui-text);
  }

  .language-json {
    color: var(--ui-text-muted);
  }

  .language-bash,
  .language-shell {
    color: var(--ui-text);
  }
}
</style>
