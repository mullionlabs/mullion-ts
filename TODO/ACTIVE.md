# Active Task: Integration Tests (Task 14)

**Status:** 🔥 In Progress
**Started:** 2026-01-17
**Full Plan:** [tasks/14-integration-tests.md](./tasks/14-integration-tests.md)

## Current Focus

Working on setting up integration tests for @mullion packages with real LLM providers.

### Next Steps

1. Move to Task 15: create-mullion CLI

## Context

**Location:** `tests/integration/`

**Why in monorepo:**

- Packages not published to npm yet → need workspace resolution
- Faster iteration during development
- Single CI pipeline

**Dependencies:**

- ✅ @mullion/core - Complete
- ✅ @mullion/ai-sdk - Complete
- ✅ Real provider setup (OpenAI, Anthropic)

**Related Tasks:**

- Task 12: Templates provide test scenarios
- Task 11: Tracing integration ready to test
- Task 10: Cost tracking ready to test

## Key Decisions

1. **Vitest for testing** - Consistent with other packages
2. **Real API calls** - Not mocks, test actual provider integration
3. **Workspace dependencies** - Use `workspace:*` not npm versions
4. **CI secrets** - Only run on main branch (protect API keys)
5. **30s timeout** - Real API calls can be slow

## What Gets Tested

### Core Functionality

- [x] Basic inference with OpenAI
- [x] Basic inference with Anthropic
- [x] Owned<T, S> return types
- [x] Confidence scoring
- [x] Scope tagging

### Advanced Features

- [x] Scope bridging
- [x] Anthropic caching (cache metrics)
- [x] Fork/merge strategies
- [x] Cost estimation vs actual
- [x] Complex schemas

### Edge Cases

- [x] Low confidence on ambiguous input
- [x] Scope mismatch errors
- [x] API error handling

## Current Blockers

None - ready to start implementation.

## Notes

- API costs: Keep tests minimal, use cheap models
- CI: Add `if: github.event_name != 'pull_request'` to protect secrets
- Future: After npm publish, consider separate canary repo for "real install" tests

## When This Task is Complete

Mark as complete when:

- [x] All test files written and passing
- [x] CI workflow configured
- [x] Secrets added to GitHub
- [x] Documentation written (README in tests/integration/)

Then move to: **Task 15 - create-mullion CLI**

---

**Last Updated:** 2026-01-17
