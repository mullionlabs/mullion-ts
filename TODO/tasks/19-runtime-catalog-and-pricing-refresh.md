# Task 19: Runtime Model Catalog + Pricing Refresh (as of 2026-02-09)

**Status:** 📋 Planned  
**Priority:** High (After Task 17)

## Goal

Avoid frequent SDK releases for provider model/pricing changes by adding a runtime model+pricing catalog override mechanism, while also refreshing hardcoded OpenAI/Anthropic/Gemini baselines to a pinned snapshot date: **2026-02-09**.

## Why this task exists

- `@mullion/ai-sdk` now includes Gemini support, but pricing/capability maps remain hardcoded.
- Hardcoded data becomes stale quickly (new model families, deprecations, pricing updates).
- End users should be able to consume updated model/pricing data at runtime without upgrading package versions for every change.

## Summary

Implement a two-layer catalog system:

1. **Built-in baseline snapshot** (hardcoded in package, pinned to 2026-02-09)
2. **Runtime overrides** (JSON source/file/env) with validation, caching, and safe fallback

This preserves deterministic behavior while enabling up-to-date pricing/model metadata in production environments.

## Scope

**In scope:**

- Runtime catalog loader and merge logic in `packages/ai-sdk`
- Schema-validated catalog JSON format (models + pricing + capabilities)
- Refresh hardcoded provider baselines (OpenAI, Anthropic, Gemini) to 2026-02-09
- Documentation for end-user integration
- Tests for merge precedence, fallback, and invalid payload handling

**Out of scope:**

- Fully automated provider scraping/parsing from arbitrary web pages at runtime
- Authenticated remote update service infrastructure (CDN/backend ops)
- Per-tenant billing policy management

## Checklist

### 19.1 Catalog schema and precedence model

- [ ] Define `ModelCatalog` schema (Zod) with explicit versioning (`schemaVersion`)
- [ ] Add `CatalogPricingEntry` and `CatalogCapabilityEntry` types
- [ ] Define precedence: runtime override > user-provided override > hardcoded baseline
- [ ] Define snapshot metadata fields (`snapshotDate`, `sources`, `generatedAt`)

### 19.2 Runtime loader API

- [ ] Add `loadModelCatalog(options)` API (URL/file/raw JSON)
- [ ] Add `setModelCatalogOverrides(catalog)` and `clearModelCatalogOverrides()`
- [ ] Add in-memory TTL cache and force-refresh option
- [ ] Add strict validation + descriptive errors for bad payloads
- [ ] Add safe fallback to baseline when loading/validation fails

### 19.3 Pricing integration

- [ ] Wire runtime catalog into `cost/pricing.ts` (`getPricing`, `getPricingByProvider`)
- [ ] Preserve existing behavior when no runtime catalog is configured
- [ ] Support provider-level and model-level pricing override fields
- [ ] Keep unknown-model conservative defaults as final fallback

### 19.4 Capability/model integration

- [ ] Wire runtime model capability metadata into `cache/capabilities.ts`
- [ ] Preserve provider-specific safety rules (e.g., unsupported cache modes)
- [ ] Ensure runtime catalog cannot silently enable dangerous unsupported behavior
- [ ] Add capability merge tests and conflict-resolution tests

### 19.5 Baseline refresh (hardcoded snapshot: 2026-02-09)

- [ ] Update OpenAI hardcoded model/pricing baseline (include GPT-5 family and current active snapshots)
- [ ] Update Anthropic hardcoded model/pricing baseline (Claude 4.5 family + active legacy lines)
- [ ] Update Gemini hardcoded fallback baseline aligned with docs snapshot
- [ ] Mark each baseline with `asOfDate: '2026-02-09'`
- [ ] Remove stale/deprecated entries where appropriate (or mark explicitly as deprecated)

### 19.6 Tooling for repeatable updates

- [ ] Add internal script to generate/normalize baseline catalog from curated source input
- [ ] Add deterministic JSON output for review in PRs
- [ ] Document manual refresh workflow (who/when/how)
- [ ] Add CI check to prevent malformed baseline data

### 19.7 Documentation and adoption

- [ ] Update `packages/ai-sdk/README.md` with runtime catalog usage examples
- [ ] Update `docs/reference/cost-estimation.md` with override precedence and fallback semantics
- [ ] Update `docs/reference/caching.md` with runtime capability override rules
- [ ] Update integration docs with env-based runtime catalog example

### 19.8 Release and validation

- [ ] Add changeset for `@mullion/ai-sdk` (minor)
- [ ] Run `build`, `lint`, `typecheck`, and `test` for affected workspaces
- [ ] Run integration suites (where keys are available)
- [ ] Include migration notes for consumers relying on previous hardcoded-only behavior

## Success Criteria

- [ ] End users can load a runtime catalog JSON without publishing a new SDK version
- [ ] Invalid catalog input does not break inference/cost APIs (safe fallback works)
- [ ] `getPricing()` and `getPricingByProvider()` reflect runtime overrides when present
- [ ] `getCacheCapabilities()` can consume validated runtime capability metadata
- [ ] Hardcoded baseline reflects provider state pinned to **2026-02-09**
- [ ] GPT-5 family is present in baseline OpenAI mappings
- [ ] Documentation clearly explains update flow for end users

## Proposed user-facing API (draft)

```ts
import {
  loadModelCatalog,
  setModelCatalogOverrides,
  clearModelCatalogOverrides,
} from '@mullion/ai-sdk';

await loadModelCatalog({
  url: process.env.MULLION_MODEL_CATALOG_URL,
  ttlMs: 6 * 60 * 60 * 1000,
});
```

## Open Questions

1. Should the default runtime source be opt-in only (recommended) or have a package-level default URL?
2. Do we want signature verification for remote catalog payloads in v1 (for tamper resistance)?
3. Should model deprecations be exposed as warnings in API responses/utilities?

## Sources to pin during implementation (official)

- OpenAI models: `platform.openai.com/docs/models`
- OpenAI pricing: `platform.openai.com/pricing` and `openai.com/api/pricing`
- Anthropic models/pricing: `platform.claude.com/docs/.../models/overview`, `.../pricing`
- Gemini models/pricing: `ai.google.dev/gemini-api/docs/models`, `ai.google.dev/gemini-api/docs/pricing`

---

**Last Updated:** 2026-02-09
