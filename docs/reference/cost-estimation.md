# Cost Estimation

Mullion provides cost estimation and post-call cost tracking for OpenAI, Anthropic, and Gemini workflows.

## Overview

Cost features:

- Pre-call estimation with `ctx.estimateNextCallCost()`
- Post-call tracking with `ctx.getLastCallCost()`
- Model pricing lookup with `getPricing()` / `getPricingByProvider()`
- Cache-aware cost calculation (`calculateCost()`)
- Token estimation helpers (`estimateTokens()`, `estimateTokensForSegments()`)

## Quick Start

```typescript
import {createMullionClient} from '@mullion/ai-sdk';
import {createOpenAI} from '@ai-sdk/openai';

const provider = createOpenAI({apiKey: process.env.OPENAI_API_KEY});
const modelId = 'gpt-4o-mini';

const client = createMullionClient(provider(modelId), {
  provider: 'openai',
  model: modelId,
});

await client.scope('cost-demo', async (ctx) => {
  const prompt = 'Classify this support ticket and return a short summary.';

  const estimate = ctx.estimateNextCallCost(prompt, 250);
  console.log(`Estimated total: $${estimate.totalCost.toFixed(4)}`);

  // ... call ctx.infer(schema, prompt)

  const actual = ctx.getLastCallCost();
  if (actual) {
    console.log(`Actual total: $${actual.totalCost.toFixed(4)}`);
    console.log(`Savings: ${actual.savingsPercent.toFixed(1)}%`);
  }
});
```

## Token Estimation

```typescript
import {estimateTokens, estimateTokensForSegments} from '@mullion/ai-sdk';

const single = estimateTokens('Hello world', 'gemini-2.5-flash');
console.log(single);
// { count: 3, method: 'approximate', model: 'gemini-2.5-flash' }

const combined = estimateTokensForSegments(
  ['System instruction', 'User request', 'Cached reference doc'],
  'claude-3-5-sonnet-20241022',
);
console.log(combined.count);
```

Provider strategy:

- OpenAI: approximation (tiktoken-compatible path reserved for future)
- Anthropic: approximation
- Gemini: approximation
- Unknown models: conservative generic approximation

## Pricing API

### Get pricing for one model

```typescript
import {getPricing} from '@mullion/ai-sdk';

const pricing = getPricing('gemini-2.5-pro');
console.log(pricing);
// {
//   model: 'gemini-2.5-pro',
//   provider: 'google',
//   inputPer1M: 1.25,
//   outputPer1M: 10,
//   cachedInputPer1M: 0.125,
//   cacheWritePer1M: 1.25,
//   asOfDate: '2026-02-01'
// }
```

### Get pricing by provider

```typescript
import {getPricingByProvider} from '@mullion/ai-sdk';

const openai = getPricingByProvider('openai');
const anthropic = getPricingByProvider('anthropic');
const google = getPricingByProvider('google');
```

### Baseline Gemini pricing coverage

Pricing includes baseline entries for:

- `gemini-3-pro-preview`
- `gemini-3-flash-preview`
- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.0-flash`

`asOfDate` for these entries is `2026-02-01`.

## Cost Calculation Utilities

### Calculate from exact usage

```typescript
import {calculateCost} from '@mullion/ai-sdk';

const breakdown = calculateCost(
  {
    inputTokens: 4000,
    outputTokens: 500,
  },
  {
    provider: 'anthropic',
    inputTokens: 4000,
    outputTokens: 500,
    cacheWriteTokens: 1000,
    cacheReadTokens: 2000,
    savedTokens: 2000,
    cacheHitRate: 0.5,
    estimatedSavingsUsd: 0.006,
  },
  'claude-3-5-sonnet-20241022',
);

console.log(breakdown.totalCost, breakdown.savingsPercent);
```

### Estimate without making API call

```typescript
import {estimateCost} from '@mullion/ai-sdk';

const estimate = estimateCost(3000, 300, 'gpt-4o-mini', true);
console.log(estimate.totalCost);
```

### Compare estimate vs actual

```typescript
import {compareCosts} from '@mullion/ai-sdk';

const diff = compareCosts(actualCost, estimatedCost);
console.log(diff);
// { difference, differencePercent, accuracyPercent, underestimated }
```

## Notes

- `estimateNextCallCost()` requires `model` in `createMullionClient(..., { model })`.
- Pricing for unknown models falls back to conservative defaults.
- Gemini cache savings depend on `cachedContentTokenCount` in provider metadata.
