<template>
  <div class="rag-demo">
    <RateLimitNotice />

    <AccessDenied
      v-if="!isAuthenticated"
      :show-info="true"
    />

    <div
      v-else
      class="demo-content"
    >
      <div class="demo-header">
        <h1 class="demo-title">Interactive RAG Demo</h1>
        <p class="demo-description">
          Query documents with different access levels and see how Mullion
          enforces role-based boundaries.
        </p>
      </div>

      <div class="demo-grid">
        <!-- Left Column: Configuration and Query -->
        <div class="config-column">
          <UCard
            variant="outline"
            class="config-card"
          >
            <template #header>
              <h2 class="card-title">Configuration</h2>
            </template>

            <div class="config-form">
              <div class="form-group">
                <label class="form-label">Your Role</label>
                <div class="role-selector">
                  <div
                    v-for="role in roles"
                    :key="role.value"
                    class="role-button-wrapper"
                  >
                    <button
                      class="role-button"
                      :class="{active: selectedRole === role.value}"
                      @click="selectedRole = role.value"
                    >
                      <UIcon
                        :name="role.icon"
                        class="role-icon"
                      />
                      <span class="role-name">{{ role.label }}</span>
                      <UBadge
                        :color="role.color"
                        size="xs"
                        variant="soft"
                        class="role-badge"
                      >
                        {{ role.access }}
                      </UBadge>
                    </button>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Your Query</label>

                <!-- Query Suggestions -->
                <UAlert
                  color="info"
                  variant="soft"
                  icon="i-lucide-lightbulb"
                  class="query-suggestions"
                >
                  <template #title>
                    <span class="suggestions-title"
                      >Example queries for {{ selectedRole }}:</span
                    >
                  </template>
                  <template #description>
                    <ul class="suggestions-list">
                      <li
                        v-for="suggestion in currentRoleSuggestions"
                        :key="suggestion"
                        class="suggestion-item"
                        @click="query = suggestion"
                      >
                        {{ suggestion }}
                      </li>
                    </ul>
                  </template>
                </UAlert>

                <textarea
                  v-model="query"
                  class="form-textarea"
                  placeholder="Ask a question about the documents..."
                  rows="4"
                />
              </div>

              <div class="form-actions">
                <UButton
                  size="lg"
                  color="primary"
                  icon="i-lucide-search"
                  block
                  :loading="isQuerying"
                  :disabled="!query.trim() || isLimitReached"
                  @click="executeQuery"
                >
                  Search Documents
                </UButton>
              </div>
            </div>
          </UCard>

          <!-- Accessible Documents -->
          <UCard
            variant="outline"
            class="documents-card"
          >
            <template #header>
              <h2 class="card-title">
                Accessible Documents ({{ accessibleDocs.length }})
              </h2>
            </template>

            <div
              v-if="accessibleDocs.length === 0"
              class="empty-state"
            >
              <UIcon
                name="i-lucide-file-x"
                class="empty-icon"
              />
              <p class="empty-text">Loading documents...</p>
            </div>

            <div
              v-else
              class="documents-list"
            >
              <div
                v-for="doc in accessibleDocs"
                :key="doc.id"
                class="document-item"
              >
                <UIcon
                  name="i-lucide-file-text"
                  class="document-icon"
                />
                <div class="document-info">
                  <div class="document-title">{{ doc.title }}</div>
                  <UBadge
                    :color="getRoleColor(doc.accessLevel)"
                    size="xs"
                    variant="soft"
                  >
                    {{ doc.accessLevel }}
                  </UBadge>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Right Column: Results -->
        <div class="results-column">
          <div
            v-if="result"
            class="results-section"
          >
            <ResultCard
              title="Answer"
              :confidence="result.confidence"
              :scope="selectedRole"
            >
              <div class="answer-content">
                <div
                  class="answer-text"
                  v-html="formattedAnswer"
                ></div>

                <div
                  v-if="result.sources && result.sources.length > 0"
                  class="sources-section"
                >
                  <h3 class="sources-title">
                    <UIcon
                      name="i-lucide-book-open"
                      class="sources-icon"
                    />
                    Sources ({{ result.sources.length }})
                  </h3>
                  <div class="sources-list">
                    <div
                      v-for="(source, index) in result.sources"
                      :key="index"
                      class="source-item"
                    >
                      <div class="source-header">
                        <span class="source-number">{{ index + 1 }}</span>
                        <span class="source-title-text">{{
                          source.title
                        }}</span>
                      </div>
                      <p class="source-excerpt">{{ source.excerpt }}</p>
                    </div>
                  </div>
                </div>

                <UAlert
                  color="info"
                  variant="soft"
                  icon="i-lucide-info"
                  title="Access Control Active"
                  :description="`Only ${selectedRole} documents were used to generate this answer.`"
                  class="protection-alert"
                />
              </div>
            </ResultCard>

            <CostDisplay
              v-if="result.cost"
              :input-tokens="result.cost.inputTokens"
              :output-tokens="result.cost.outputTokens"
              :cost="result.cost.totalCost"
              :cache-hit="result.cost.cacheHit"
              class="cost-display"
            />
          </div>

          <div
            v-else-if="!result && !error"
            class="placeholder-state"
          >
            <UIcon
              name="i-lucide-search"
              class="placeholder-icon"
            />
            <p class="placeholder-text">
              Enter a query to search the documents
            </p>
          </div>

          <div
            v-if="error"
            class="error-section"
          >
            <UAlert
              color="error"
              variant="soft"
              icon="i-lucide-alert-circle"
              title="Query Failed"
              :description="error"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {marked} from 'marked';

defineOptions({
  name: 'RAGDemo',
});

const {isAuthenticated} = useAuth();
const {isLimitReached, fetchRateLimit, decrementRemaining} = useRateLimit();

const roles = [
  {
    value: 'public',
    label: 'Public',
    icon: 'i-lucide-globe',
    color: 'neutral' as const,
    access: 'Public only',
  },
  {
    value: 'internal',
    label: 'Internal',
    icon: 'i-lucide-building',
    color: 'info' as const,
    access: 'Public + Internal',
  },
  {
    value: 'confidential',
    label: 'Confidential',
    icon: 'i-lucide-lock',
    color: 'warning' as const,
    access: 'All documents',
  },
];

const selectedRole = ref('public');
const query = ref('');
const isQuerying = ref(false);
const accessibleDocs = ref<
  Array<{
    id: string;
    title: string;
    accessLevel: string;
  }>
>([]);
const result = ref<{
  answer: string;
  confidence: number;
  sources?: Array<{
    title: string;
    excerpt: string;
  }>;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    cacheHit?: boolean;
  };
} | null>(null);
const error = ref<string | null>(null);

const formattedAnswer = computed(() => {
  if (!result.value?.answer) return '';
  return marked.parse(result.value.answer, {async: false}) as string;
});

const querySuggestions: Record<string, string[]> = {
  public: [
    'What features does the product offer?',
    'How do I get started with the platform?',
    'What are the pricing plans?',
  ],
  internal: [
    'What is our product roadmap for Q4?',
    'What are our employee benefits?',
    'How does the customer success onboarding process work?',
  ],
  confidential: [
    'What were our Q3 financial results?',
    'Tell me about the security incident in January',
    'What is the status of our patent application?',
  ],
};

const currentRoleSuggestions = computed(() => {
  return querySuggestions[selectedRole.value] || [];
});

const getRoleColor = (accessLevel: string) => {
  const role = roles.find((r) => r.value === accessLevel.toLowerCase());
  return role?.color || 'neutral';
};

const fetchDocuments = async () => {
  try {
    const docs = await $fetch('/api/documents', {
      params: {role: selectedRole.value},
    });
    accessibleDocs.value = docs as typeof accessibleDocs.value;
  } catch (err) {
    console.error('Failed to fetch documents:', err);
  }
};

const executeQuery = async () => {
  if (!query.value.trim()) return;

  isQuerying.value = true;
  error.value = null;
  result.value = null;

  try {
    const response = await $fetch('/api/query', {
      method: 'POST',
      body: {
        query: query.value,
        role: selectedRole.value,
      },
    });

    result.value = response as typeof result.value;
    decrementRemaining();
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to execute query';
    console.error('Query error:', err);
  } finally {
    isQuerying.value = false;
  }
};

watch(selectedRole, () => {
  fetchDocuments();
  // Clear results when role changes
  result.value = null;
  error.value = null;
});

onMounted(() => {
  fetchRateLimit();
  fetchDocuments();
});
</script>

<style lang="scss">
.rag-demo {
  max-width: 1400px;
  margin: 0 auto;
}

.demo-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.demo-header {
  text-align: center;
  margin-bottom: 1rem;
}

.demo-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--ui-text);
  margin-bottom: 0.5rem;
}

.demo-description {
  font-size: 1rem;
  color: var(--ui-text-muted);
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;
}

.demo-grid {
  display: grid;
  grid-template-columns: 450px 1fr;
  gap: 2rem;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

.config-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.results-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ui-text);
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ui-text);
}

.role-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.role-button-wrapper {
  min-height: 52px;
}

.role-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--ui-border);
  border-radius: 0.5rem;
  background-color: var(--ui-bg);
  color: var(--ui-text);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: var(--ui-bg-elevated);
    border: 1px solid color-mix(in oklch, var(--ui-error) 20%, transparent);
    border-color: color-mix(in oklch, var(--ui-primary) 50%, transparent);
  }

  &.active {
    border-color: var(--ui-primary);
    background-color: color-mix(in oklch, var(--ui-primary) 5%, transparent);
  }
}

.role-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--ui-text-muted);
}

.role-name {
  flex: 1;
  font-weight: 500;
  text-align: left;
}

.role-badge {
  flex-shrink: 0;
}

.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #{var(--ui-border)};
  border-radius: 0.5rem;
  background-color: var(--ui-bg);
  color: var(--ui-text);
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--ui-primary);
  }

  &::placeholder {
    color: var(--ui-text-muted);
  }
}

.form-actions {
  display: flex;
  justify-content: stretch;
}

.query-suggestions {
  margin-bottom: 1rem;
}

.suggestions-title {
  font-weight: 600;
  font-size: 0.875rem;
}

.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestion-item {
  padding: 0.5rem 0.75rem;
  background-color: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  color: var(--ui-text);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: color-mix(in oklch, var(--ui-primary) 10%, transparent);
    border-color: var(--ui-primary);
  }
}

.documents-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: var(--ui-bg-elevated);
  border: 1px solid #{var(--ui-border)};
  border-radius: 0.5rem;
}

.document-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--ui-text-muted);
  flex-shrink: 0;
}

.document-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.document-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text);
}

.empty-state,
.placeholder-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-icon,
.placeholder-icon {
  width: 3rem;
  height: 3rem;
  color: var(--ui-text-muted);
  margin-bottom: 1rem;
}

.empty-text,
.placeholder-text {
  font-size: 0.9375rem;
  color: var(--ui-text-muted);
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.answer-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.answer-text {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--ui-text);
  white-space: pre-wrap;
  word-wrap: break-word;

  // Markdown HTML styling
  p {
    margin: 0 0 0.5em 0;

    &:last-child {
      margin-bottom: 0;
    }
  }

  strong {
    font-weight: 600;
    color: var(--ui-text);
  }

  ol {
    margin: 0.5em 0 0.75em 0;
    padding-left: 1.5em;
    list-style-type: decimal;
    list-style-position: outside;
  }

  ul {
    margin: 0.5em 0 0.75em 0;
    padding-left: 1.5em;
    list-style-type: disc;
    list-style-position: outside;
  }

  li {
    margin: 0.25em 0;
    padding-left: 0.25em;
  }

  code {
    background-color: var(--ui-bg-elevated);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.875em;
  }
}

.sources-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sources-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ui-text);
}

.sources-icon {
  width: 1.125rem;
  height: 1.125rem;
  color: var(--ui-primary);
}

.sources-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.source-item {
  padding: 0.75rem;
  background-color: var(--ui-bg-elevated);
  border: 1px solid #{var(--ui-border)};
  border-radius: 0.5rem;
}

.source-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.source-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background-color: var(--ui-primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.source-title-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ui-text);
}

.source-excerpt {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
  font-style: italic;
}

.protection-alert {
  margin-top: 0.5rem;
}

.cost-display {
  margin-top: 0.5rem;
}

.error-section {
  width: 100%;
}
</style>
