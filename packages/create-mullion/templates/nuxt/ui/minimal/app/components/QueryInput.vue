<script setup lang="ts">
/**
 * QueryInput Component
 *
 * A reusable text input component for queries with submit functionality.
 */

defineOptions({
  name: 'QueryInput',
});

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    label?: string;
    rows?: number;
    loading?: boolean;
    submitLabel?: string;
  }>(),
  {
    placeholder: 'Enter your query...',
    label: 'Query',
    rows: 3,
    loading: false,
    submitLabel: 'Submit',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
}>();

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const handleSubmit = () => {
  if (inputValue.value.trim() && !props.loading) {
    emit('submit');
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    handleSubmit();
  }
};
</script>

<template>
  <div class="query-input stack-sm">
    <label v-if="label" :for="($attrs.id as string) || 'query-input'" class="m-0">
      {{ label }}
    </label>
    <textarea
      :id="($attrs.id as string) || 'query-input'"
      v-model="inputValue"
      :placeholder="placeholder"
      :rows="rows"
      class="w-full"
      @keydown="handleKeydown"
    />
    <div class="flex items-center justify-between gap-md">
      <span class="text-sm text-muted">
        Press <kbd>Cmd</kbd>+<kbd>Enter</kbd> to submit
      </span>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="loading || !inputValue.trim()"
        @click="handleSubmit"
      >
        <span v-if="loading" class="loading" />
        {{ loading ? 'Processing...' : submitLabel }}
      </button>
    </div>
  </div>
</template>
