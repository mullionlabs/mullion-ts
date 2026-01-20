<script setup lang="ts">
/**
 * Helpdesk Demo Page
 *
 * Interactive demo for the helpdesk ticket processing
 * with scope isolation and leak prevention.
 */

import type {AnalyzeResponse} from '~~/schemas';

defineOptions({
  name: 'HelpdeskPage',
});

const projectName = '{{PROJECT_NAME}}';

// Check if running in mock mode by fetching server status
const {data: serverStatus} = useFetch('/api/status');
const isMockMode = computed(() => serverStatus.value?.mockMode ?? true);

const ticketText = ref('');
const loading = ref(false);
const result = ref<AnalyzeResponse['data'] | null>(null);
const error = ref<string | null>(null);

const exampleTickets = [
  {
    label: 'Billing Issue',
    text: `Subject: Unauthorized Charges

I noticed a charge of $49.99 on my account that I never authorized. This is the second time this has happened and I need this resolved immediately.

My account email is user@example.com`,
  },
  {
    label: 'Technical Problem',
    text: `Subject: App crashes on login

The mobile app keeps crashing whenever I try to log in. I've tried uninstalling and reinstalling but the problem persists. This has been going on for 3 days.

Device: iPhone 14 Pro
iOS version: 17.2`,
  },
  {
    label: 'Account Help',
    text: `Subject: Need to update email

Hi, I need to change the email address associated with my account. The old email is no longer accessible.

Current email: old@example.com
New email: new@example.com

Thanks!`,
  },
];

const priorityClasses: Record<string, string> = {
  low: 'badge badge-success',
  medium: 'badge badge-warning',
  high: 'badge badge-error',
  urgent: 'badge badge-error',
};

const showResult = computed(
  () => loading.value || Boolean(error.value) || Boolean(result.value),
);

const submitTicket = async () => {
  if (!ticketText.value.trim()) return;

  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const response = await $fetch<AnalyzeResponse>('/api/analyze', {
      method: 'POST',
      body: {
        ticket: ticketText.value,
      },
    });

    if (response.success) {
      result.value = response.data;
    }
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Processing failed';
  } finally {
    loading.value = false;
  }
};

const useExample = (example: (typeof exampleTickets)[0]) => {
  ticketText.value = example.text;
};

const getPriorityClass = (priority: string) =>
  priorityClasses[priority] ?? 'badge badge-info';

const getEscalationClass = (escalated: boolean) =>
  escalated ? 'badge badge-warning' : 'badge badge-success';
</script>

<template>
  <main class="helpdesk-page container stack-lg">
    <header class="stack-sm text-center">
      <h1 class="m-0">{{ projectName }}</h1>
      <p class="text-muted m-0">Helpdesk with Scope Isolation</p>
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
        <h2 class="mb-0">Submit Support Ticket</h2>

        <QueryInput
          v-model="ticketText"
          label="Ticket Content"
          placeholder="Describe your issue..."
          :rows="6"
          :loading="loading"
          submitLabel="Submit Ticket"
          @submit="submitTicket"
        />

        <div class="stack-sm">
          <label class="m-0">Try an example:</label>
          <div class="cluster">
            <button
              v-for="example in exampleTickets"
              :key="example.label"
              type="button"
              class="btn btn-secondary btn-sm"
              @click="useExample(example)"
            >
              {{ example.label }}
            </button>
          </div>
        </div>
      </div>

      <ResultCard
        v-if="showResult"
        title="Ticket Processed"
        :loading="loading"
        :error="error"
      >
        <div
          v-if="result"
          class="stack-md"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Ticket ID</span>
            <span class="badge badge-info">{{ result.ticketId }}</span>
          </div>

          <div class="grid grid-auto gap-md p-md bg-muted rounded-md">
            <div class="text-center stack-xs">
              <span class="text-xs uppercase tracking-wide text-muted">
                Category
              </span>
              <span class="badge badge-info">{{ result.category }}</span>
            </div>
            <div class="text-center stack-xs">
              <span class="text-xs uppercase tracking-wide text-muted">
                Priority
              </span>
              <span :class="getPriorityClass(result.priority)">
                {{ result.priority }}
              </span>
            </div>
            <div class="text-center stack-xs">
              <span class="text-xs uppercase tracking-wide text-muted">
                Confidence
              </span>
              <span class="font-semibold">
                {{ (result.customerResponse.confidence * 100).toFixed(0) }}%
              </span>
            </div>
            <div class="text-center stack-xs">
              <span class="text-xs uppercase tracking-wide text-muted">
                Escalated
              </span>
              <span
                :class="getEscalationClass(result.customerResponse.escalated)"
              >
                {{ result.customerResponse.escalated ? 'Yes' : 'No' }}
              </span>
            </div>
          </div>

          <div class="stack-sm">
            <h4 class="text-xs uppercase tracking-wide text-muted m-0">
              Summary
            </h4>
            <p class="m-0">{{ result.summary }}</p>
          </div>

          <div class="stack-sm">
            <h4 class="text-xs uppercase tracking-wide text-muted m-0">
              Customer Response
            </h4>
            <div class="p-md bg-soft rounded-md whitespace-pre-wrap">
              {{ result.customerResponse.message }}
            </div>

            <div class="stack-sm">
              <h5 class="text-xs uppercase tracking-wide text-muted m-0">
                Action Items
              </h5>
              <ul class="list-none list-divider">
                <li
                  v-for="item in result.customerResponse.actionItems"
                  :key="item"
                >
                  {{ item }}
                </li>
              </ul>
            </div>

            <p class="text-sm m-0">
              <strong>Estimated Resolution:</strong>
              {{ result.customerResponse.estimatedResolution }}
            </p>
          </div>

          <div class="p-md bg-warning border border-warning rounded-md text-sm">
            <strong>Scope Isolation:</strong>
            Internal admin notes (risk level, compensation suggestions) are
            automatically excluded from the customer response.
          </div>
        </div>
      </ResultCard>
    </section>
  </main>
</template>
