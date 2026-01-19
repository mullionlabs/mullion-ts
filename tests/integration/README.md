# Integration Tests

Real-provider integration tests for Mullion packages using OpenAI and Anthropic.
These tests call live APIs and cost money per run.

## Requirements

- Node.js >= 20
- pnpm >= 9
- OpenAI and/or Anthropic API keys

## Setup

From the repo root:

```bash
pnpm install
pnpm build
```

Create a local env file:

```bash
cp tests/integration/.env.example tests/integration/.env
```

Fill in the API keys inside `tests/integration/.env`:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

Optional:

- `ANTHROPIC_ENABLE_SONNET=true` to enable Sonnet model tests.
- `OPENAI_MODEL` to override the OpenAI test model.
- `OPENAI_INVALID_MODEL` to override the invalid OpenAI model.
- `ANTHROPIC_MODEL` to override the Anthropic test model.
- `ANTHROPIC_SONNET_MODELS` (comma-separated list) for Sonnet tests.
- `ANTHROPIC_CACHE_MIN_TOKENS` to override cache token threshold.
- `ANTHROPIC_CACHE_DOC_SECTIONS` to override cached document size.
- `ANTHROPIC_CACHE_STRICT=true` to require cache metrics (fail if missing).

## Run Tests

Vitest loads `.env` entries with `OPENAI_` and `ANTHROPIC_`.

```bash
pnpm --filter integration-tests test
```

Run a single file:

```bash
pnpm --filter integration-tests test -- src/openai.test.ts
```

Run provider-specific suites:

```bash
pnpm --filter integration-tests test:openai
pnpm --filter integration-tests test:anthropic
```

## Adding New Tests

- Add a new file in `tests/integration/src/` named `<feature>.test.ts`.
- Use the cheapest models and small prompts (`gpt-4o-mini`, `claude-3-5-haiku-20241022`).
- Keep `temperature: 0` for determinism and avoid high `maxTokens`.
- Guard real-provider tests so they skip without keys:

```ts
const itOpenAI = process.env.OPENAI_API_KEY ? it : it.skip;
const itAnthropic = process.env.ANTHROPIC_API_KEY ? it : it.skip;
```

## CI

CI runs only on manual dispatch or version tags:
`.github/workflows/integration-tests.yml`.
Secrets required: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.
