<script setup lang="ts">
/**
 * QueryInput Component (Nuxt UI)
 *
 * A text input component for queries using Nuxt UI Textarea and Button.
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
  <div class="query-input space-y-3">
    <UFormField v-if="label" :label="label">
      <UTextarea
        v-model="inputValue"
        :placeholder="placeholder"
        :rows="rows"
        autoresize
        class="w-full"
        @keydown="handleKeydown"
      />
    </UFormField>
    <UTextarea
      v-else
      v-model="inputValue"
      :placeholder="placeholder"
      :rows="rows"
      autoresize
      class="w-full"
      @keydown="handleKeydown"
    />

    <div class="flex items-center justify-between">
      <span class="text-sm text-muted">
        Press <UKbd>Cmd</UKbd>+<UKbd>Enter</UKbd> to submit
      </span>
      <UButton
        :loading="loading"
        :disabled="loading || !inputValue.trim()"
        @click="handleSubmit"
      >
        {{ loading ? 'Processing...' : submitLabel }}
      </UButton>
    </div>
  </div>
</template>
