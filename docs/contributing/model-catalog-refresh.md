# Model Catalog Refresh Workflow

This guide describes how to refresh the runtime model catalog snapshot used by `@mullion/ai-sdk`.

## Files

- Curated source input: `packages/ai-sdk/catalog/model-catalog.source.json`
- Deterministic normalized output: `packages/ai-sdk/catalog/model-catalog.baseline.json`
- Normalization script: `packages/ai-sdk/scripts/normalize-model-catalog.mjs`

## Refresh Steps

1. Update `packages/ai-sdk/catalog/model-catalog.source.json`.
2. Set new `snapshotDate`, `generatedAt`, model pricing, and capability entries.
3. Keep `sources` pinned to official provider docs/pricing URLs.
4. Run:

```bash
pnpm --filter @mullion/ai-sdk catalog:normalize
```

5. Verify baseline is in sync:

```bash
pnpm --filter @mullion/ai-sdk catalog:check
```

6. Run validation:

```bash
pnpm --filter @mullion/ai-sdk lint
pnpm --filter @mullion/ai-sdk typecheck
pnpm --filter @mullion/ai-sdk test
```

## CI Safety Gate

`catalog:check` is executed as part of `@mullion/ai-sdk` lint script. If `model-catalog.baseline.json` is stale or malformed, lint fails.

## Notes

- Runtime catalog overrides are optional for consumers.
- When runtime catalog loading fails, Mullion falls back to hardcoded baseline data.
- Keep baseline `asOfDate` values aligned with the same pinned snapshot date.
