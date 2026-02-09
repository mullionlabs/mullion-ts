# Task 18: Gemini Adapter for @mullion/ai-sdk

**Status:** ✅ Completed  
**Priority:** High (After Task 17)

## Goal

Add first-class Google Gemini adapter support to `@mullion/ai-sdk` with provider-specific cache, metrics, and cost/token behavior aligned with existing OpenAI/Anthropic ergonomics.

## Why this task exists

- `Provider` already includes `google`, but cache capabilities are currently marked as not implemented.
- `parseCacheMetrics()` currently routes `google` to `unknown` fallback metrics.
- Adapter factories currently exist only for Anthropic/OpenAI.
- Cost/token utilities and pricing APIs are focused on OpenAI/Anthropic only.
- Docs contain mixed signals: Google is mentioned as supported, but provider-specific adapter behavior is incomplete.

## Summary

Implement a dedicated Gemini adapter and complete Google provider support across cache capabilities, metrics parsing, token/cost estimation, integration tests, and documentation.

## Philosophy

> 🔌 **Provider parity** — same adapter ergonomics across OpenAI, Anthropic, Gemini  
> 🧪 **Real-provider validation** — ship only with integration coverage against real Gemini API  
> 📚 **Honest docs** — documentation must reflect actual capabilities and limitations

## Scope

**In scope:**

- `packages/ai-sdk` adapter/caching/metrics/cost updates
- `tests/integration` Gemini provider tests
- docs updates for provider support and integration steps

**Out of scope (separate follow-up unless explicitly pulled in):**

- making Gemini the default provider in demo apps/templates
- broader provider additions (Azure OpenAI, Bedrock)

## Checklist

### 18.1 Provider contract and model baseline

- [x] Confirm Gemini cache + usage metadata contract from official provider docs before implementation
- [x] Implement dynamic model discovery via Gemini `models.list` (no hardcoded full model list)
- [x] Define baseline support as "all models active as of early February 2026" resolved from `models.list`
- [x] Document model-level limitations and fallback behavior

### 18.2 Cache capability matrix and adapter API

- [x] Update `packages/ai-sdk/src/cache/capabilities.ts` with implemented Google model capabilities
- [x] Add `GoogleProviderOptions` and `GeminiCacheAdapter` types in `packages/ai-sdk/src/cache/types.ts`
- [x] Add `createGeminiAdapter(model)` factory (parallel to `createAnthropicAdapter`/`createOpenAIAdapter`)
- [x] Export Gemini adapter/types from `packages/ai-sdk/src/index.ts` and `packages/ai-sdk/src/cache/index.ts`
- [x] Add/extend unit tests in `cache/capabilities.test.ts` and `cache/types.test.ts`

### 18.3 Client and cache-segment integration

- [x] Wire Gemini adapter output into `ctx.infer()` provider options flow in `packages/ai-sdk/src/client.ts`
- [x] Ensure graceful fallback when requested cache features are not supported by model
- [x] Keep existing OpenAI/Anthropic behavior unchanged

### 18.4 Cache metrics parsing

- [x] Add Google usage metrics types and parser in `packages/ai-sdk/src/cache/metrics.ts`
- [x] Return provider-aware Google `CacheStats` (instead of `unknown`) when usage data is available
- [x] Add tests for Google parse paths and aggregation behavior

### 18.5 Cost and token estimation

- [x] Extend provider detection in `packages/ai-sdk/src/cost/tokens.ts` for `gemini-*` models
- [x] Extend pricing provider union in `packages/ai-sdk/src/cost/pricing.ts` to include `google`
- [x] Add baseline Gemini pricing entries and update `asOfDate`
- [x] Extend `getPricingByProvider()` API + tests for Google
- [x] Keep unknown-provider fallback conservative

### 18.6 Real-provider integration tests

- [x] Add `@ai-sdk/google` in `tests/integration/package.json`
- [x] Add `tests/integration/src/gemini.test.ts`
- [x] Add env support: `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_MODEL`
- [x] Add script: `pnpm --filter integration-tests test:gemini`
- [x] Update `tests/integration/.env.example` and `tests/integration/README.md`

### 18.7 Documentation alignment

- [x] Update `packages/ai-sdk/README.md` provider support matrix with explicit capability levels
- [x] Update `docs/reference/caching.md` for Gemini provider behavior and limitations
- [x] Update `docs/reference/cost-estimation.md` for Google pricing support
- [x] Update `docs/contributing/integration-tests.md` with Gemini test flow and commands
- [x] Remove/correct stale claims that imply unsupported features are already complete

### 18.8 Release and rollout

- [x] Add changeset for `@mullion/ai-sdk`
- [x] Add release notes/migration notes for Gemini adapter API
- [x] Verify `build`, `lint`, and `test` pass for affected workspaces

## Success Criteria

- [x] `createGeminiAdapter()` exists and is exported
- [x] `getCacheCapabilities('google', <gemini-model>)` returns implemented capabilities
- [x] `parseCacheMetrics(..., 'google', ...)` returns normalized Google metrics when usage is available
- [x] `estimateTokens(..., 'gemini-...')` uses Gemini-aware path (not unknown fallback)
- [x] `getPricingByProvider('google')` returns non-empty pricing set
- [x] `pnpm --filter @mullion/ai-sdk test` passes
- [x] `pnpm --filter integration-tests test:gemini` passes with valid Google key
- [x] Docs and integration instructions match actual implementation

> Validation: executed with real keys from `tests/integration/.env` on 2026-02-09.

## Open Questions

1. Export naming: ship only `createGeminiAdapter` for now (no duplicate alias).
2. `models.list` behavior: fail fast on fetch errors, with optional in-memory cached fallback via `listGeminiModelsCached()`.
3. Missing Google cache fields: keep provider-aware metrics (`provider: 'google'`) and default cache values to `0`.

## References reviewed

- `docs/contributing/integration-tests.md`
- `docs/reference/caching.md`
- `docs/reference/cost-estimation.md`
- `docs/guides/getting-started.md`
- `docs/design/roadmap.md`
- Google Gemini API docs (`models.list`, pricing, model catalog)
- Vercel AI SDK docs for `@ai-sdk/google` (`cachedContent`, `usageMetadata.cachedContentTokenCount`)

## When complete

Then move to: **Task 19 (TBD)**

---

**Last Updated:** 2026-02-09
