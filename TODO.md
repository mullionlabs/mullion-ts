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

## Task 7: Cache Foundation (new)

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

### 7.1 Provider Capability Matrix

- [x] Create `packages/ai-sdk/src/cache/capabilities.ts`
- [x] Implement `getCacheCapabilities(provider, model)` function
- [x] Return type:
  ```typescript
  interface CacheCapabilities {
    supported: boolean;
    minTokens: number; // 1024, 2048, or 4096
    maxBreakpoints: number; // 4 for Anthropic
    supportsTtl: boolean;
    supportedTtl: ('5m' | '1h')[];
    supportsToolCaching: boolean;
    isAutomatic: boolean; // true for OpenAI
  }
  ```
- [x] Anthropic model-specific thresholds:
  - Claude Opus 4.5, Haiku 4.5: 4096 tokens
  - Claude Haiku 3/3.5: 2048 tokens
  - Claude Sonnet, Opus (others): 1024 tokens
- [x] OpenAI: automatic caching, 1024 min, 128 increment
- [x] Write unit tests
- [x] Export from @mullion/ai-sdk

### 7.2 CacheConfig Types

- [x] Create `packages/ai-sdk/src/cache/types.ts`
- [x] Define provider-agnostic `CacheConfig`:

  ```typescript
  type CacheTTL = '5m' | '1h';
  type CacheScope = 'system-only' | 'developer-content' | 'allow-user-content';

  interface CacheConfig {
    enabled: boolean;
    scope?: CacheScope; // default: 'developer-content'
    ttl?: CacheTTL; // default: '5m'
    breakpoints?: number; // 1-4, default: 1
  }
  ```

- [x] Define provider-specific adapters:
  ```typescript
  interface AnthropicCacheAdapter {
    toProviderOptions(config: CacheConfig): AnthropicProviderOptions;
  }
  ```
- [x] Validation functions:
  - `validateTtlOrdering(segments)` — longer before shorter
  - `validateBreakpointLimit(count)` — max 4
  - `validateMinTokens(tokens, model)` — meets threshold
- [x] Export types from package

### 7.3 Cache Segments API (First-Class Primitive)

- [x] Create `packages/ai-sdk/src/cache/segments.ts`
- [x] Implement `CacheSegmentManager`:

  ```typescript
  interface CacheSegment {
    key: string;
    content: string;
    tokenCount: number; // estimated
    ttl: CacheTTL;
    scope: CacheScope;
    createdAt: number;
  }

  class CacheSegmentManager {
    segment(key: string, content: string, options?: SegmentOptions): void;
    system(systemPrompt: string, options?: SegmentOptions): void;
    getSegments(): CacheSegment[];
    clear(): void;
    validateForModel(model: string): ValidationResult;
  }
  ```

- [x] Add to context: `ctx.cache: CacheSegmentManager`
- [x] Validate minimum token threshold per model before caching
- [x] **Safe-by-default**: reject user content unless `scope: 'allow-user-content'`
- [x] Warn if content below minimum threshold
- [x] Write unit tests

### 7.4 Cache Metrics Parser

- [x] Create `packages/ai-sdk/src/cache/metrics.ts`
- [x] Parse Anthropic response:
  ```typescript
  // From providerMetadata.anthropic
  {
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
  }
  ```
- [x] Parse OpenAI response:
  ```typescript
  // From usage.prompt_tokens_details
  {
    cached_tokens: number;
  }
  ```
- [x] Define provider-agnostic `CacheStats`:
  ```typescript
  interface CacheStats {
    provider: 'anthropic' | 'openai' | 'unknown';
    cacheWriteTokens: number;
    cacheReadTokens: number;
    inputTokens: number;
    outputTokens: number;
    // Derived
    savedTokens: number;
    cacheHitRate: number; // 0-1
    estimatedSavingsUsd: number;
    // Debug
    ttl?: CacheTTL;
    breakpointsUsed?: number;
    raw?: unknown;
  }
  ```
- [x] Implement `ctx.getCacheStats()` method
- [x] Write unit tests

### 7.5 Cache Integration with infer()

- [x] Update `ctx.infer()` to accept cache options:
  ```typescript
  ctx.infer(schema, prompt, {
    cache: 'use-segments' | 'none', // default: 'use-segments'
  });
  ```
- [x] Inject `providerOptions` for Anthropic based on segments
- [x] Track cache stats in context trace
- [x] Write integration tests

---

## Task 8: Fork with Cache Optimization (Week 4-5)

**Goal:** Parallel execution that maximizes cache reuse

### Design Constraints

> ⚠️ Critical Anthropic limitations:
>
> 1. Cache becomes available only AFTER first response starts
> 2. Different tool schemas = different cache prefix = no reuse
> 3. `Promise.all()` without warmup = zero cache hits between branches

### 8.1 Fork Types

- [x] Create `packages/core/src/fork/types.ts`
- [x] Define `ForkStrategy`:
  ```typescript
  type ForkStrategy =
    | 'fast-parallel' // Promise.all, no warmup, no cross-branch cache
    | 'cache-optimized'; // warmup first, then parallel with cache reuse
  ```
- [x] Define `ForkOptions`:
  ```typescript
  interface ForkOptions<T> {
    strategy: ForkStrategy;
    warmup?: 'explicit' | 'first-branch' | 'none';
    branches: Array<(ctx: Context) => Promise<T>>;
    onSchemaConflict?: 'warn' | 'error' | 'allow'; // Anthropic-specific
  }
  ```
- [x] Define `ForkResult<T>`:
  ```typescript
  interface ForkResult<T> {
    results: T[];
    cacheStats: {
      warmupCost: number;
      branchCacheHits: number[];
      totalSaved: number;
    };
    warnings: string[];
  }
  ```
- [x] Export types

### 8.2 Fork Implementation

- [x] Create `packages/core/src/fork/fork.ts`
- [x] Implement `fork(ctx, options)` function
- [x] **fast-parallel strategy:**
  - Execute all branches with `Promise.all()`
  - No warmup, branches don't share cache
  - Fastest latency, highest token cost
- [x] **cache-optimized strategy:**
  - Warmup step: minimal call to prime cache with segments
  - Wait for warmup completion
  - Then execute branches in parallel
  - Branches benefit from cached prefix
- [x] Create isolated child contexts for each branch
- [x] Collect results with proper typing
- [x] Write unit tests

### 8.3 Warmup Implementation

- [x] Create `packages/ai-sdk/src/cache/warmup.ts`
- [x] Implement warmup strategies:

  ```typescript
  // 'explicit' - separate minimal call just to prime cache
  async function explicitWarmup(ctx: Context): Promise<WarmupResult>;

  // 'first-branch' - first branch primes, others wait
  async function firstBranchWarmup(branches): Promise<void>;
  ```

- [x] Track warmup token cost separately
- [x] Warmup uses cached segments but minimal output
- [x] Write tests verifying cache is primed

### 8.4 Schema Conflict Detection (Anthropic)

- [x] Create `packages/ai-sdk/src/cache/schema-conflict.ts`
- [x] Detect when fork branches have different tool schemas:
  ```typescript
  function detectSchemaConflict(branches): ConflictResult {
    // Extract schema from each branch's infer() call
    // Compare tool definitions
    // Return conflict info
  }
  ```
- [x] Warn message: "Different schemas in fork branches break Anthropic cache reuse. Consider: (1) universal schema, (2) generateText + post-process, (3) accept no cache sharing"
- [x] Behavior based on `onSchemaConflict`:
  - `'warn'`: console.warn + continue
  - `'error'`: throw Error
  - `'allow'`: silent continue
- [x] Write tests

### 8.5 Fork API (Final Design) ✅

- [x] Create comprehensive integration example (`examples/basic/fork-example.js`)
- [x] Verify all fork components work together
- [x] Document API usage patterns

```typescript
// Example usage with explicit segments (Variant B)
await ctx.cache.segment('document', longDocument, { ttl: '5m' });
await ctx.cache.system(systemPrompt, { ttl: '1h' });

const result = await fork(ctx, {
  strategy: 'cache-optimized',
  warmup: 'explicit',
  onSchemaConflict: 'warn',
  branches: [
    (c) => c.infer(RiskSchema, 'Analyze risk factors'),
    (c) => c.infer(OpportunitySchema, 'Find opportunities'),
    (c) => c.infer(SummarySchema, 'Provide executive summary'),
  ],
});

console.log(result.results); // [risk, opportunity, summary]
console.log(result.cacheStats); // { warmupCost, branchCacheHits, totalSaved }
console.log(result.warnings); // schema conflict warnings if any
```

### 8.6 Fork Tests ✅

- [x] Test: `fast-parallel` executes all branches concurrently
- [x] Test: `cache-optimized` with warmup shows cache hits (Anthropic)
- [x] Test: without warmup, no cross-branch cache hits
- [x] Test: schema conflict warning fires when schemas differ
- [x] Test: `onSchemaConflict: 'error'` throws
- [x] Test: cache metrics correctly aggregate across branches
- [x] Test: child contexts are properly isolated

**Test Files Created:**

- `packages/core/src/fork/fork.test.ts` - 28 core fork tests
- `packages/ai-sdk/src/fork-integration.test.ts` - 25 integration tests

---

## Task 9: Merge Strategies

**Goal:** Type-safe result aggregation with provenance tracking

### 9.1 Merge Types

- [x] Create `packages/core/src/merge/types.ts`
- [x] Define `MergeStrategy`:
  ```typescript
  type MergeStrategy<T, R> = {
    name: string;
    merge(results: Array<Owned<T, any>>): MergeResult<R>;
  };
  ```
- [x] Define `MergeResult`:

  ```typescript
  interface MergeResult<T> {
    value: Owned<T, 'merged'>;
    provenance: {
      contributingBranches: number[];
      rejectedValues: Array<{ branch: number; value: unknown; reason: string }>;
      consensusLevel: number; // 0-1, how much agreement
    };
    conflicts: MergeConflict[];
  }

  interface MergeConflict {
    field?: string;
    values: unknown[];
    resolution: 'voted' | 'averaged' | 'first' | 'rejected';
  }
  ```

### 9.2 Built-in Strategies

- [x] Create `packages/core/src/merge/strategies/`
- [x] **categorical.weightedVote()**
  ```typescript
  // Votes on discrete values, weighted by confidence
  // Returns most voted value, confidence = vote share
  merge.categorical.weightedVote<T>(): MergeStrategy<T, T>
  ```
- [x] **continuous.weightedAverage()**
  ```typescript
  // Averages numeric values, weighted by confidence
  // Also returns dispersion (stddev) as uncertainty indicator
  merge.continuous.weightedAverage(): MergeStrategy<number, {
    value: number;
    dispersion: number;
  }>
  ```
- [x] **object.fieldwise()**
  ```typescript
  // Merges objects field by field
  // Detects conflicts per field
  // Does NOT silently overwrite - flags conflicts
  merge.object.fieldwise<T extends object>(): MergeStrategy<T, T>
  ```
- [x] **array.concat()**
  ```typescript
  // Concatenates array results, removes duplicates
  merge.array.concat<T>(): MergeStrategy<T[], T[]>
  ```
- [x] **custom(fn)**
  ```typescript
  // User-provided merge function
  merge.custom<T, R>(fn: (results: Owned<T>[]) => R): MergeStrategy<T, R>
  ```
- [x] Write unit tests for each strategy

### 9.3 Consensus Requirements

- [x] Implement `merge.requireConsensus(k)`:
  ```typescript
  // Requires k out of n branches to agree
  // If not met: returns low confidence OR throws
  merge.requireConsensus<T>(k: number, options?: {
    onFailure: 'low-confidence' | 'error';
  }): MergeStrategy<T, T>
  ```
- [x] Consensus calculation: agreement on value within tolerance
- [x] Write tests for consensus scenarios

### 9.4 Merge Integration

- [x] Create `packages/core/src/merge/merge.ts`
- [x] Implement main `merge()` function:
  ```typescript
  function merge<T, R>(
    results: Array<Owned<T, any>>,
    strategy: MergeStrategy<T, R>
  ): MergeResult<R>;
  ```
- [x] Integrate with fork:
  ```typescript
  const forkResult = await fork(ctx, { ... });
  const merged = merge(forkResult.results, merge.categorical.weightedVote());
  ```
- [x] Write integration tests

### 9.5 Merge Tests

- [x] Test: weightedVote with clear winner
- [x] Test: weightedVote with tie (uses confidence as tiebreaker)
- [x] Test: weightedAverage calculation correctness
- [x] Test: fieldwise conflict detection
- [x] Test: requireConsensus passes when met
- [x] Test: requireConsensus fails/lowers confidence when not met
- [x] Test: provenance correctly tracks contributing branches

---

## Task 10: Cost Estimation

**Goal:** Help developers understand and control costs

### 10.1 Token Estimation ✅

- [x] Create `packages/ai-sdk/src/cost/tokens.ts`
- [x] Implement `estimateTokens(text, model?)`:

  ```typescript
  interface TokenEstimate {
    count: number;
    method: 'tiktoken' | 'approximate' | 'exact';
    model?: string;
  }

  function estimateTokens(text: string, model?: string): TokenEstimate;
  ```

- [x] Use tiktoken for OpenAI models
- [x] Approximate for Claude (chars/4 or similar heuristic)
- [x] Mark estimation method clearly
- [x] Write tests

### 10.2 Pricing Tables ✅

- [x] Create `packages/ai-sdk/src/cost/pricing.ts`
- [x] Define pricing structure:
  ```typescript
  interface ModelPricing {
    model: string;
    provider: 'anthropic' | 'openai';
    inputPer1M: number; // USD per 1M input tokens
    outputPer1M: number; // USD per 1M output tokens
    cachedInputPer1M?: number; // USD per 1M cached input
    cacheWritePer1M?: number; // USD per 1M cache write
    asOfDate: string; // ISO date
  }
  ```
- [x] Include current pricing (as of knowledge cutoff)
- [x] Anthropic cache economics:
  - 5m cache write: +25% of input price
  - 1h cache write: +100% of input price
  - Cache read: ~10% of input price
- [x] Allow override via config/env:
  ```typescript
  function getPricing(
    model: string,
    overrides?: Partial<ModelPricing>
  ): ModelPricing;
  ```
- [x] Export pricing data as JSON for easy updates

### 10.3 Cost Calculation ✅

- [x] Create `packages/ai-sdk/src/cost/calculator.ts`
- [x] Implement `calculateCost()`:

  ```typescript
  interface CostBreakdown {
    inputCost: number;
    outputCost: number;
    cacheWriteCost: number;
    cacheReadCost: number;
    totalCost: number;
    savings: number; // vs no cache
    savingsPercent: number;
  }

  function calculateCost(
    usage: TokenUsage,
    cacheStats: CacheStats,
    model: string
  ): CostBreakdown;
  ```

- [x] Net savings calculation: `savings = (cacheReadTokens * inputPrice * 0.9) - (cacheWriteTokens * writeMultiplier)`
- [x] Write tests

### 10.4 Context Cost Integration ✅

- [x] Add to context:
  ```typescript
  interface Context {
    // ... existing
    getLastCallCost(): CostBreakdown; // actual, from usage
    estimateNextCallCost(prompt: string): CostBreakdown; // pre-call estimate
  }
  ```
- [x] Include cost in trace data
- [x] Comparison: estimate vs actual (for debugging)
- [x] Write integration tests

---

## Task 11: Trace & Observability

**Goal:** Make debugging and monitoring first-class

### 11.1 Trace Schema

- [ ] Create `packages/core/src/trace/types.ts`
- [ ] Define `TraceEntry`:

  ```typescript
  interface TraceEntry {
    id: string;
    timestamp: number;
    scope: string;
    operation: 'infer' | 'bridge' | 'fork' | 'merge';

    // Input/Output
    input?: {
      prompt?: string;
      schema?: string;
      segments?: string[];
    };
    output?: {
      value?: unknown;
      confidence?: number;
    };

    // Performance
    duration: number;
    tokens: {
      input: number;
      output: number;
      cached: number;
    };

    // Cost
    cost: CostBreakdown;

    // Cache
    cache: {
      hits: number;
      misses: number;
      segments: string[];
    };

    // Provenance (for merge)
    provenance?: {
      sources: string[];
      conflicts: number;
    };

    // Errors
    error?: {
      message: string;
      code?: string;
    };
  }
  ```

- [ ] Define `Trace` as collection of entries
- [ ] Export schema as JSON Schema for tooling

### 11.2 Trace Collection

- [ ] Create `packages/core/src/trace/collector.ts`
- [ ] Implement `TraceCollector`:

  ```typescript
  class TraceCollector {
    entries: TraceEntry[];

    record(entry: Partial<TraceEntry>): void;
    getTrace(): Trace;
    toJSON(): string;
    clear(): void;
  }
  ```

- [ ] Integrate with Context
- [ ] Auto-record on infer(), bridge(), fork(), merge()

### 11.3 Exporter Hooks

- [ ] Create `packages/core/src/trace/exporters.ts`
- [ ] Define exporter interface:
  ```typescript
  interface TraceExporter {
    name: string;
    export(trace: Trace): Promise<void>;
  }
  ```
- [ ] Implement `ConsoleExporter` (default, for debugging)
- [ ] Implement `JsonFileExporter` (for CI/testing)
- [ ] Document integration patterns for:
  - Langfuse
  - LangSmith
  - OpenTelemetry
- [ ] Provide example exporter implementations

### 11.4 Context Integration

- [ ] Add to context:
  ```typescript
  interface Context {
    // ... existing
    getTrace(): Trace;
    exportTrace(exporter?: TraceExporter): Promise<void>;
  }
  ```
- [ ] Include estimate vs actual comparison in trace
- [ ] Write tests

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
- [ ] Chrome DevTools integration
- [ ] CLI for trace analysis

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
