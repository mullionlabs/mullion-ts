# Task 14: Integration Tests (Real Providers)

**Status:** 🔥 In Progress
**Started:** 2026-01-17

## Goal

Test @mullion packages against real LLM providers (OpenAI, Anthropic) to verify functionality with actual API responses.

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

### 14.1 Workspace Setup

- [ ] Create `apps/integration-tests/` directory
- [ ] Create `package.json`:
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
- [ ] Create `tsconfig.json`
- [ ] Create `vitest.config.ts`
- [ ] Verify workspace packages resolve correctly

### 14.2 Environment Setup

- [ ] Create `.env.example`:
  ```bash
  OPENAI_API_KEY=sk-proj-...
  ANTHROPIC_API_KEY=sk-ant-...
  ```
- [ ] Create `.gitignore` (exclude .env)
- [ ] Add timeout config for slow API calls (30s default)

### 14.3 Test: Basic Inference (OpenAI)

- [ ] Create `src/openai.test.ts`
- [ ] Test: `createMullionClient()` with OpenAI provider
- [ ] Test: `ctx.infer()` returns valid `Owned<T, S>`
- [ ] Test: Confidence score in valid range
- [ ] Test: Scope tagged correctly
- [ ] Test: Complex schemas (nested objects, arrays, enums)

### 14.4 Test: Basic Inference (Anthropic)

- [ ] Create `src/anthropic.test.ts`
- [ ] Test: `createMullionClient()` with Anthropic provider
- [ ] Test: `ctx.infer()` returns valid `Owned<T, S>`
- [ ] Test: Confidence extraction works
- [ ] Test: Different models (sonnet, haiku)

### 14.5 Test: Scope Bridging

- [ ] Create `src/bridging.test.ts`
- [ ] Test: Data flows between scopes with `bridge()`
- [ ] Test: Bridged data has combined scope type
- [ ] Test: `use()` enforces scope boundaries at runtime

### 14.6 Test: Caching (Anthropic)

- [ ] Create `src/caching.test.ts`
- [ ] Test: Cache segments created correctly
- [ ] Test: `cacheCreationInputTokens` on first call
- [ ] Test: `cacheReadInputTokens` on cache hit
- [ ] Test: Cache metrics in `ctx.getCacheStats()`

### 14.7 Test: Fork & Merge

- [ ] Create `src/fork-merge.test.ts`
- [ ] Test: `fast-parallel` executes all branches
- [ ] Test: `cache-optimized` with warmup
- [ ] Test: Merge strategies work correctly
- [ ] Test: Provenance tracking

### 14.8 Test: Cost Estimation

- [ ] Create `src/cost.test.ts`
- [ ] Test: `estimateNextCallCost()` before inference
- [ ] Test: `getLastCallCost()` after inference
- [ ] Test: Cache savings calculation

### 14.9 Test: Edge Cases

- [ ] Create `src/edge-cases.test.ts`
- [ ] Test: Ambiguous input → low confidence
- [ ] Test: Scope mismatch throws
- [ ] Test: API errors handled gracefully

### 14.10 CI Integration

- [ ] Create `.github/workflows/integration-tests.yml`:

  ```yaml
  name: Integration Tests
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
    workflow_dispatch:

  jobs:
    integration:
      runs-on: ubuntu-latest
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

- [ ] Add secrets to GitHub repository

### 14.11 Documentation

- [ ] Create `apps/integration-tests/README.md`
- [ ] Document how to run locally
- [ ] Document how to add new tests

## Success Criteria

- [ ] All test files passing with real providers
- [ ] CI runs on every push to main
- [ ] OpenAI + Anthropic tested
- [ ] Caching, fork/merge verified with real APIs

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
4. Skip expensive tests on PR (only run on main)
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
