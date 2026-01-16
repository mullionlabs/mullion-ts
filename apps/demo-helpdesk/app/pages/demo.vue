<template>
  <div class="helpdesk-demo">
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
        <h1 class="demo-title">Interactive Helpdesk Demo</h1>
        <p class="demo-description">
          Enter a support ticket to see how Mullion prevents admin notes from
          leaking into customer responses.
        </p>
      </div>

      <UCard
        variant="outline"
        class="input-card"
      >
        <template #header>
          <h2 class="card-title">Support Ticket</h2>
        </template>

        <div class="ticket-form">
          <div class="form-group">
            <label class="form-label">Ticket Text</label>
            <textarea
              v-model="ticketText"
              class="form-textarea"
              placeholder="Enter customer support ticket here..."
              rows="6"
            />
          </div>

          <div class="form-actions">
            <UButton
              size="lg"
              color="primary"
              icon="i-lucide-sparkles"
              :loading="isAnalyzing"
              :disabled="!ticketText.trim() || isLimitReached"
              @click="analyzeTicket"
            >
              Analyze Ticket
            </UButton>
          </div>
        </div>
      </UCard>

      <div
        v-if="result"
        class="results-section"
      >
        <div class="results-grid">
          <!-- Admin View -->
          <ResultCard
            title="Admin View"
            :confidence="result.adminConfidence"
            scope="admin"
          >
            <div class="result-content">
              <h3 class="result-subtitle">Ticket Summary</h3>
              <p class="result-text">{{ result.ticketSummary }}</p>

              <h3 class="result-subtitle">Internal Notes</h3>
              <div class="internal-notes">
                <UIcon
                  name="i-lucide-lock"
                  class="notes-icon"
                />
                <p class="result-text">{{ result.internalNotes }}</p>
              </div>

              <h3 class="result-subtitle">Recommended Actions</h3>
              <ul class="actions-list">
                <li
                  v-for="(action, index) in result.recommendedActions"
                  :key="index"
                >
                  {{ action }}
                </li>
              </ul>
            </div>
          </ResultCard>

          <!-- Public Response -->
          <ResultCard
            title="Customer Response"
            :confidence="result.publicConfidence"
            scope="public"
          >
            <div class="result-content">
              <h3 class="result-subtitle">Public Response</h3>
              <div class="public-response">
                <UIcon
                  name="i-lucide-shield-check"
                  class="response-icon"
                />
                <div
                  class="result-text"
                  v-html="formattedPublicResponse"
                ></div>
              </div>

              <UAlert
                color="success"
                variant="soft"
                icon="i-lucide-check-circle-2"
                title="Scope Protection Active"
                description="Admin notes are isolated and cannot leak into this response."
                class="protection-alert"
              />
            </div>
          </ResultCard>
        </div>

        <CostDisplay
          v-if="result.cost"
          :input-tokens="result.cost.inputTokens"
          :output-tokens="result.cost.outputTokens"
          :cost="result.cost.totalCost"
          class="cost-display"
        />
      </div>

      <div
        v-if="error"
        class="error-section"
      >
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          title="Analysis Failed"
          :description="error"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {marked} from 'marked';

defineOptions({
  name: 'HelpdeskDemo',
});

const {isAuthenticated, fetchUser} = useAuth();
const {isLimitReached, fetchRateLimit, decrementRemaining} = useRateLimit();

const ticketText = ref('');
const isAnalyzing = ref(false);
const result = ref<{
  ticketSummary: string;
  internalNotes: string;
  recommendedActions: string[];
  publicResponse: string;
  adminConfidence: number;
  publicConfidence: number;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
} | null>(null);
const error = ref<string | null>(null);

const formattedPublicResponse = computed(() => {
  const response = result.value?.publicResponse;
  if (!response) return '';
  return marked.parse(response, {async: false}) as string;
});

const analyzeTicket = async () => {
  if (!ticketText.value.trim()) return;

  isAnalyzing.value = true;
  error.value = null;
  result.value = null;

  try {
    const response = await $fetch('/api/analyze', {
      method: 'POST',
      body: {
        ticketText: ticketText.value,
      },
    });

    result.value = response as typeof result.value;
    decrementRemaining();
  } catch (err: any) {
    error.value =
      err.data?.message || err.message || 'Failed to analyze ticket';
    console.error('Analysis error:', err);
  } finally {
    isAnalyzing.value = false;
  }
};

onMounted(() => {
  fetchUser();
  fetchRateLimit();
});
</script>

<style lang="scss">
.helpdesk-demo {
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

.input-card {
  width: 100%;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ui-text);
}

.ticket-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text);
}

.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--ui-border);
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
  justify-content: flex-end;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.result-subtitle {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ui-text);
  margin-bottom: 0.5rem;
}

.result-text {
  font-size: 0.9375rem;
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

.internal-notes {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: color-mix(in oklch, var(--ui-warning) 5%, transparent);
  border: 1px solid color-mix(in oklch, var(--ui-warning) 20%, transparent);
  border-radius: 0.5rem;
}

.notes-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--ui-warning);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.public-response {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: color-mix(in oklch, var(--ui-success) 5%, transparent);
  border: 1px solid color-mix(in oklch, var(--ui-success) 20%, transparent);
  border-radius: 0.5rem;
}

.response-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--ui-success);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.actions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  li {
    padding-left: 1.5rem;
    position: relative;
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--ui-text);

    &::before {
      content: '•';
      position: absolute;
      left: 0.5rem;
      color: var(--ui-primary);
      font-weight: bold;
    }
  }
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
