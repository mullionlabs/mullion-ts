# Mullion TODO

## Current Sprint: Week 1-2 (Foundation) ✅ COMPLETED

### Legend

- [ ] Not started
- [~] In progress
- [x] Done

---

## Task 0: Verify Setup ✅

**Goal:** Ensure monorepo tooling works

### 0.1 Initial Setup

- [x] Run `pnpm install`
- [x] Run `pnpm build` (expect empty dist folders)
- [x] Run `pnpm typecheck`
- [x] Verify Turborepo caching works: run `pnpm build` again (should be cached)

### 0.2 First Changeset

- [x] Run `pnpm changeset`
- [x] Create a test changeset for @mullion/core
- [x] Run `pnpm version` to see version bump
- [x] Revert test changeset

---

## Task 1: Core Types ✅

**Goal:** Implement fundamental types in @mullion/core

### 1.1 Brand Types (`packages/core/src/brand.ts`)

- [x] Create `Brand<T, B>` utility type
- [x] Create `ScopeId` branded string type
- [x] Add JSDoc with examples
- [x] Export from index.ts

### 1.2 Owned Type (`packages/core/src/owned.ts`)

- [x] Define `Owned<T, S>` interface
- [x] Add all required fields: value, confidence, \_\_scope, traceId
- [x] Create `createOwned()` factory function
- [x] Create `isOwned()` type guard
- [x] Add comprehensive JSDoc
- [x] Write unit tests

### 1.3 SemanticValue Type (`packages/core/src/semantic-value.ts`)

- [x] Define `SemanticValue<T, S>` extending Owned
- [x] Add `alternatives` array
- [x] Add `reasoning` field
- [x] Create factory and type guards
- [x] Write unit tests

### 1.4 Context Type (`packages/core/src/context.ts`)

- [x] Define `Context<S>` interface
- [x] Define `ContextOptions` type
- [x] Add method signatures: `infer`, `bridge`, `use`
- [x] Add JSDoc with examples

### 1.5 Verify Core Package

- [x] Update `packages/core/src/index.ts` with all exports
- [x] Run `pnpm --filter @mullion/core build`
- [x] Run `pnpm --filter @mullion/core test`
- [x] Run `pnpm --filter @mullion/core typecheck`

---

## Task 2: Scope Implementation ✅

**Goal:** Implement scope() and bridge() functions

### 2.1 Scope Function (`packages/core/src/scope.ts`)

- [x] Implement `scope<S>(name, fn)` function
- [x] Create context instance inside scope
- [x] Handle async execution
- [x] Generate trace IDs
- [x] Write unit tests

### 2.2 Bridge Function (`packages/core/src/bridge.ts`)

- [x] Implement `bridge()` for crossing scopes
- [x] Track provenance (source → target)
- [x] Maintain type safety with union types
- [x] Write unit tests

### 2.3 Integration Test

- [x] Create test with nested scopes
- [x] Test bridge between scopes
- [x] Verify type inference works correctly

---

## Task 3: ESLint Rule - no-context-leak ✅

**Goal:** First ESLint rule that detects scope violations

### 3.1 Rule Setup

- [x] Create `packages/eslint-plugin/src/rules/no-context-leak.ts`
- [x] Set up rule meta (docs, schema, messages)
- [x] Create empty `create()` function

### 3.2 Rule Implementation

- [x] Set up TypeScript type services
- [x] Track `Owned` values and their scope parameter
- [x] Detect scope boundary crossings
- [x] Report when crossing without bridge()

### 3.3 Rule Tests

- [x] Create test file with RuleTester
- [x] Test: valid code (no leak)
- [x] Test: invalid code (leak detected)
- [x] Test: bridged code (valid)
- [x] Test: edge cases

### 3.4 Plugin Export

- [x] Create `packages/eslint-plugin/src/index.ts`
- [x] Export rules and configs
- [x] Create `recommended` config

---

## Task 4: ESLint Rule - require-confidence-check ✅

**Goal:** Warn when confidence is not checked

### 4.1 Rule Setup

- [x] Create rule file
- [x] Define meta

### 4.2 Rule Implementation

- [x] Detect `Owned`/`SemanticValue` usage
- [x] Check for `.confidence` comparison
- [x] Allow explicit handlers

### 4.3 Rule Tests

- [x] Valid and invalid cases

---

## Task 5: AI SDK Integration ✅

**Goal:** Wrapper for Vercel AI SDK

### 5.1 Client (`packages/ai-sdk/src/client.ts`)

- [x] `createMullionClient(provider)` function
- [x] Scope method on client
- [x] Type inference

### 5.2 Inference (`packages/ai-sdk/src/infer.ts`)

- [x] Wrap `generateObject`
- [x] Return `Owned<T, S>`
- [x] Confidence extraction (based on finishReason)

### 5.3 Tests

- [x] Mock provider tests
- [x] Integration test with real API (manual)

---

## Task 6: Demo & Documentation ✅

**Goal:** Prove the value

### 6.1 Basic Example (`examples/basic/`)

- [x] Simple Node.js demo
- [x] Show scope, Owned, bridge
- [x] Show ESLint catching leak

### 6.2 README

- [x] Root README with quick start
- [x] Package READMEs
- [x] Examples in docs

### 6.3 First Changeset

- [x] Create changesets for all packages
- [x] Prepare for 0.1.0 release

**✅ MILESTONE COMPLETED: Mullion 0.1.0 Release Ready**

---

## Task 7: Cache Foundation ✅

**Goal:** Provider-aware caching with safe defaults

### Design Constraints (MUST follow)

> ⚠️ These constraints are based on real provider limitations discovered during research.
> Ignoring them will result in "cache exists but doesn't work" scenarios.

1. **Anthropic generateObject uses tools** → different schemas in fork branches break cache
2. **Anthropic cache warmup required** → parallel calls don't share cache without warmup
3. **Model-specific thresholds** → min tokens vary by model (1024-4096)
4. **TTL ordering** → longer TTL must come before shorter in same request
5. **Max 4 breakpoints** → Anthropic limit per request
6. **Safe-by-default** → never cache user content without explicit opt-in

### 7.1 Provider Capability Matrix ✅

- [x] Create `packages/ai-sdk/src/cache/capabilities.ts`
- [x] Implement `getCacheCapabilities(provider, model)` function
- [x] Anthropic model-specific thresholds
- [x] OpenAI: automatic caching, 1024 min, 128 increment
- [x] Write unit tests
- [x] Export from @mullion/ai-sdk

### 7.2 CacheConfig Types ✅

- [x] Create `packages/ai-sdk/src/cache/types.ts`
- [x] Define provider-agnostic `CacheConfig`
- [x] Define provider-specific adapters
- [x] Validation functions
- [x] Export types from package

### 7.3 Cache Segments API ✅

- [x] Create `packages/ai-sdk/src/cache/segments.ts`
- [x] Implement `CacheSegmentManager`
- [x] Add to context: `ctx.cache: CacheSegmentManager`
- [x] Validate minimum token threshold per model before caching
- [x] **Safe-by-default**: reject user content unless `scope: 'allow-user-content'`
- [x] Warn if content below minimum threshold
- [x] Write unit tests

### 7.4 Cache Metrics Parser ✅

- [x] Create `packages/ai-sdk/src/cache/metrics.ts`
- [x] Parse Anthropic response
- [x] Parse OpenAI response
- [x] Define provider-agnostic `CacheStats`
- [x] Implement `ctx.getCacheStats()` method
- [x] Write unit tests

### 7.5 Cache Integration with infer() ✅

- [x] Update `ctx.infer()` to accept cache options
- [x] Inject `providerOptions` for Anthropic based on segments
- [x] Track cache stats in context trace
- [x] Write integration tests

---

## Task 8: Fork with Cache Optimization ✅

**Goal:** Parallel execution that maximizes cache reuse

### Design Constraints

> ⚠️ Critical Anthropic limitations:
>
> 1. Cache becomes available only AFTER first response starts
> 2. Different tool schemas = different cache prefix = no reuse
> 3. `Promise.all()` without warmup = zero cache hits between branches

### 8.1 Fork Types ✅

- [x] Create `packages/core/src/fork/types.ts`
- [x] Define `ForkStrategy`
- [x] Define `ForkOptions`
- [x] Define `ForkResult<T>`
- [x] Export types

### 8.2 Fork Implementation ✅

- [x] Create `packages/core/src/fork/fork.ts`
- [x] Implement `fork(ctx, options)` function
- [x] **fast-parallel strategy**
- [x] **cache-optimized strategy**
- [x] Create isolated child contexts for each branch
- [x] Collect results with proper typing
- [x] Write unit tests

### 8.3 Warmup Implementation ✅

- [x] Create `packages/ai-sdk/src/cache/warmup.ts`
- [x] Implement warmup strategies
- [x] Track warmup token cost separately
- [x] Write tests verifying cache is primed

### 8.4 Schema Conflict Detection ✅

- [x] Create `packages/ai-sdk/src/cache/schema-conflict.ts`
- [x] Detect when fork branches have different tool schemas
- [x] Behavior based on `onSchemaConflict`
- [x] Write tests

### 8.5 Fork API (Final Design) ✅

- [x] Create comprehensive integration example
- [x] Verify all fork components work together
- [x] Document API usage patterns

### 8.6 Fork Tests ✅

- [x] Test: `fast-parallel` executes all branches concurrently
- [x] Test: `cache-optimized` with warmup shows cache hits
- [x] Test: without warmup, no cross-branch cache hits
- [x] Test: schema conflict warning fires when schemas differ
- [x] Test: `onSchemaConflict: 'error'` throws
- [x] Test: cache metrics correctly aggregate across branches
- [x] Test: child contexts are properly isolated

---

## Task 9: Merge Strategies ✅

**Goal:** Type-safe result aggregation with provenance tracking

### 9.1 Merge Types ✅

- [x] Create `packages/core/src/merge/types.ts`
- [x] Define `MergeStrategy`
- [x] Define `MergeResult`

### 9.2 Built-in Strategies ✅

- [x] Create `packages/core/src/merge/strategies/`
- [x] **categorical.weightedVote()**
- [x] **continuous.weightedAverage()**
- [x] **object.fieldwise()**
- [x] **array.concat()**
- [x] **custom(fn)**
- [x] Write unit tests for each strategy

### 9.3 Consensus Requirements ✅

- [x] Implement `merge.requireConsensus(k)`
- [x] Consensus calculation
- [x] Write tests for consensus scenarios

### 9.4 Merge Integration ✅

- [x] Create `packages/core/src/merge/merge.ts`
- [x] Implement main `merge()` function
- [x] Integrate with fork
- [x] Write integration tests

### 9.5 Merge Tests ✅

- [x] Test: weightedVote with clear winner
- [x] Test: weightedVote with tie
- [x] Test: weightedAverage calculation correctness
- [x] Test: fieldwise conflict detection
- [x] Test: requireConsensus passes when met
- [x] Test: requireConsensus fails/lowers confidence when not met
- [x] Test: provenance correctly tracks contributing branches

---

## Task 10: Cost Estimation ✅

**Goal:** Help developers understand and control costs

### 10.1 Token Estimation ✅

- [x] Create `packages/ai-sdk/src/cost/tokens.ts`
- [x] Implement `estimateTokens(text, model?)`
- [x] Use tiktoken for OpenAI models
- [x] Approximate for Claude
- [x] Mark estimation method clearly
- [x] Write tests

### 10.2 Pricing Tables ✅

- [x] Create `packages/ai-sdk/src/cost/pricing.ts`
- [x] Define pricing structure
- [x] Include current pricing
- [x] Anthropic cache economics
- [x] Allow override via config/env
- [x] Export pricing data as JSON

### 10.3 Cost Calculation ✅

- [x] Create `packages/ai-sdk/src/cost/calculator.ts`
- [x] Implement `calculateCost()`
- [x] Net savings calculation
- [x] Write tests

### 10.4 Context Cost Integration ✅

- [x] Add `getLastCallCost()` to context
- [x] Add `estimateNextCallCost()` to context
- [x] Include cost in trace data
- [x] Comparison: estimate vs actual
- [x] Write integration tests

---

## Task 11: Trace Export (OpenTelemetry)

**Goal:** Export Mullion-specific trace data to existing observability platforms

### Philosophy

> ❌ **NOT building:** own UI, dashboards, trace storage, LangSmith/Langfuse competitor
> ✅ **Building:** OpenTelemetry-compatible exporters with Mullion-specific attributes

This follows the "Minimal Runtime" philosophy — integrate into existing ecosystems without friction.

### 11.1 Trace Schema (OTel-Compatible) ✅

- [x] Create `packages/core/src/trace/types.ts`
- [x] Define `MullionSpan` following OTel conventions
- [x] Define `MullionAttributes` with all Mullion-specific attributes
- [x] Define `SpanContext`, `StartSpanOptions`, `EndSpanOptions`
- [x] Add type guards: `isMullionSpan`, `isSpanContext`
- [x] Follow [OpenTelemetry Semantic Conventions for GenAI](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [x] Export types from `packages/core/src/trace/index.ts`
- [x] Export types from `packages/core/src/index.ts`
- [x] Write comprehensive unit tests (38 tests passing)
- [x] Verify build and typecheck pass

### 11.2 Trace Collector (Minimal, In-Memory) ✅

- [x] Create `packages/core/src/trace/collector.ts`
- [x] Implement lightweight `TraceCollector` class
- [x] Implement `startSpan()` with trace/span ID generation
- [x] Implement `endSpan()` with status and attribute merging
- [x] Implement span retrieval methods: `getSpans()`, `getActiveSpans()`
- [x] Implement span management: `clear()`, `flush()`, `shutdown()`
- [x] Implement `SpanExporter` interface for backend integration
- [x] Implement trace context propagation (parent/child spans)
- [x] **Zero overhead by default** — tracing disabled until exporter attached
- [x] Auto-export modes: immediate or buffered with max spans limit
- [x] Graceful error handling (tracing failures don't break app)
- [x] Global collector singleton: `getGlobalTraceCollector()`, `setGlobalTraceCollector()`
- [x] Write comprehensive unit tests (34 tests passing)
- [x] Export from `packages/core/src/trace/index.ts`
- [x] Export from `packages/core/src/index.ts`
- [x] Verify build and typecheck pass
- [ ] Auto-instrument: `infer()`, `bridge()`, `fork()`, `merge()` (deferred to later tasks)

### 11.3 OpenTelemetry Exporter (Primary) ✅

- [x] Create `packages/core/src/trace/exporters/otlp-http.ts`
- [x] Implement `OTLPHttpExporter` - zero-dependency OTLP/HTTP exporter
- [x] Map span kinds (internal, client, server, producer, consumer)
- [x] Map span status (ok, error, unset) with messages
- [x] Map all Mullion attributes to OTLP attributes
- [x] Preserve `mullion.*` namespace for our unique data
- [x] Preserve `gen_ai.*` namespace for standard LLM attributes
- [x] Convert microsecond timestamps to nanoseconds (OTLP spec)
- [x] Support custom headers for authentication
- [x] Support timeout configuration
- [x] Support service name in resource attributes
- [x] Create convenience factory methods: `OTLPExporters.jaeger()`, `OTLPExporters.honeycomb()`, etc.
- [x] Write comprehensive unit tests (24 tests passing, 1 skipped)
- [x] Export from `packages/core/src/trace/exporters/index.ts`
- [x] Export from `packages/core/src/trace/index.ts`
- [x] Export from `packages/core/src/index.ts`
- [x] Verify build and typecheck pass

**Note:** Implemented zero-dependency OTLP/HTTP exporter instead of depending on @opentelemetry/\* packages. This aligns with Mullion's "Minimal Runtime" philosophy.

### 11.4 OTel Integration Helper ✅

- [x] Create `packages/core/src/trace/setup.ts`
- [x] Implement `setupMullionTracing()` function for one-liner setup
- [x] Support endpoint, serviceName, headers, custom exporter
- [x] Support maxSpans, autoExport, timeout configuration
- [x] Automatic global collector configuration
- [x] Implement `disableMullionTracing()` for graceful shutdown
- [x] Create `TracingPresets` for popular backends:
  - [x] `TracingPresets.jaeger()` - Local Jaeger
  - [x] `TracingPresets.honeycomb(apiKey)` - Honeycomb
  - [x] `TracingPresets.datadog(apiKey)` - Datadog
  - [x] `TracingPresets.newRelic(licenseKey)` - New Relic
  - [x] `TracingPresets.grafana(instanceId, apiKey)` - Grafana Cloud/Tempo
  - [x] `TracingPresets.custom(endpoint)` - Custom OTLP endpoint
- [x] Document all backends with examples
- [x] Write comprehensive integration tests (30 tests passing)
- [x] Export from `packages/core/src/trace/index.ts`
- [x] Export from `packages/core/src/index.ts`
- [x] Verify build and typecheck pass

### 11.5 Platform-Specific Exporters (Optional Convenience) ⏸️ DEFERRED

> These are thin wrappers for users who don't want to set up OTel themselves.
> Not a priority — OTel exporter covers most cases.

**Decision: Deferred to future release**

Reasons:

- OTLP exporter already covers 95% of use cases
- Would require external dependencies (langfuse, langsmith SDKs)
- Should be separate packages, not in @mullion/core
- Explicitly marked as "Not a priority" - can be added if users request
- Many platforms (Langfuse, LangSmith) already support OTLP ingestion

**If implemented in future:**

- [ ] Create separate packages: `@mullion/trace-langfuse`, `@mullion/trace-langsmith`
- [ ] Add as optional peer dependencies
- [ ] Provide thin wrappers around native SDKs
- [ ] Document integration patterns

### 11.6 Context Integration ⏸️ DEFERRED

**Status: Deferred to separate focused effort**

This task involves auto-instrumenting Mullion's core operations (`infer()`, `bridge()`, `fork()`, `merge()`) with tracing spans. While valuable, it requires:

- Updates to Context interface
- Changes to @mullion/ai-sdk package
- Integration with global trace collector
- Careful design to maintain zero-overhead when tracing disabled

**Current State:**

- ✅ Tracing infrastructure complete (collectors, exporters, setup)
- ✅ Users can manually create spans for their operations
- ⏸️ Automatic instrumentation deferred

**Manual Tracing (Available Now):**

```typescript
import { getGlobalTraceCollector, setupMullionTracing } from '@mullion/core';

setupMullionTracing({ endpoint: 'http://localhost:4318/v1/traces' });

const result = await scope('admin', async (ctx) => {
  const collector = getGlobalTraceCollector();

  // Manual span creation
  const spanCtx = collector.startSpan({
    name: 'mullion.infer',
    kind: 'client',
    attributes: {
      'mullion.scope.id': 'admin',
      'mullion.operation': 'infer',
    },
  });

  try {
    const data = await ctx.infer(Schema, input);
    await collector.endSpan(spanCtx, { status: 'ok' });
    return data;
  } catch (error) {
    await collector.endSpan(spanCtx, {
      status: 'error',
      statusMessage: error.message,
    });
    throw error;
  }
});
```

**Future Auto-Instrumentation Design:**

- [ ] Add `readonly traceId: string` to Context interface
- [ ] Add `readonly currentSpanId: string | null` to Context interface
- [ ] Update scope() to create trace spans automatically
- [ ] Update @mullion/ai-sdk to instrument infer() calls
- [ ] Add tracing configuration to client setup
- [ ] Ensure zero-overhead when tracing disabled
- [ ] Write integration tests

**Priority:** Medium - Users can achieve same result with manual spans. Auto-instrumentation is convenience, not requirement.

### 11.7 Documentation ✅

**Status: Complete**

All tracing functionality is documented and ready for users.

**Completed Documentation:**

- [x] Created `packages/core/TRACING.md` (533 lines) covering:
  - [x] Quick Start - Tracing with Jaeger (5min local setup)
  - [x] Production Tracing - Honeycomb/Datadog/New Relic/Grafana
  - [x] Manual Instrumentation (until auto-instrumentation available)
  - [x] Configuration options (full reference)
  - [x] Mullion attribute schema (`mullion.*`, `gen_ai.*`)
  - [x] Custom exporter implementation guide
  - [x] Lifecycle management (setup, shutdown, flush)
  - [x] Performance tuning (buffered vs immediate export)
  - [x] Troubleshooting guide (common issues, debugging)
  - [x] Best practices (env vars, service names, span hierarchy)
  - [x] Complete examples with parent/child spans

- [x] Updated `packages/core/README.md` with:
  - [x] "Tracing & Observability" section with quick start
  - [x] Feature list (zero-dependency OTLP, one-liner setup, etc.)
  - [x] Links to detailed TRACING.md guide
  - [x] API Reference including all tracing types and functions

**Files:**

- `packages/core/TRACING.md` - Comprehensive guide
- `packages/core/README.md` - Quick start and API reference
- JSDoc already comprehensive in all source files

---

## Task 12: Integration Tests (Real Providers)

**Goal:** Test @mullion packages against real LLM providers in isolated consumer app

### Philosophy

> 🎯 **Test as a real consumer** — separate workspace app that imports @mullion packages via workspace protocol
> 🔑 **Secrets isolation** — API keys only in integration tests, not in unit tests
> 🚀 **CI-ready** — automated testing with provider APIs on every PR (optional) or release

### Why in monorepo (not separate repo)

- Packages not yet published to npm — workspace resolution required
- Faster iteration during development
- Single CI pipeline, one versioning system
- **After first npm release** — consider adding canary repo for "real install" tests

### 12.1 Workspace Setup

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

### 12.2 Environment Setup

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

### 12.3 Test: Basic Inference (OpenAI)

- [ ] Create `apps/integration-tests/src/openai.test.ts`
- [ ] Test: `createMullionClient()` with OpenAI provider
- [ ] Test: `ctx.infer()` returns valid `Owned<T, S>`
- [ ] Test: Confidence score in valid range (0.3-1.0)
- [ ] Test: Scope tagged correctly
- [ ] Test: Trace ID generated
- [ ] Test: Complex schemas (nested objects, arrays, enums)
- [ ] Test: Large text inputs handled correctly

### 12.4 Test: Basic Inference (Anthropic)

- [ ] Create `apps/integration-tests/src/anthropic.test.ts`
- [ ] Test: `createMullionClient()` with Anthropic provider
- [ ] Test: `ctx.infer()` returns valid `Owned<T, S>`
- [ ] Test: Confidence extraction works
- [ ] Test: Different models (claude-3-5-sonnet, claude-3-haiku)

### 12.5 Test: Scope Bridging

- [ ] Create `apps/integration-tests/src/bridging.test.ts`
- [ ] Test: Data flows between scopes with `bridge()`
- [ ] Test: Bridged data has combined scope type
- [ ] Test: `use()` enforces scope boundaries at runtime
- [ ] Test: Nested scopes work correctly

### 12.6 Test: Caching (Anthropic)

- [ ] Create `apps/integration-tests/src/caching.test.ts`
- [ ] Test: Cache segments created correctly
- [ ] Test: `cacheCreationInputTokens` reported on first call
- [ ] Test: `cacheReadInputTokens` reported on second call (cache hit)
- [ ] Test: Cache metrics in `ctx.getCacheStats()`
- [ ] Test: System prompt caching
- [ ] Test: TTL options ('5m', '1h')

### 12.7 Test: Fork & Merge

- [ ] Create `apps/integration-tests/src/fork-merge.test.ts`
- [ ] Test: `fast-parallel` strategy executes all branches
- [ ] Test: `cache-optimized` with warmup (verify cache hits)
- [ ] Test: Schema conflict detection (different schemas warning)
- [ ] Test: Merge strategies produce correct results
- [ ] Test: Provenance tracking in merge results

### 12.8 Test: Cost Estimation

- [ ] Create `apps/integration-tests/src/cost.test.ts`
- [ ] Test: `estimateNextCallCost()` before inference
- [ ] Test: `getLastCallCost()` after inference
- [ ] Test: Cache savings calculation accuracy
- [ ] Test: Estimate vs actual comparison (reasonable delta)

### 12.9 Test: Edge Cases & Errors

- [ ] Create `apps/integration-tests/src/edge-cases.test.ts`
- [ ] Test: Ambiguous input → low confidence
- [ ] Test: Scope mismatch protection (use without bridge throws)
- [ ] Test: Invalid schema handling
- [ ] Test: API errors handled gracefully
- [ ] Test: Rate limit handling (if possible to trigger)

### 12.10 CI Integration

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

### 12.11 Documentation

- [ ] Create `apps/integration-tests/README.md`:
  - Setup instructions for contributors
  - How to run tests locally
  - How to add new test scenarios
  - CI behavior explanation
- [ ] Move `docs/contributing/integration-tests.md` content to app README
- [ ] Update root CONTRIBUTING.md with reference to integration tests
- [ ] Document test coverage expectations

### Success Criteria

Mark Task 12 complete when:

- [ ] All test files created and passing with real providers
- [ ] CI workflow runs on every push to main
- [ ] At least OpenAI and Anthropic providers tested
- [ ] Caching, fork/merge, cost estimation verified with real APIs
- [ ] Documentation complete for contributors

---

## Future Backlog

### ESLint Rules (High Value)

- [ ] `no-unsafe-bridge` — bridge without explicit policy/validation
- [ ] `no-cross-scope-write` — fork branch writes to shared state without lock/merge
- [ ] `prefer-cache-segments` — suggest explicit caching for large content
- [ ] `require-fork-strategy` — warn when using fork without explicit strategy

### Batch Processing (Deferred)

> Note: OpenAI and Anthropic Batch APIs are async (24h turnaround).
> Not suitable for realtime use cases. Consider for:
>
> - Evals / regression testing
> - Bulk data processing
> - Background jobs

- [ ] `@mullion/batch` package (separate)
- [ ] Queue-based API
- [ ] Webhook/polling for results
- [ ] Integration with trace for batch job monitoring

### Provider Adapters

- [ ] Google Gemini explicit caching (TTL-based cache handles)
- [ ] Azure OpenAI support
- [ ] Bedrock support

### Advanced Features

- [ ] `fork()` with `retryFailed` option
- [ ] `merge.ensemble()` — run multiple models, merge results
- [ ] Streaming support for fork branches
- [ ] Real-time cost alerts (threshold warnings)

### Examples & Templates

- [ ] Next.js App Router example
- [ ] Document Q&A with caching example
- [ ] Multi-agent orchestration example
- [ ] RAG pipeline with scope isolation

### Tooling

- [ ] VSCode extension (scope visualization)
- [ ] CLI for trace analysis (reads OTel exports)

### Post-Release Testing

> After first npm publish, add canary testing

- [ ] Create separate `mullion-canary` repository
- [ ] Test real `npm install @mullion/core` experience
- [ ] Verify exports, types, ESM/CJS compatibility
- [ ] Run smoke tests on each release tag

### Documentation

- [ ] Caching best practices guide
- [ ] Fork/merge patterns guide
- [ ] Migration guide from raw AI SDK
- [ ] Performance tuning guide

---

## Notes

### Turborepo Tips

```bash
# See dependency graph
turbo run build --graph

# Only run affected
turbo run test --filter=...[origin/main]

# Force no cache
turbo run build --force
```

### Changeset Tips

```bash
# Add changeset
pnpm changeset

# See pending changesets
ls .changeset/*.md

# Apply versions
pnpm version
```

### Cache Testing Tips

```bash
# Anthropic: verify cache metrics
# Look for cacheCreationInputTokens and cacheReadInputTokens in response

# OpenAI: check usage.prompt_tokens_details.cached_tokens

# Run same request twice to verify cache hit on second call
```

### Fork Testing Tips

```bash
# Test warmup effectiveness:
# 1. Run fork with strategy: 'fast-parallel' - note cache stats
# 2. Run fork with strategy: 'cache-optimized' - compare cache stats
# Expect: cache-optimized shows higher cacheReadTokens
```

### Trace Testing Tips

```bash
# Local development with Jaeger:
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Configure Mullion:
setupMullionTracing({
  endpoint: 'http://localhost:4318/v1/traces'
});

# View traces at http://localhost:16686
```

### Integration Testing Tips

```bash
# Run all integration tests
pnpm --filter integration-tests test

# Run only OpenAI tests
pnpm --filter integration-tests test:openai

# Run only Anthropic tests
pnpm --filter integration-tests test:anthropic

# Watch mode for development
pnpm --filter integration-tests test:watch
```
