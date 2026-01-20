<script setup lang="ts">
/**
 * RAG Demo Page
 *
 * Interactive demo for the RAG pipeline with access-level
 * aware document retrieval.
 */

import type {AccessLevel, QueryResponse} from '~~/schemas';

defineOptions({
  name: 'RagPage',
});

const projectName = '{{PROJECT_NAME}}';

// Check if running in mock mode by fetching server status
const {data: serverStatus} = useFetch('/api/status');
const isMockMode = computed(() => serverStatus.value?.mockMode ?? true);

const query = ref('');
const accessLevel = ref<AccessLevel>('public');
const loading = ref(false);
const result = ref<QueryResponse['data'] | null>(null);
const error = ref<string | null>(null);

const accessLevels = [
  {value: 'public', label: 'Public', description: 'Product docs, marketing'},
  {
    value: 'internal',
    label: 'Internal',
    description: 'Employee handbooks, roadmaps',
  },
  {
    value: 'confidential',
    label: 'Confidential',
    description: 'Financial data, security',
  },
] satisfies Array<{value: AccessLevel; label: string; description: string}>;

const exampleQueries = [
  {query: 'What features does the product offer?', level: 'public'},
  {query: 'What is our Q4 roadmap?', level: 'internal'},
  {query: 'What were our Q3 financial results?', level: 'confidential'},
] satisfies Array<{query: string; level: AccessLevel}>;

const accessLevelClasses: Record<AccessLevel, {border: string; badge: string}> =
  {
    public: {border: 'border-success', badge: 'badge badge-success'},
    internal: {border: 'border-warning', badge: 'badge badge-warning'},
    confidential: {border: 'border-error', badge: 'badge badge-error'},
  };

const getAccessLevelBorderClass = (level: AccessLevel) =>
  accessLevelClasses[level]?.border ?? 'border-info';

const getAccessLevelBadgeClass = (level: AccessLevel) =>
  accessLevelClasses[level]?.badge ?? 'badge badge-info';

const showResult = computed(
  () => loading.value || Boolean(error.value) || Boolean(result.value),
);

const submitQuery = async () => {
  if (!query.value.trim()) return;

  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const response = await $fetch<QueryResponse>('/api/query', {
      method: 'POST',
      body: {
        query: query.value,
        accessLevel: accessLevel.value,
      },
    });

    if (response.success) {
      result.value = response.data;
    }
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Query failed';
  } finally {
    loading.value = false;
  }
};

const useExample = (example: (typeof exampleQueries)[0]) => {
  query.value = example.query;
  accessLevel.value = example.level;
};
</script>

<template>
  <main class="rag-page container stack-lg">
    <header class="stack-sm text-center">
      <h1 class="m-0">{{ projectName }}</h1>
      <p class="text-muted m-0">RAG Pipeline with Access Control</p>
      <span class="badge badge-info">Powered by Mullion</span>
    </header>

    <!-- Mock Mode Banner -->
    <div
      v-if="isMockMode"
      class="flex items-start gap-md p-md bg-info border border-info rounded-lg"
    >
      <span
        class="font-semibold text-info"
        aria-hidden="true"
        >i</span
      >
      <div class="stack-xs">
        <strong class="text-info">Mock Mode Active</strong>
        <p class="text-sm text-info m-0">
          Running with simulated responses. Add API keys to
          <code>.env</code> for real LLM calls.
        </p>
      </div>
    </div>

    <section class="stack-lg">
      <div class="card stack-md">
        <h2 class="mb-0">Query Knowledge Base</h2>

        <div class="stack-sm">
          <label class="m-0">Your Access Level</label>
          <div class="grid grid-auto gap-sm">
            <label
              v-for="level in accessLevels"
              :key="level.value"
              class="stack-xs p-sm border rounded-md"
              :class="
                accessLevel === level.value
                  ? [getAccessLevelBorderClass(level.value), 'bg-soft']
                  : 'bg-card'
              "
            >
              <input
                type="radio"
                :value="level.value"
                v-model="accessLevel"
                name="access-level"
                class="sr-only"
              />
              <span class="font-semibold">{{ level.label }}</span>
              <span class="text-sm text-muted">{{ level.description }}</span>
            </label>
          </div>
        </div>

        <QueryInput
          v-model="query"
          label="Your Question"
          placeholder="Ask a question about the knowledge base..."
          :rows="3"
          :loading="loading"
          submitLabel="Submit Query"
          @submit="submitQuery"
        />

        <div class="stack-sm">
          <label class="m-0">Try an example:</label>
          <div class="cluster">
            <button
              v-for="example in exampleQueries"
              :key="example.query"
              type="button"
              class="btn btn-secondary btn-sm"
              @click="useExample(example)"
            >
              <span>{{ example.query.substring(0, 30) }}...</span>
              <span :class="getAccessLevelBadgeClass(example.level)">
                {{ example.level }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <ResultCard
        v-if="showResult"
        title="Answer"
        :loading="loading"
        :error="error"
      >
        <div
          v-if="result"
          class="stack-md"
        >
          <p class="m-0">{{ result.answer }}</p>

          <div class="grid grid-auto gap-md p-md bg-muted rounded-md">
            <div class="text-center stack-xs">
              <span class="text-xs uppercase tracking-wide text-muted">
                Confidence
              </span>
              <span class="font-semibold"
                >{{ (result.confidence * 100).toFixed(0) }}%</span
              >
            </div>
            <div class="text-center stack-xs">
              <span class="text-xs uppercase tracking-wide text-muted">
                Access Level
              </span>
              <span :class="getAccessLevelBadgeClass(result.accessLevel)">
                {{ result.accessLevel }}
              </span>
            </div>
            <div class="text-center stack-xs">
              <span class="text-xs uppercase tracking-wide text-muted">
                Documents Used
              </span>
              <span class="font-semibold">{{
                result.metrics.documentsUsed
              }}</span>
            </div>
            <div class="text-center stack-xs">
              <span class="text-xs uppercase tracking-wide text-muted"
                >Time</span
              >
              <span class="font-semibold"
                >{{ result.metrics.executionTimeMs }}ms</span
              >
            </div>
          </div>

          <div
            v-if="result.sources.length > 0"
            class="stack-sm"
          >
            <h4 class="text-xs uppercase tracking-wide text-muted m-0">
              Sources
            </h4>
            <ul class="list-none list-divider">
              <li
                v-for="source in result.sources"
                :key="source.documentId"
                class="flex items-center justify-between gap-sm"
              >
                <strong>{{ source.title }}</strong>
                <span :class="getAccessLevelBadgeClass(source.accessLevel)">
                  {{ source.accessLevel }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </ResultCard>
    </section>
  </main>
</template>
