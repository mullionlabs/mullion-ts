# ScopeStack TODO

## Current Sprint: Week 1-2 (Foundation)

### Legend

- [ ] Not started
- [~] In progress
- [x] Done

---

## Task 0: Verify Setup

**Goal:** Ensure monorepo tooling works

### 0.1 Initial Setup

- [x] Run `pnpm install`
- [x] Run `pnpm build` (expect empty dist folders)
- [x] Run `pnpm typecheck`
- [x] Verify Turborepo caching works: run `pnpm build` again (should be cached)

### 0.2 First Changeset

- [x] Run `pnpm changeset`
- [x] Create a test changeset for @scopestack/core
- [x] Run `pnpm version` to see version bump
- [x] Revert test changeset

---

## Task 1: Core Types

**Goal:** Implement fundamental types in @scopestack/core

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
- [x] Run `pnpm --filter @scopestack/core build`
- [x] Run `pnpm --filter @scopestack/core test`
- [x] Run `pnpm --filter @scopestack/core typecheck`

---

## Task 2: Scope Implementation

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

## Task 3: ESLint Rule - no-context-leak

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

## Task 4: ESLint Rule - require-confidence-check

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

## Task 5: AI SDK Integration

**Goal:** Wrapper for Vercel AI SDK

### 5.1 Client (`packages/ai-sdk/src/client.ts`)

- [x] `createScopeStackClient(provider)` function
- [x] Scope method on client
- [x] Type inference

### 5.2 Inference (`packages/ai-sdk/src/infer.ts`)

- [x] Wrap `generateObject`
- [x] Return `Owned<T, S>`
- [x] Confidence extraction (based on finishReason: stop=1.0, length=0.75, content-filter=0.6, error=0.3)

### 5.3 Tests

- [x] Mock provider tests
- [x] Integration test with real API (manual) ✅ COMPLETED

---

## Task 6: Demo & Documentation

**Goal:** Prove the value

### 6.1 Basic Example (`examples/basic/`)

- [x] Simple Node.js demo
- [x] Show scope, Owned, bridge
- [x] Show ESLint catching leak

### 6.2 README

- [x] Root README with quick start
- [x] Package READMEs (already created)
- [x] Examples in docs

### 6.3 First Changeset

- [x] Create changesets for all packages
- [x] Prepare for 0.1.0 release

**✅ MILESTONE COMPLETED: ScopeStack 0.1.0 Release Ready**

**Package Versions:**

- @scopestack/core: 0.1.0
- @scopestack/ai-sdk: 0.1.0
- eslint-plugin-scopestack: 1.0.0
- scopestack-basic-example: 1.0.1

## Task 7: Cache Foundation (Week 3)

### 7.1 Provider Capability Matrix

- [x] Create `getCacheCapabilities(provider, model)` function
- [x] Return: `{ minTokens, maxBreakpoints, supportsTtl, supportsToolCaching }`
- [x] Anthropic model-specific thresholds
- [x] OpenAI auto-cache detection
- [x] Export from @scopestack/ai-sdk

### 7.2 CacheConfig Types (Provider-Agnostic)

- [x] Define abstract `CacheConfig` interface
- [x] Define `CacheScope`: 'system-only' | 'developer-content' | 'allow-user-content'
- [x] Define `CacheTTL`: '5m' | '1h'
- [x] Provider-specific adapters (Anthropic, OpenAI)
- [x] Validation: TTL ordering, breakpoint limits

### 7.3 Cache Segments API (First-Class)

- [x] `ctx.cache.segment(key, content, options)` — explicit caching
- [x] `ctx.cache.system(systemPrompt, options)` — system prompt helper
- [x] Track segments in context metadata
- [x] Validate minimum token threshold per model
- [x] **Safe-by-default**: only cache developer-controlled content

### 7.4 Cache Metrics

- [x] Parse Anthropic: `cache_creation_input_tokens`, `cache_read_input_tokens`
- [x] Parse OpenAI: `prompt_tokens_details.cached_tokens`
- [x] `CacheStats` interface (provider-agnostic)
- [x] `ctx.getCacheStats()` method
- [x] Calculate `savedTokens`, `estimatedSavedUsd`

---

## Task 8: Fork with Cache Optimization (Week 4-5)

### 8.1 Fork Strategies

- [ ] Define `ForkStrategy`: 'fast-parallel' | 'cache-optimized'
- [ ] `'fast-parallel'`: Promise.all, no warmup
- [ ] `'cache-optimized'`: warmup step, then parallel
- [ ] Document trade-offs clearly

### 8.2 Warmup Implementation

- [ ] Warmup executes minimal call to prime cache
- [ ] Cache segments shared across branches
- [ ] Track warmup cost in metrics

### 8.3 Schema Conflict Handling (Anthropic)

- [ ] Detect when branches have different tool schemas
- [ ] Warn: "Different schemas break Anthropic cache reuse"
- [ ] Suggest: universal schema pattern OR generateText fallback
- [ ] Option: `schemaConflict: 'warn' | 'error' | 'allow'`

### 8.4 Fork API Design

```typescript
// Explicit cache segments
await ctx.cache.segment('document', document, { ttl: '5m' });

const [risk, opportunity] = await fork(ctx, {
  strategy: 'cache-optimized',
  warmup: 'explicit', // or 'first-branch'
  branches: [
    (c) => c.infer(RiskSchema, 'Analyze risk'),
    (c) => c.infer(OpportunitySchema, 'Find opportunities'),
  ],
  onSchemaConflict: 'warn', // Anthropic-specific
});
```

### 8.5 Fork Tests

- [ ] Test: warmup enables cache hits (Anthropic)
- [ ] Test: fast-parallel has no cross-branch cache
- [ ] Test: schema conflict warning fires
- [ ] Test: cache metrics show savings

---

## Task 9: Merge Strategies (Week 5-6)

### 9.1 Core Strategies

- [ ] `categorical.weightedVote()` — vote by confidence
- [ ] `continuous.weightedAverage()` — with dispersion metric
- [ ] `object.fieldwise()` — per-field merge with conflict detection

### 9.2 Consensus & Provenance

- [ ] `merge.requireConsensus(k)` — require k/n agreement
- [ ] Return `MergeResult` with provenance:
  - Which branches contributed
  - Which values were rejected
  - Confidence based on agreement
- [ ] Low consensus → low confidence Owned

### 9.3 Tests

- [ ] Test conflict detection
- [ ] Test provenance tracking
- [ ] Test consensus thresholds

---

## Task 10: Cost Estimation (Week 6)

### 10.1 Token Estimation

- [ ] `estimateTokens(text, model?)` — best-effort
- [ ] Use tiktoken for OpenAI
- [ ] Approximate for Claude (or mark as estimate)

### 10.2 Pricing Tables

- [ ] Separate module/JSON for prices
- [ ] Override via config/env
- [ ] Include "as-of" date
- [ ] Anthropic cache economics:
  - Write: +25% (5m) or x2 (1h)
  - Read: ~10% of base

### 10.3 Cost in Context

- [ ] `ctx.getLastCallCost()` — actual (from usage)
- [ ] `ctx.estimateNextCallCost()` — pre-call estimate
- [ ] Both in trace data

---

## Task 11: Trace & Observability (Week 6+)

### 11.1 JSON Trace Schema

- [ ] Define trace format (inputs, outputs, cache, cost, provenance)
- [ ] Include estimate vs actual comparison

### 11.2 Exporter Hooks

- [ ] `onTrace(trace)` callback
- [ ] Example: Langfuse/LangSmith integration
- [ ] OpenTelemetry-compatible format (optional)

---

## Design Constraints (MUST document)

1. **Anthropic generateObject uses tools** → different schemas break cache
2. **Anthropic cache warmup required** → parallel calls don't share cache without warmup
3. **Model-specific thresholds** → use `getCacheCapabilities()`, not hardcoded
4. **TTL ordering** → longer TTL must come before shorter
5. **Max 4 breakpoints** → validate in CacheConfig
6. **Safe-by-default** → don't cache user content without explicit opt-in

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
