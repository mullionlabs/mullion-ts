<template>
  <div class="cost-display">
    <div class="cost-display-item">
      <span class="cost-display-label">
        <UIcon name="i-lucide-coins" class="cost-display-icon" />
        Tokens:
      </span>
      <span class="cost-display-value">{{ formattedTokens }}</span>
    </div>

    <div v-if="cost !== undefined" class="cost-display-item">
      <span class="cost-display-label">
        <UIcon name="i-lucide-dollar-sign" class="cost-display-icon" />
        Est. Cost:
      </span>
      <span class="cost-display-value">{{ formattedCost }}</span>
    </div>

    <div v-if="cacheHit" class="cost-display-item">
      <UBadge
        label="Cache Hit"
        color="success"
        variant="soft"
        size="xs"
        icon="i-lucide-zap"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'CostDisplay',
});

const props = withDefaults(
  defineProps<{
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cost?: number;
    cacheHit?: boolean;
  }>(),
  {
    inputTokens: 0,
    outputTokens: 0,
    cacheHit: false,
  }
);

const formattedTokens = computed(() => {
  if (props.totalTokens !== undefined) {
    return props.totalTokens.toLocaleString();
  }

  const total = (props.inputTokens || 0) + (props.outputTokens || 0);
  const input = props.inputTokens || 0;
  const output = props.outputTokens || 0;

  if (input > 0 && output > 0) {
    return `${total.toLocaleString()} (${input.toLocaleString()} in / ${output.toLocaleString()} out)`;
  }

  return total.toLocaleString();
});

const formattedCost = computed(() => {
  if (props.cost === undefined) return 'N/A';

  // Format as currency
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(props.cost);
});
</script>

<style lang="scss">
.cost-display {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  background-color: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.cost-display-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cost-display-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--ui-text-muted);
  font-weight: 500;
}

.cost-display-icon {
  width: 1rem;
  height: 1rem;
  color: var(--ui-text-muted);
}

.cost-display-value {
  color: var(--ui-text);
  font-weight: 600;
}
</style>
