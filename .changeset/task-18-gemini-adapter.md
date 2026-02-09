---
'@mullion/ai-sdk': minor
---

Add first-class Gemini adapter support in `@mullion/ai-sdk`.

### Included

- Add `createGeminiAdapter(model)` and Gemini-specific cache types.
- Implement Google/Gemini cache capabilities in provider matrix.
- Parse Gemini cache metrics from `providerMetadata.google.usageMetadata`.
- Add Gemini provider detection in token estimation and baseline Google pricing entries.
- Add dynamic Gemini model discovery helpers backed by `models.list`.
- Export Gemini adapter and metrics APIs from root and cache entrypoints.
- Add Gemini integration test scaffold and env/docs updates in `tests/integration`.

### Migration notes

- Existing OpenAI/Anthropic behavior is unchanged.
- For Gemini cache hits, pass a pre-created cached context id using:
  `providerOptions: { google: { cachedContent: 'cachedContents/...' } }`.
- If `cachedContent` is missing or model cache is unsupported, Mullion falls back to a normal uncached provider call.
