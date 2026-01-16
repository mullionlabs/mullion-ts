<template>
  <div class="result-card">
    <UCard variant="outline">
      <template #header>
        <div class="result-card-header">
          <div class="result-card-title">
            <slot name="title">
              {{ title || 'Result' }}
            </slot>
          </div>
          <UBadge
            v-if="confidence !== undefined"
            :color="confidenceColor"
            :label="`${Math.round(confidence * 100)}% confidence`"
            variant="soft"
            size="sm"
          />
        </div>
      </template>

      <div class="result-card-content">
        <slot />
      </div>

      <template v-if="scope || $slots.footer" #footer>
        <div class="result-card-footer">
          <slot name="footer">
            <div v-if="scope" class="result-card-scope">
              <UBadge
                :label="`Scope: ${scope}`"
                color="neutral"
                variant="subtle"
                size="xs"
                icon="i-lucide-shield"
              />
            </div>
          </slot>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'ResultCard',
});

const props = defineProps<{
  title?: string;
  confidence?: number;
  scope?: string;
}>();

const confidenceColor = computed(() => {
  if (props.confidence === undefined) return 'neutral';

  if (props.confidence >= 0.8) return 'success';
  if (props.confidence >= 0.6) return 'warning';
  return 'error';
});
</script>

<style lang="scss">
.result-card {
  width: 100%;
}

.result-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.result-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ui-text);
  flex: 1;
  min-width: 0;
}

.result-card-content {
  color: var(--ui-text);
  line-height: 1.6;
}

.result-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.result-card-scope {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
