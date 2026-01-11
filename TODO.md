# Mullion TODO

### Legend

- [ ] Not started
- [x] Done

---

## Task 0-11: COMPLETED ✅

> Tasks 0-11 are complete. See previous TODO versions for details.
> Summary: Core types, scope/bridge, ESLint rules, AI SDK integration,
> cache foundation, fork/merge, cost estimation, OpenTelemetry tracing.

If you need details, look here [TODO.history.md](./TODO.history.md)

---

## Task 12: Example Code Snippets ✅ COMPLETED

**Goal:** Documentation-ready code examples for future docs site

**Status:** All subtasks (12.1, 12.2, 12.3) complete. Examples are production-ready and fully documented.

### Philosophy

> 📚 **For documentation** — clean, commented code snippets
> 🔄 **Syncable** — future docs site can pull from these files
> 🎯 **Two scenarios** — Helpdesk (scope isolation) + RAG (fork/merge/cache)

### Structure

\`\`\`
examples/
├── basic/ # ✅ Already exists
├── helpdesk-leak-prevention/ # 🆕 Scenario #1
└── rag-sensitive-data/ # 🆕 Scenario #2
\`\`\`

### 12.1 Helpdesk Leak Prevention Example

**Scenario:** Customer support system where admin sees internal notes, but they must not leak to customer response.

**Demonstrates:**

- \`scope('admin')\` vs \`scope('public')\` isolation
- ESLint \`no-context-leak\` catching violations at compile time
- \`bridge()\` with explicit data sanitization
- Confidence check before sending response

**Files to create:**

- [x] Create \`examples/helpdesk-leak-prevention/\` directory
- [x] Create \`package.json\` with workspace deps
- [x] Create \`tsconfig.json\`
- [x] Create \`eslint.config.js\` with \`@mullion/eslint-plugin\`
- [x] Create \`.env.example\`
- [x] Create \`src/schemas.ts\` — TicketAnalysisSchema, CustomerResponseSchema
- [x] Create \`src/safe-flow.ts\` — correct implementation with bridge
- [x] Create \`src/unsafe-flow.ts\` — intentionally leaky (ESLint catches)
- [x] Create \`src/index.ts\` — main entry point
- [x] Create \`README.md\`

**Status:** ✅ COMPLETED

### 12.2 RAG Sensitive Data Example

**Scenario:** RAG pipeline where documents have different access levels (public, internal, confidential).

**Demonstrates:**

- Multiple scopes for document classification
- \`fork()\` for parallel document analysis
- \`merge()\` with consensus for combining results
- Cache segments for large documents
- Cost tracking across operations

**Files to create:**

- [x] Create \`examples/rag-sensitive-data/\` directory
- [x] Create \`package.json\`, \`tsconfig.json\`, \`.env.example\`, \`eslint.config.js\`
- [x] Create \`src/schemas.ts\` — Classification, Query, Response schemas
- [x] Create \`src/data/sample-docs.ts\` — sample documents (10 docs across 3 access levels)
- [x] Create \`src/classifier.ts\` — document classification with fork/merge
- [x] Create \`src/retriever.ts\` — retrieval with scope filtering
- [x] Create \`src/generator.ts\` — response generation with caching
- [x] Create \`src/pipeline.ts\` — full RAG orchestration
- [x] Create \`src/index.ts\` — main entry point
- [x] Create \`README.md\` with architecture diagram

**Status:** ✅ COMPLETED

### 12.3 Documentation Integration

- [x] Add \`// @mullion-docs: section-name\` markers for extraction (not needed - direct file links used)
- [x] Update root README with example links
- [x] Update EXAMPLES.md with all three examples
- [x] Verify all examples run: \`pnpm --filter "mullion-example-\*" start\`

**Status:** ✅ COMPLETED

### Success Criteria

- [x] Both example directories created with all files
- [x] Examples run without errors (with and without API key)
- [x] ESLint catches leak in unsafe-flow.ts (5 errors detected)
- [x] README files clearly explain each scenario

**All Success Criteria Met:** ✅

---

## Task 13: Demo Applications (Deployable)

**Goal:** Production-ready Nuxt apps for live demonstration and portfolio

### Philosophy

> 🚀 **Deployable** — ready for Vercel with CI/CD
> 🔐 **Secure** — Google Auth + rate limiting, no API key exposure
> 🎨 **Nuxt Layers** — shared base UI, scenario-specific extensions
> 📱 **Portfolio-ready** — demonstrates real-world Mullion usage

### Architecture

\`\`\`
apps/
├── demo-base/ # Nuxt Layer (shared UI/auth)
├── demo-helpdesk/ # Extends demo-base
└── demo-rag/ # Extends demo-base
\`\`\`

### 13.1 Workspace Setup

- [ ] Add \`apps/\*\` to \`pnpm-workspace.yaml\`
- [ ] Update \`turbo.json\` with demo app tasks
- [ ] Create \`.github/workflows/demo-deploy.yml\`

### 13.2 Demo Base Layer (\`apps/demo-base/\`)

**Layouts:**

- [ ] \`layouts/default.vue\` — header, auth, footer, responsive

**Components:**

- [ ] \`MullionHeader.vue\` — logo, demo title, auth button
- [ ] \`AuthButton.vue\` — Google OAuth
- [ ] \`CodeBlock.vue\` — syntax highlighted code
- [ ] \`ResultCard.vue\` — inference results with confidence
- [ ] \`CostDisplay.vue\` — token usage, cost, cache savings
- [ ] \`RateLimitNotice.vue\` — remaining requests

**Composables:**

- [ ] \`useAuth.ts\` — Google OAuth state
- [ ] \`useMullion.ts\` — client setup, inference helpers
- [ ] \`useRateLimit.ts\` — per-user tracking

**Server Utils:**

- [ ] \`server/utils/auth.ts\` — OAuth verification, JWT
- [ ] \`server/utils/rate-limit.ts\` — 20 req/day per user
- [ ] \`server/utils/mullion.ts\` — server-side client

### 13.3 Demo Helpdesk App (\`apps/demo-helpdesk/\`)

- [ ] Create directory with \`nuxt.config.ts\` extending demo-base
- [ ] \`pages/index.vue\` — intro, "Try it" button, code snippets
- [ ] \`pages/demo.vue\` — protected, ticket form, results comparison
- [ ] \`server/api/analyze.post.ts\` — Mullion scope implementation

### 13.4 Demo RAG App (\`apps/demo-rag/\`)

- [ ] Create directory with \`nuxt.config.ts\` extending demo-base
- [ ] \`pages/index.vue\` — intro, role selector, architecture
- [ ] \`pages/demo.vue\` — protected, query, doc browser, results
- [ ] \`server/api/query.post.ts\` — RAG with fork/merge
- [ ] \`server/api/documents.get.ts\` — sample docs
- [ ] \`server/data/documents.ts\` — sample content

### 13.5 CI/CD Pipeline

- [ ] Create \`.github/workflows/demo-deploy.yml\`
- [ ] Set up Vercel projects: \`mullion-demo-helpdesk\`, \`mullion-demo-rag\`
- [ ] Add GitHub secrets: VERCEL_TOKEN, VERCEL_ORG_ID, project IDs
- [ ] Configure Vercel env vars: API keys, OAuth credentials

### 13.6 Security Checklist

- [ ] API keys only server-side
- [ ] Google OAuth configured
- [ ] Rate limiting enforced (20 req/day)
- [ ] CORS correct
- [ ] No sensitive data in logs
- [ ] API key spending limit ($20/month)

### 13.7 Documentation

- [ ] \`apps/demo-helpdesk/README.md\`
- [ ] \`apps/demo-rag/README.md\`
- [ ] Update root README with live demo links

### Success Criteria

- [ ] Both apps deployed to Vercel
- [ ] Google Auth working
- [ ] Rate limiting enforced
- [ ] Mobile-responsive UI
- [ ] Root README updated with demo links

---

## Task 14: Integration Tests (Real Providers)

**Goal:** Test @mullion packages against real LLM providers

### Philosophy

> 🎯 **Test as a real consumer** — workspace app with @mullion deps
> 🔑 **Secrets isolation** — API keys only here
> 🚀 **CI-ready** — automated on every push

### Why in monorepo (not separate repo)

- Packages not yet published to npm — workspace resolution required
- Faster iteration during development
- Single CI pipeline, one versioning system
- **After first npm release** — consider adding canary repo for "real install" tests

### 14.1 Workspace Setup

- [ ] Create `apps/integration-tests/` directory
- [ ] Create `apps/integration-tests/package.json`:
  ```json
  {
    "name": "integration-tests",
    "private": true,
    "type": "module",
    "scripts": {
      "test": "vitest run",
      "test:watch": "vitest",
      "test:openai": "vitest run --grep openai",
      "test:anthropic": "vitest run --grep anthropic"
    },
    "dependencies": {
      "@mullion/core": "workspace:*",
      "@mullion/ai-sdk": "workspace:*",
      "@ai-sdk/openai": "catalog:",
      "@ai-sdk/anthropic": "catalog:",
      "ai": "catalog:",
      "zod": "catalog:"
    },
    "devDependencies": {
      "vitest": "catalog:",
      "typescript": "catalog:",
      "@types/node": "catalog:"
    }
  }
  ```
- [ ] Create `apps/integration-tests/tsconfig.json`
- [ ] Create `apps/integration-tests/vitest.config.ts`
- [ ] Add to `pnpm-workspace.yaml`: `- 'apps/*'`
- [ ] Update root `turbo.json` to include integration-tests
- [ ] Verify `pnpm install` resolves workspace packages
- [ ] Verify `pnpm build` includes integration-tests

### 14.2 Environment Setup

- [ ] Create `apps/integration-tests/.env.example`:
  ```bash
  OPENAI_API_KEY=sk-proj-...
  ANTHROPIC_API_KEY=sk-ant-...
  # Optional
  GOOGLE_GENERATIVE_AI_API_KEY=AI...
  ```
- [ ] Create `apps/integration-tests/.gitignore` (exclude .env)
- [ ] Document env setup in README
- [ ] Add timeout configuration for slow API calls

### 14.3 Test: Basic Inference (OpenAI)

- [ ] Create `apps/integration-tests/src/openai.test.ts`
- [ ] Test: `createMullionClient()` with OpenAI provider
- [ ] Test: `ctx.infer()` returns valid `Owned<T, S>`
- [ ] Test: Confidence score in valid range (0.3-1.0)
- [ ] Test: Scope tagged correctly
- [ ] Test: Trace ID generated
- [ ] Test: Complex schemas (nested objects, arrays, enums)
- [ ] Test: Large text inputs handled correctly

### 14.4 Test: Basic Inference (Anthropic)

- [ ] Create `apps/integration-tests/src/anthropic.test.ts`
- [ ] Test: `createMullionClient()` with Anthropic provider
- [ ] Test: `ctx.infer()` returns valid `Owned<T, S>`
- [ ] Test: Confidence extraction works
- [ ] Test: Different models (claude-3-5-sonnet, claude-3-haiku)

### 14.5 Test: Scope Bridging

- [ ] Create `apps/integration-tests/src/bridging.test.ts`
- [ ] Test: Data flows between scopes with `bridge()`
- [ ] Test: Bridged data has combined scope type
- [ ] Test: `use()` enforces scope boundaries at runtime
- [ ] Test: Nested scopes work correctly

### 14.6 Test: Caching (Anthropic)

- [ ] Create `apps/integration-tests/src/caching.test.ts`
- [ ] Test: Cache segments created correctly
- [ ] Test: `cacheCreationInputTokens` reported on first call
- [ ] Test: `cacheReadInputTokens` reported on second call (cache hit)
- [ ] Test: Cache metrics in `ctx.getCacheStats()`
- [ ] Test: System prompt caching
- [ ] Test: TTL options ('5m', '1h')

### 14.7 Test: Fork & Merge

- [ ] Create `apps/integration-tests/src/fork-merge.test.ts`
- [ ] Test: `fast-parallel` strategy executes all branches
- [ ] Test: `cache-optimized` with warmup (verify cache hits)
- [ ] Test: Schema conflict detection (different schemas warning)
- [ ] Test: Merge strategies produce correct results
- [ ] Test: Provenance tracking in merge results

### 14.8 Test: Cost Estimation

- [ ] Create `apps/integration-tests/src/cost.test.ts`
- [ ] Test: `estimateNextCallCost()` before inference
- [ ] Test: `getLastCallCost()` after inference
- [ ] Test: Cache savings calculation accuracy
- [ ] Test: Estimate vs actual comparison (reasonable delta)

### 14.9 Test: Edge Cases & Errors

- [ ] Create `apps/integration-tests/src/edge-cases.test.ts`
- [ ] Test: Ambiguous input → low confidence
- [ ] Test: Scope mismatch protection (use without bridge throws)
- [ ] Test: Invalid schema handling
- [ ] Test: API errors handled gracefully
- [ ] Test: Rate limit handling (if possible to trigger)

### 14.10 CI Integration

- [ ] Create `.github/workflows/integration-tests.yml`:

  ```yaml
  name: Integration Tests
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
    workflow_dispatch: # manual trigger

  jobs:
    integration:
      runs-on: ubuntu-latest
      # Only run if secrets are available (skip for forks)
      if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'pnpm'
        - run: pnpm install
        - run: pnpm build
        - run: pnpm --filter integration-tests test
          env:
            OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
            ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  ```

- [ ] Add secrets to GitHub repository settings
- [ ] Test workflow locally with `act` (optional)
- [ ] Document CI setup in contributing guide

### 14.11 Documentation

- [ ] Create `apps/integration-tests/README.md`:
  - Setup instructions for contributors
  - How to run tests locally
  - How to add new test scenarios
  - CI behavior explanation
- [ ] Move `docs/contributing/integration-tests.md` content to app README
- [ ] Update root CONTRIBUTING.md with reference to integration tests
- [ ] Document test coverage expectations

### Success Criteria

Mark Task 14 complete when:

- [ ] All test files created and passing with real providers
- [ ] CI workflow runs on every push to main
- [ ] At least OpenAI and Anthropic providers tested
- [ ] Caching, fork/merge, cost estimation verified with real APIs
- [ ] Documentation complete for contributors

---

## Future Backlog

### ESLint Rules

- [ ] \`no-unsafe-bridge\`, \`no-cross-scope-write\`
- [ ] \`prefer-cache-segments\`, \`require-fork-strategy\`

### Provider Adapters

- [ ] Google Gemini caching
- [ ] Azure OpenAI, Bedrock

### Advanced Features

- [ ] \`fork()\` retryFailed, \`merge.ensemble()\`
- [ ] Streaming, real-time cost alerts

### Documentation

- [ ] Docs site (VitePress)
- [ ] Guides: caching, fork/merge, migration

### Post-Release

- [ ] Canary repo for npm install testing
