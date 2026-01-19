# Task 14: Integration Tests (COMPLETED ✅)

**Status:** ✅ Complete
**Started:** 2026-01-17
**Completed:** 2026-01-19

## Goal

Test @mullion packages against real LLM providers (OpenAI, Anthropic) to verify functionality with actual API responses.

## Summary

Integration test workspace in `tests/integration/` with real OpenAI + Anthropic calls, coverage for caching/fork/merge/cost, CI workflow for manual/tagged runs, and local run docs.

## Philosophy

> 🎯 **Test as a real consumer** — workspace app with @mullion deps
> 🔑 **Secrets isolation** — API keys only here
> 🚀 **CI-ready** — automated on every push

## Why in monorepo (not separate repo)

- Packages not yet published to npm — workspace resolution required
- Faster iteration during development
- Single CI pipeline, one versioning system
- **After first npm release** — consider adding canary repo for "real install" tests

## Checklist

### 14.1 Workspace Setup ✅

- [x] Create `tests/integration/` directory
- [x] Create `package.json`:
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
- [x] Create `tsconfig.json`
- [x] Create `vitest.config.ts`
- [x] Verify workspace packages resolve correctly

### 14.2 Environment Setup ✅

- [x] Create `.env.example`:
  ```bash
  OPENAI_API_KEY=sk-proj-...
  ANTHROPIC_API_KEY=sk-ant-...
  ```
- [x] Create `.gitignore` (exclude .env)
- [x] Add timeout config for slow API calls (30s default)

### 14.3 Test: Basic Inference (OpenAI)

- [x] Create `src/openai.test.ts`
- [x] Test: `createMullionClient()` with OpenAI provider
- [x] Test: `ctx.infer()` returns valid `Owned<T, S>`
- [x] Test: Confidence score in valid range
- [x] Test: Scope tagged correctly
- [x] Test: Complex schemas (nested objects, arrays, enums)

### 14.4 Test: Basic Inference (Anthropic)

- [x] Create `src/anthropic.test.ts`
- [x] Test: `createMullionClient()` with Anthropic provider
- [x] Test: `ctx.infer()` returns valid `Owned<T, S>`
- [x] Test: Confidence extraction works
- [x] Test: Different models (sonnet, haiku)

### 14.5 Test: Scope Bridging

- [x] Create `src/bridging.test.ts`
- [x] Test: Data flows between scopes with `bridge()`
- [x] Test: Bridged data has combined scope type
- [x] Test: `use()` enforces scope boundaries at runtime

### 14.6 Test: Caching (Anthropic)

- [x] Create `src/caching.test.ts`
- [x] Test: Cache segments created correctly
- [x] Test: `cacheCreationInputTokens` on first call
- [x] Test: `cacheReadInputTokens` on cache hit
- [x] Test: Cache metrics in `ctx.getCacheStats()`

### 14.7 Test: Fork & Merge

- [x] Create `src/fork-merge.test.ts`
- [x] Test: `fast-parallel` executes all branches
- [x] Test: `cache-optimized` with warmup
- [x] Test: Merge strategies work correctly
- [x] Test: Provenance tracking

### 14.8 Test: Cost Estimation

- [x] Create `src/cost.test.ts`
- [x] Test: `estimateNextCallCost()` before inference
- [x] Test: `getLastCallCost()` after inference
- [x] Test: Cache savings calculation

### 14.9 Test: Edge Cases

- [x] Create `src/edge-cases.test.ts`
- [x] Test: Ambiguous input → low confidence
- [x] Test: Scope mismatch throws
- [x] Test: API errors handled gracefully

### 14.10 CI Integration

- [x] Create `.github/workflows/integration-tests.yml` (manual + pre-release only):

  ```yaml
  name: Integration Tests
  on:
    workflow_dispatch:
    push:
      tags:
        - 'v*'

  jobs:
    integration:
      runs-on: ubuntu-latest
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

- [x] Add secrets to GitHub repository

### 14.11 Documentation

- [x] Create `tests/integration/README.md`
- [x] Document how to run locally
- [x] Document how to add new tests

## Success Criteria

- [x] All test files passing with real providers
- [x] CI runs only on manual trigger or pre-release/tagged publish
- [x] OpenAI + Anthropic tested
- [x] Caching, fork/merge verified with real APIs

## Testing Strategy

### What Gets Tested

**Core Functionality:**

- Owned<T, S> type correctness
- Confidence scoring (0-1 range)
- Scope tagging
- Schema validation

**Advanced Features:**

- Scope bridging with provenance
- Anthropic caching (creation + reads)
- Fork strategies (fast-parallel vs cache-optimized)
- Merge strategies (weighted vote, average, fieldwise)
- Cost estimation accuracy

**Edge Cases:**

- Low confidence on ambiguous input
- Scope boundary violations
- API error handling
- Rate limiting

### What NOT to Test

- ❌ Mock providers (unit tests cover this)
- ❌ UI/UX of demo apps (manual testing)
- ❌ Every possible model combination (too expensive)

## API Cost Management

**Estimated costs per full test run:**

- OpenAI tests: ~$0.05 (using gpt-4o-mini)
- Anthropic tests: ~$0.10 (using haiku)
- **Total: ~$0.15 per CI run**

**Cost reduction strategies:**

1. Use cheapest models (mini, haiku)
2. Small test inputs (100-200 tokens max)
3. Cache aggressively where possible
4. Run only before release/tagged publish
5. Manual trigger for full suite (`workflow_dispatch`)

## Notes

- **Real API calls** - Tests will fail if API keys invalid
- **30s timeout** - Some tests may be slow due to network
- **CI secrets** - Only run on main/internal PRs to protect keys
- **Mock fallback** - If no API keys, tests should skip gracefully
- **Future:** After npm publish, add canary repo for "real install" testing

## Related Tasks

- **Task 11:** Tracing integration can be tested here
- **Task 10:** Cost tracking accuracy verified
- **Task 8-9:** Fork/merge with real providers

## When Complete

Mark as done when:

- [x] All test suites written and passing
- [x] CI configured and running
- [x] Documentation complete
- [x] GitHub secrets added

Then move to: **Task 15 - create-mullion CLI**

---

**Last Updated:** 2026-01-17
