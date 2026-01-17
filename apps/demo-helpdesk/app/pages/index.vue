<template>
  <div class="helpdesk-index">
    <div class="hero-section">
      <h1 class="hero-title">Mullion Helpdesk Demo</h1>
      <p class="hero-subtitle">
        Prevent context leaks with type-safe scope isolation
      </p>
    </div>

    <div class="content-section">
      <UCard
        variant="outline"
        class="scenario-card"
      >
        <template #header>
          <h2 class="section-title">
            <UIcon
              name="i-lucide-shield-check"
              class="title-icon"
            />
            The Scenario
          </h2>
        </template>

        <div class="scenario-content">
          <p class="scenario-text">
            A customer support system processes support tickets containing
            sensitive internal notes alongside public responses. The challenge:
            ensure internal admin notes never leak into customer-facing
            responses.
          </p>

          <div class="scenario-problem">
            <h3 class="problem-title">
              <UIcon
                name="i-lucide-alert-triangle"
                class="problem-icon"
              />
              The Problem
            </h3>
            <p class="problem-text">
              Traditional approaches risk context leaks where sensitive admin
              notes accidentally appear in customer responses, potentially
              exposing confidential information.
            </p>
          </div>

          <div class="scenario-solution">
            <h3 class="solution-title">
              <UIcon
                name="i-lucide-check-circle-2"
                class="solution-icon"
              />
              Mullion's Solution
            </h3>
            <p class="solution-text">
              Mullion enforces compile-time scope boundaries. Admin data is
              tagged with an
              <code>admin</code> scope, and customer responses with a
              <code>public</code> scope. Cross-scope data flow requires explicit
              bridging, making leaks impossible.
            </p>
          </div>
        </div>
      </UCard>

      <UCard
        variant="outline"
        class="code-card"
      >
        <template #header>
          <h2 class="section-title">
            <UIcon
              name="i-lucide-code-2"
              class="title-icon"
            />
            How It Works
          </h2>
        </template>

        <div class="code-examples">
          <div class="code-example">
            <h3 class="code-example-title">
              ❌ Without Mullion: Risk of Context Leak
            </h3>
            <CodeBlock
              :code="badExample"
              language="typescript"
              title="unsafe-flow.ts"
            />
            <p class="code-example-description">
              Without scope tracking, admin notes can accidentally leak into
              customer responses.
            </p>
          </div>

          <div class="code-example">
            <h3 class="code-example-title">
              ✅ With Mullion: Type-Safe Isolation
            </h3>
            <CodeBlock
              :code="goodExample"
              language="typescript"
              title="safe-flow.ts"
            />
            <p class="code-example-description">
              Mullion enforces scope boundaries at compile-time. Data flows are
              explicit and trackable.
            </p>
          </div>
        </div>
      </UCard>

      <div class="cta-section">
        <UCard variant="subtle">
          <div class="cta-content">
            <h2 class="cta-title">Try It Yourself</h2>
            <p class="cta-description">
              Enter a support ticket and see how Mullion prevents context leaks
              in real-time.
            </p>
            <UButton
              v-if="!isAuthenticated"
              size="lg"
              color="primary"
              icon="i-lucide-play"
              @click="signIn"
            >
              Sign In to Try Demo
            </UButton>
            <UButton
              v-else
              size="lg"
              color="primary"
              icon="i-lucide-play"
              to="/demo"
            >
              Try the Demo
            </UButton>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'HelpdeskIndex',
});

const {isAuthenticated, signIn} = useAuth();

const badExample = `// ❌ UNSAFE: No scope tracking
const ticket = await analyzeTicket(ticketText);
const response = await generateResponse(ticket.content);
// Admin notes might leak into response!`;

const goodExample = `// ✅ SAFE: Mullion enforces scope boundaries
const adminCtx = scope('admin');
const publicCtx = scope('public');

// Process in admin scope
const ticket = await adminCtx.infer(TicketSchema, ticketText);

// Generate response in public scope
// Must explicitly bridge if using admin data
const response = await publicCtx.infer(
  ResponseSchema,
  \`Create response for: \${ticket.value.summary}\`
);`;
</script>

<style lang="scss">
.helpdesk-index {
  max-width: 1200px;
  margin: 0 auto;
}

.hero-section {
  text-align: center;
  margin-bottom: 3rem;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--ui-text);
  margin-bottom: 0.75rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--ui-text-muted);
  max-width: 600px;
  margin: 0 auto;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.scenario-card,
.code-card {
  width: 100%;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ui-text);
}

.title-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--ui-primary);
}

.scenario-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.scenario-text {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--ui-text);
}

.scenario-problem,
.scenario-solution {
  padding: 1rem;
  border-radius: 0.5rem;
}

.scenario-problem {
  background-color: color-mix(in oklch, var(--ui-error) 5%, transparent);
  border: 1px solid color-mix(in oklch, var(--ui-error) 20%, transparent);
}

.scenario-solution {
  background-color: color-mix(in oklch, var(--ui-success) 5%, transparent);
  border: 1px solid color-mix(in oklch, var(--ui-success) 20%, transparent);
}

.problem-title,
.solution-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.problem-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--ui-error);
}

.solution-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--ui-success);
}

.problem-text,
.solution-text {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--ui-text);

  code {
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    background-color: var(--ui-bg-elevated);
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.875rem;
  }
}

.code-examples {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.code-example {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.code-example-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ui-text);
}

.code-example-description {
  font-size: 0.9375rem;
  color: var(--ui-text-muted);
  line-height: 1.6;
}

.cta-section {
  margin-top: 1rem;
}

.cta-content {
  text-align: center;
  padding: 1rem;
}

.cta-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ui-text);
  margin-bottom: 0.75rem;
}

.cta-description {
  font-size: 1rem;
  color: var(--ui-text-muted);
  margin-bottom: 1.5rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
</style>
