# AI SDK Integration Tests

This guide covers real-provider integration tests in `tests/integration`.

These tests call live provider APIs and may incur charges.

## Providers Covered

- OpenAI
- Anthropic
- Gemini (Google Generative Language API)

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- API key for at least one provider

From repo root:

```bash
pnpm install
pnpm build
```

## Environment Setup

```bash
cp tests/integration/.env.example tests/integration/.env
```

Set any keys you want to test:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`

Optional model overrides:

- `OPENAI_MODEL`
- `ANTHROPIC_MODEL`
- `GEMINI_MODEL`

Optional Anthropic toggles:

- `ANTHROPIC_ENABLE_SONNET`
- `ANTHROPIC_SONNET_MODELS`
- `ANTHROPIC_CACHE_MIN_TOKENS`
- `ANTHROPIC_CACHE_DOC_SECTIONS`
- `ANTHROPIC_CACHE_STRICT`

## Running Tests

All integration tests:

```bash
pnpm --filter integration-tests test
```

Provider-specific suites:

```bash
pnpm --filter integration-tests test:openai
pnpm --filter integration-tests test:anthropic
pnpm --filter integration-tests test:gemini
```

Run a single test file:

```bash
pnpm --filter integration-tests test -- src/gemini.test.ts
```

## Writing New Integration Tests

- Put files in `tests/integration/src/`.
- Keep prompts short and deterministic (`temperature: 0`).
- Use low-cost models by default.
- Gate provider tests by key availability:

```typescript
const itOpenAI = process.env.OPENAI_API_KEY ? it : it.skip;
const itAnthropic = process.env.ANTHROPIC_API_KEY ? it : it.skip;
const itGemini = process.env.GOOGLE_GENERATIVE_AI_API_KEY ? it : it.skip;
```

## CI

Integration tests run in `.github/workflows/integration-tests.yml` on manual dispatch and release tags.

Configure these repository secrets for full coverage:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
