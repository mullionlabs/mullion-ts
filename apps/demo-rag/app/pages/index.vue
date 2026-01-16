<template>
  <div class="rag-index">
    <div class="hero-section">
      <h1 class="hero-title">Mullion RAG Demo</h1>
      <p class="hero-subtitle">
        Role-based access control with fork/merge patterns for sensitive data
      </p>
    </div>

    <div class="content-section">
      <UCard variant="outline" class="scenario-card">
        <template #header>
          <h2 class="section-title">
            <UIcon name="i-lucide-database" class="title-icon" />
            The Scenario
          </h2>
        </template>

        <div class="scenario-content">
          <p class="scenario-text">
            A Retrieval-Augmented Generation (RAG) system provides answers based on a document
            corpus with varying access levels. Documents are classified as Public, Internal, or
            Confidential. The challenge: ensure users only receive answers based on documents they
            have clearance to access.
          </p>

          <div class="scenario-problem">
            <h3 class="problem-title">
              <UIcon name="i-lucide-alert-triangle" class="problem-icon" />
              The Problem
            </h3>
            <p class="problem-text">
              Traditional RAG systems risk exposing sensitive information through:
            </p>
            <ul class="problem-list">
              <li>Accidental retrieval of confidential documents</li>
              <li>Cross-contamination between security contexts</li>
              <li>Lack of provenance tracking for sources</li>
            </ul>
          </div>

          <div class="scenario-solution">
            <h3 class="solution-title">
              <UIcon name="i-lucide-check-circle-2" class="solution-icon" />
              Mullion's Solution
            </h3>
            <p class="solution-text">
              Mullion enforces access control at the type level using:
            </p>
            <ul class="solution-list">
              <li>
                <strong>Scope-based filtering:</strong> Documents tagged with access level scopes
              </li>
              <li>
                <strong>Fork/merge patterns:</strong> Parallel processing with cache optimization
              </li>
              <li>
                <strong>Provenance tracking:</strong> Know exactly which documents influenced the
                answer
              </li>
            </ul>
          </div>
        </div>
      </UCard>

      <UCard variant="outline" class="architecture-card">
        <template #header>
          <h2 class="section-title">
            <UIcon name="i-lucide-workflow" class="title-icon" />
            How It Works
          </h2>
        </template>

        <div class="architecture-content">
          <div class="architecture-diagram">
            <div class="diagram-step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h3 class="step-title">Query Classification</h3>
                <p class="step-description">Analyze user query to understand intent and scope</p>
              </div>
            </div>

            <div class="diagram-arrow">↓</div>

            <div class="diagram-step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h3 class="step-title">Access-Controlled Retrieval</h3>
                <p class="step-description">
                  Filter documents based on user's role (Public/Internal/Confidential)
                </p>
              </div>
            </div>

            <div class="diagram-arrow">↓</div>

            <div class="diagram-step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h3 class="step-title">Parallel Processing (Fork)</h3>
                <p class="step-description">
                  Process retrieved documents in parallel with cache optimization
                </p>
              </div>
            </div>

            <div class="diagram-arrow">↓</div>

            <div class="diagram-step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h3 class="step-title">Response Generation (Merge)</h3>
                <p class="step-description">
                  Combine insights while maintaining scope boundaries and provenance
                </p>
              </div>
            </div>
          </div>

          <div class="code-example">
            <h3 class="code-example-title">✅ RAG with Mullion</h3>
            <CodeBlock :code="ragExample" language="typescript" title="rag-pipeline.ts" />
          </div>
        </div>
      </UCard>

      <UCard variant="outline" class="features-card">
        <template #header>
          <h2 class="section-title">
            <UIcon name="i-lucide-sparkles" class="title-icon" />
            Key Features
          </h2>
        </template>

        <div class="features-grid">
          <div class="feature-item">
            <UIcon name="i-lucide-shield" class="feature-icon" />
            <h3 class="feature-title">Access Control</h3>
            <p class="feature-description">
              Role-based document filtering enforced at compile-time
            </p>
          </div>

          <div class="feature-item">
            <UIcon name="i-lucide-git-fork" class="feature-icon" />
            <h3 class="feature-title">Fork/Merge</h3>
            <p class="feature-description">
              Parallel processing with automatic cache optimization
            </p>
          </div>

          <div class="feature-item">
            <UIcon name="i-lucide-zap" class="feature-icon" />
            <h3 class="feature-title">Smart Caching</h3>
            <p class="feature-description">
              Provider-aware caching reduces costs and latency
            </p>
          </div>

          <div class="feature-item">
            <UIcon name="i-lucide-file-search" class="feature-icon" />
            <h3 class="feature-title">Provenance</h3>
            <p class="feature-description">Track which documents influenced each answer</p>
          </div>
        </div>
      </UCard>

      <div class="cta-section">
        <UCard variant="subtle">
          <div class="cta-content">
            <h2 class="cta-title">Try It Yourself</h2>
            <p class="cta-description">
              Query a document corpus with different access levels and see how Mullion enforces
              role-based boundaries.
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
            <UButton v-else size="lg" color="primary" icon="i-lucide-play" to="/demo">
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
  name: 'RAGIndex',
});

const { isAuthenticated, signIn } = useAuth();

const ragExample = `// ✅ SAFE: Mullion enforces access control
const userRole = 'internal'; // Public, Internal, or Confidential
const ragCtx = scope(\`rag-\${userRole}\`);

// Query classification
const query = await ragCtx.infer(QuerySchema, userInput);

// Retrieve only accessible documents
const docs = await retrieveDocuments(userRole, query.value);

// Fork/merge for parallel processing
const result = await fork({
  branches: docs.map(doc => ({
    fn: () => ragCtx.infer(AnswerSchema, \`...\${doc}...\`)
  })),
  strategy: 'cache-optimized',
  merge: weightedVote()
});

// Response includes provenance
console.log(result.value); // Answer
console.log(result.provenance); // Source documents`;

onMounted(() => {
  const { fetchUser } = useAuth();
  fetchUser();
});
</script>

<style lang="scss">
.rag-index {
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
.architecture-card,
.features-card {
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
  margin-bottom: 0.75rem;
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
  margin-bottom: 0.5rem;
}

.problem-list,
.solution-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
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
      font-weight: bold;
    }

    strong {
      font-weight: 600;
    }
  }
}

.problem-list li::before {
  color: var(--ui-error);
}

.solution-list li::before {
  color: var(--ui-success);
}

.architecture-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.architecture-diagram {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.diagram-step {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
  width: 100%;
  max-width: 600px;
}

.step-number {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background-color: var(--ui-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 1rem;
  font-weight: 600;
  color: rar(--ui-text);
  margin-bottom: 0.25rem;
}

.step-description {
  font-size: 0.875rem;
  color: var(--ui-text-muted);
  line-height: 1.5;
}

.diagram-arrow {
  font-size: 1.5rem;
  color: var(--ui-primary);
  font-weight: bold;
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

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem;
  background-color: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px #{color-mix(in oklch, var(--ui-success) 5%, transparent)};
  }
}

.feature-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: var(--ui-primary);
  margin-bottom: 1rem;
}

.feature-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ui-text);
  margin-bottom: 0.5rem;
}

.feature-description {
  font-size: 0.875rem;
  color: var(--ui-text-muted);
  line-height: 1.5;
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
