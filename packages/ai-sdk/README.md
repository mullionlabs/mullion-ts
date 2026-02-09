<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/mullionlabs/mullion-ts/main/.github/images/logo-dark.png" />
    <img alt="Mullion" src="https://raw.githubusercontent.com/mullionlabs/mullion-ts/main/.github/images/logo-light.png" width="180" />
  </picture>

  <h1>@mullion/ai-sdk</h1>

  <p><strong>Vercel AI SDK integration with caching, cost tracking, and type safety</strong></p>

  <p>
    <a href="https://www.npmjs.com/package/@mullion/ai-sdk"><img alt="npm version" src="https://img.shields.io/npm/v/@mullion/ai-sdk?style=flat-square"></a>
    <a href="https://www.npmjs.com/package/@mullion/ai-sdk"><img alt="npm downloads" src="https://img.shields.io/npm/dm/@mullion/ai-sdk?style=flat-square"></a>
    <a href="https://github.com/mullionlabs/mullion-ts/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/github/license/mullionlabs/mullion-ts?style=flat-square"></a>
    <img alt="TypeScript 5+" src="https://img.shields.io/badge/TypeScript-5%2B-3178C6?style=flat-square&logo=typescript&logoColor=white">
  </p>
</div>

---

## Installation

```bash
npm install @mullion/ai-sdk ai zod
```

## Overview

This package provides a seamless integration between Mullion and the Vercel AI SDK, enabling type-safe context management for LLM operations with automatic confidence tracking, provider-aware caching, and cost estimation.

## Features

- ✅ **Type-safe contexts** - Full Mullion `Owned<T, S>` integration
- ✅ **Automatic confidence scoring** - Based on finish reasons
- ✅ **Provider-aware caching** - Anthropic/OpenAI/Gemini optimizations
- ✅ **Cost estimation & tracking** - Pre-call estimates and actual costs
- ✅ **Cache metrics** - Hit rates, savings calculation
- ✅ **Fork integration** - Warmup strategies, schema conflict detection
- ✅ **Safe-by-default caching** - Never cache user content without opt-in
- ✅ **TTL support** - `'5m'`, `'1h'` cache lifetimes
- ✅ **Provider adapters** - OpenAI, Anthropic, Gemini
- ✅ **Runtime model catalog** - Override model pricing/capabilities without SDK release

## Quick Start

### Basic Usage

```typescript
import {createMullionClient} from '@mullion/ai-sdk';
import {openai} from '@ai-sdk/openai';
import {z} from 'zod';

// Create a client with your preferred model
const client = createMullionClient(openai('gpt-4'));

// Define your data schema
const EmailSchema = z.object({
  intent: z.enum(['support', 'sales', 'billing', 'general']),
  urgency: z.enum(['low', 'medium', 'high']),
  entities: z.array(z.string()).describe('Key entities mentioned'),
});

// Scoped LLM operations
const analysis = await client.scope('email-intake', async (ctx) => {
  const result = await ctx.infer(EmailSchema, userEmail);

  // Automatic confidence checking
  if (result.confidence < 0.8) {
    throw new Error('Low confidence - needs human review');
  }

  return ctx.use(result);
});
```

### Multi-Scope Workflows

```typescript
// Process data across different security contexts
const result = await client.scope('admin', async (adminCtx) => {
  // Admin scope: access sensitive data
  const adminData = await adminCtx.infer(DataSchema, sensitiveInput);

  return await client.scope('user', async (userCtx) => {
    // User scope: safe for customer-facing operations
    const bridged = userCtx.bridge(adminData); // ✅ Explicit bridge
    const response = await userCtx.infer(ResponseSchema, bridged.value);

    return userCtx.use(response);
  });
});
```

## Supported Providers

Mullion is provider-agnostic, and the built-in adapter coverage is:

| Provider  | Client integration | Cache adapter      | Cache metrics | Pricing helpers |
| --------- | ------------------ | ------------------ | ------------- | --------------- |
| OpenAI    | ✅                 | ✅ (automatic)     | ✅            | ✅              |
| Anthropic | ✅                 | ✅ (explicit)      | ✅            | ✅              |
| Gemini    | ✅                 | ✅ (cachedContent) | ✅            | ✅              |

## Runtime Model Catalog

`@mullion/ai-sdk` now supports runtime model catalog overrides for pricing and cache capabilities.

- Use when providers add/rename models faster than package release cadence.
- Keep a pinned baseline in code (`asOfDate: 2026-02-09`) and overlay runtime JSON.
- Safe fallback: if loading fails, Mullion keeps baseline behavior.

### Load Catalog From URL

```typescript
import {loadModelCatalog} from '@mullion/ai-sdk';

const result = await loadModelCatalog({
  url: process.env.MULLION_MODEL_CATALOG_URL,
  ttlMs: 6 * 60 * 60 * 1000, // 6h cache
});

if (result.usedFallback) {
  console.warn('Catalog load failed, using baseline pricing/capabilities');
  console.warn(result.error?.message);
}
```

### Load Catalog From File or Inline JSON

```typescript
import {clearModelCatalogOverrides, loadModelCatalog} from '@mullion/ai-sdk';

await loadModelCatalog({
  filePath: './model-catalog.json',
  forceRefresh: true,
});

await loadModelCatalog({
  json: JSON.stringify({
    schemaVersion: 1,
    snapshotDate: '2026-02-09',
    generatedAt: '2026-02-09T00:00:00.000Z',
    sources: ['https://example.com/model-catalog.json'],
    pricing: {
      providers: {
        openai: {
          models: {
            'gpt-5': {
              inputPer1M: 1.1,
              outputPer1M: 8.8,
              asOfDate: '2026-02-09',
            },
          },
        },
      },
    },
  }),
});

clearModelCatalogOverrides(); // Back to hardcoded baseline only
```

### Override Precedence

Pricing precedence is:

1. Runtime catalog override
2. `getPricing(model, overrides)` user override
3. Built-in baseline snapshot

### Migration Notes (Hardcoded-Only Users)

- If you do nothing, behavior remains baseline-only (same API calls, no runtime setup required).
- `getPricing()` now resolves runtime catalog first when loaded.
- OpenAI/Anthropic/Gemini hardcoded baselines are refreshed to snapshot date `2026-02-09`.
- For strict deterministic pricing in production, pin your own catalog JSON and load it at startup.

### OpenAI

```typescript
import {openai} from '@ai-sdk/openai';

const client = createMullionClient(openai('gpt-4'));
// or
const client = createMullionClient(openai('gpt-3.5-turbo'));
```

### Anthropic

```typescript
import {anthropic} from '@ai-sdk/anthropic';

const client = createMullionClient(anthropic('claude-3-5-sonnet-20241022'));
```

### Google

```typescript
import {createGoogleGenerativeAI} from '@ai-sdk/google';

const provider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
const client = createMullionClient(provider('gemini-2.5-flash'), {
  provider: 'google',
  model: 'gemini-2.5-flash',
});
```

Discover active Gemini models dynamically (no hardcoded full list):

```typescript
import {listGeminiModelsCached} from '@mullion/ai-sdk';

const models = await listGeminiModelsCached({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
```

### Custom Providers

```typescript
import {createOpenAI} from '@ai-sdk/openai';

const customProvider = createOpenAI({
  apiKey: process.env.CUSTOM_API_KEY,
  baseURL: 'https://your-custom-endpoint.com/v1',
});

const client = createMullionClient(customProvider('your-model'));
```

## Features

### Automatic Confidence Scoring

Confidence is automatically extracted from LLM finish reasons:

```typescript
const result = await ctx.infer(schema, input);

// Confidence mapping:
// stop: 1.0          - Model completed naturally
// tool-calls: 0.95   - Model made tool calls
// length: 0.75       - Output truncated due to token limit
// content-filter: 0.6 - Content was filtered
// other: 0.5         - Unknown reason
// error: 0.3         - Error occurred

console.log(`Confidence: ${result.confidence}`);
```

### Schema Integration

Full Zod schema support with type inference:

```typescript
const ProductSchema = z.object({
  name: z.string().describe('Product name'),
  price: z.number().positive().describe('Price in USD'),
  category: z.enum(['electronics', 'clothing', 'books']),
  features: z.array(z.string()).optional(),
});

const product = await ctx.infer(ProductSchema, productDescription);
// product.value is fully typed as ProductSchema's inferred type
```

### Inference Options

Customize LLM behavior:

```typescript
const result = await ctx.infer(schema, input, {
  temperature: 0.7,
  maxTokens: 500,
  systemPrompt: 'You are a helpful assistant specialized in data extraction.',
});
```

## Caching

Provider-aware caching with safe-by-default behavior and automatic optimization.

### Basic Caching

```typescript
const result = await client.scope('analysis', async (ctx) => {
  // Add cacheable content
  ctx.cache.system('You are an expert data analyst.');
  ctx.cache.segment('domain-docs', largeDocument, {
    ttl: '5m', // Time-to-live: '5m' | '1h'
    scope: 'developer-content',
  });

  // This inference benefits from caching on repeat calls
  const analysis = await ctx.infer(AnalysisSchema, 'Analyze this data');

  // Check cache performance
  const stats = await ctx.getCacheStats();
  console.log(`Cache hits: ${stats.cacheReadTokens} tokens`);
  console.log(`Saved: $${stats.estimatedSavingsUsd.toFixed(4)}`);

  return ctx.use(analysis);
});
```

### Cache Segments API

```typescript
// System prompts (always safe to cache)
ctx.cache.system('You are a helpful assistant');

// Developer content (your content, safe to cache)
ctx.cache.segment('docs', documentation, {
  ttl: '1h',
  scope: 'developer-content',
});

// User content (requires explicit opt-in)
ctx.cache.segment('user-query', userQuery, {
  scope: 'allow-user-content', // ⚠️ Only if safe!
  ttl: '5m',
});
```

**Provider-Specific Features:**

| Provider  | Min Tokens | TTL Options | Auto-Cache         |
| --------- | ---------- | ----------- | ------------------ |
| Anthropic | 1024-4096  | 5m, 1h      | No (explicit)      |
| OpenAI    | 1024       | N/A         | Yes (automatic)    |
| Gemini    | 1024       | 5m, 1h      | No (cachedContent) |

**Learn more:** See [docs/reference/caching.md](../../docs/reference/caching.md)

## Cost Estimation

Track and predict LLM costs before and after API calls.

### Pre-Call Estimation

```typescript
const estimate = ctx.estimateNextCallCost(input, 300);
console.log(`Estimated cost: $${estimate.totalCost.toFixed(4)}`);
console.log(`Input cost: $${estimate.inputCost.toFixed(4)}`);
console.log(`Output cost: $${estimate.outputCost.toFixed(4)}`);

if (estimate.totalCost > 0.1) {
  console.warn('High cost operation!');
}
```

### Post-Call Tracking

```typescript
const result = await ctx.infer(schema, input);

const actual = await ctx.getLastCallCost();
console.log(`Actual cost: $${actual.totalCost.toFixed(4)}`);
console.log(`Savings: ${actual.savingsPercent.toFixed(1)}%`);

// Compare estimate vs actual
const diff = actual.totalCost - estimate.totalCost;
console.log(`Difference: $${diff.toFixed(4)}`);
```

### Token Estimation

```typescript
import {estimateTokens} from '@mullion/ai-sdk';

const estimate = estimateTokens(text, 'gpt-4');
console.log(`${estimate.count} tokens (${estimate.method})`);
```

### Pricing API

```typescript
import {getPricing, PRICING_DATA} from '@mullion/ai-sdk';

const pricing = getPricing('claude-3-5-sonnet-20241022');
console.log(`Input: $${pricing.inputPer1M}/1M tokens`);
console.log(`Output: $${pricing.outputPer1M}/1M tokens`);
console.log(`Cache write: $${pricing.cacheWritePer1M}/1M tokens`);
console.log(`Cache read: $${pricing.cachedInputPer1M}/1M tokens`);

// Custom pricing
PRICING_DATA['custom-model'] = {
  model: 'custom-model',
  provider: 'unknown',
  inputPer1M: 2.0,
  outputPer1M: 8.0,
  asOfDate: '2026-02-01',
};
```

**Learn more:** See [docs/reference/cost-estimation.md](../../docs/reference/cost-estimation.md)

## Fork/Merge Integration

Parallel execution with cache optimization and cost tracking.

### Warmup Strategies

```typescript
const result = await ctx.fork({
  branches: {
    model1: (c) => c.infer(schema, prompt),
    model2: (c) => c.infer(schema, prompt),
    model3: (c) => c.infer(schema, prompt),
  },
  strategy: 'cache-optimized',
  warmup: 'first-branch', // Prime cache with first branch
});

// Aggregate cache stats
const stats = await Promise.all(
  Object.values(result).map((r) => r.context.getCacheStats()),
);
```

### Schema Conflict Detection

```typescript
import {detectSchemaConflict} from '@mullion/ai-sdk';

const result = await ctx.fork({
  branches: {
    simple: (c) => c.infer(SimpleSchema, prompt),
    complex: (c) => c.infer(ComplexSchema, prompt), // Different schema!
  },
  onSchemaConflict: 'warn', // or 'error', 'ignore'
});
// Console warning: "Schema conflict detected - limited cache reuse"
```

**Best Practice:** Use unified schemas for fork branches:

```typescript
// ✅ GOOD: Same schema, full cache reuse
const UnifiedSchema = z.object({
  analysisA: SchemaA,
  analysisB: SchemaB,
});

const result = await ctx.fork({
  branches: {
    a: (c) => c.infer(UnifiedSchema, prompt),
    b: (c) => c.infer(UnifiedSchema, prompt),
  },
});
```

**Learn more:** See [docs/reference/fork.md](../../docs/reference/fork.md)

## Advanced Examples

### Error Handling with Confidence

```typescript
async function processWithConfidence<T>(
  ctx: Context<string>,
  schema: z.ZodType<T>,
  input: string,
  minConfidence = 0.8,
): Promise<T> {
  const result = await ctx.infer(schema, input);

  if (result.confidence < minConfidence) {
    throw new Error(
      `Low confidence: ${result.confidence.toFixed(2)} < ${minConfidence}. ` +
        `Trace ID: ${result.traceId}`,
    );
  }

  return ctx.use(result);
}
```

### Multi-Step Processing

```typescript
const analysis = await client.scope('analysis', async (ctx) => {
  // Step 1: Extract entities
  const entities = await ctx.infer(EntitiesSchema, rawText);

  // Step 2: Classify sentiment
  const sentiment = await ctx.infer(SentimentSchema, rawText);

  // Step 3: Combine results
  if (entities.confidence > 0.8 && sentiment.confidence > 0.8) {
    return {
      entities: ctx.use(entities),
      sentiment: ctx.use(sentiment),
    };
  } else {
    throw new Error('Insufficient confidence for analysis');
  }
});
```

### Bridging Complex Data

```typescript
const pipeline = await client.scope('ingestion', async (ingestCtx) => {
  const rawData = await ingestCtx.infer(RawSchema, input);

  return await client.scope('processing', async (processCtx) => {
    const bridged = processCtx.bridge(rawData);

    return await client.scope('output', async (outputCtx) => {
      const processed = outputCtx.bridge(bridged);
      const final = await outputCtx.infer(OutputSchema, processed.value);

      // final.__scope is 'ingestion' | 'processing' | 'output'
      return outputCtx.use(final);
    });
  });
});
```

## API Reference

### Client & Context

**`createMullionClient(model, options?)`**

- Creates Mullion client with AI SDK integration
- Returns: `MullionClient` with `scope()` method

**`MullionClient.scope<S, R>(name, fn)`**

- Creates scoped execution context
- Returns: `Promise<R>`

**`Context<S>.infer<T>(schema, input, options?)`**

- Infer structured data using LLM
- Returns: `Promise<Owned<T, S>>`

**`Context<S>.bridge<T, OS>(owned)`**

- Transfer value from another scope
- Returns: `Owned<T, S | OS>`

**`Context<S>.use<T>(owned)`**

- Extract raw value (scope-safe)
- Returns: `T`

### Caching

**Context Methods:**

- `ctx.cache.system(content, options?)` - Add system prompt segment
- `ctx.cache.segment(key, content, options?)` - Add explicit cache segment
- `ctx.getCacheStats()` - Get cache performance metrics

**Utilities:**

- `getCacheCapabilities(provider, model)` - Get provider cache capabilities
- `supportsCacheFeature(provider, model, feature)` - Check feature support
- `isValidTtl(provider, model, ttl)` - Validate TTL for provider/model
- `validateTtlOrdering(segments)` - Validate TTL ordering
- `createAnthropicAdapter(model)` - Create Anthropic adapter
- `createOpenAIAdapter(model)` - Create OpenAI adapter
- `createGeminiAdapter(model)` - Create Gemini adapter
- `createCacheSegmentManager(provider, model, config)` - Create cache manager
- `parseAnthropicMetrics(usage, provider, model)` - Parse Anthropic metrics
- `parseOpenAIMetrics(usage, provider, model)` - Parse OpenAI metrics
- `parseGoogleMetrics(usage, provider, model)` - Parse Gemini metrics
- `aggregateCacheMetrics(stats)` - Aggregate metrics
- `estimateCacheSavings(contentTokens, requestCount, provider, model)` - Estimate savings

**Types:**

- `CacheSegmentManager`, `CacheSegment`, `CacheConfig`
- `CacheStats`, `CacheCapabilities`, `CacheScope`, `CacheTTL`

### Cost Estimation

**Context Methods:**

- `ctx.estimateNextCallCost(prompt, estimatedOutputTokens?)` - Estimate before call
- `ctx.getLastCallCost()` - Get actual cost after call

**Token Estimation:**

- `estimateTokens(text, model?)` - Estimate token count
- `estimateTokensForSegments(segments, model)` - Estimate for segments

**Pricing:**

- `getPricing(model)` - Get pricing for model
- `getAllPricing()` - Get all pricing data
- `getPricingByProvider(provider)` - Get provider pricing
- `PRICING_DATA` - Global pricing object
- `exportPricingAsJSON()` - Export pricing
- `importPricingFromJSON(data)` - Import pricing

**Cost Calculation:**

- `calculateCost(params)` - Calculate cost from usage
- `estimateCost(params)` - Estimate cost
- `calculateBatchCost(calls)` - Calculate batch costs
- `formatCostBreakdown(cost)` - Format for display
- `compareCosts(estimated, actual)` - Compare costs

**Types:**

- `TokenEstimate`, `ModelPricing`, `CostBreakdown`, `TokenUsage`

### Fork/Merge Integration

**Warmup:**

- `explicitWarmup(config)` - Explicit cache warmup
- `firstBranchWarmup(branches)` - First-branch warmup
- `createWarmupExecutor(config)` - Create warmup executor
- `setupWarmupExecutor(config)` - Setup global executor
- `estimateWarmupCost(config)` - Estimate warmup cost
- `shouldWarmup(estimate)` - Warmup recommendation

**Schema Conflicts:**

- `computeSchemaSignature(schema)` - Compute schema hash
- `detectSchemaConflict(branches, options)` - Detect conflicts
- `handleSchemaConflict(conflict, behavior)` - Handle conflict
- `areSchemasCompatible(schemaA, schemaB)` - Check compatibility
- `describeSchemasDifference(schemaA, schemaB)` - Describe diff

**Types:**

- `WarmupConfig`, `WarmupResult`, `SchemaInfo`
- `DetectSchemaConflictOptions`, `DetailedSchemaConflictResult`

### Confidence Scoring

- `extractConfidenceFromFinishReason(reason)` - Extract confidence

**Confidence Mapping:**

- `stop`: 1.0 - Model completed naturally
- `tool-calls`: 0.95 - Model made tool calls
- `length`: 0.75 - Truncated by token limit
- `content-filter`: 0.6 - Content filtered
- `other`: 0.5 - Unknown reason
- `error`: 0.3 - Error occurred

## Related Packages

- [@mullion/core](../core) - Core types, fork/merge, tracing
- [@mullion/eslint-plugin](../eslint-plugin) - Static analysis

## Documentation

- [Caching Guide](../../docs/reference/caching.md) - Complete caching documentation
- [Cost Estimation](../../docs/reference/cost-estimation.md) - Cost tracking guide
- [Fork API](../../docs/reference/fork.md) - Parallel execution guide
- [Examples](../../examples/) - Working examples

## Integration with ESLint

Use with `@mullion/eslint-plugin` for compile-time leak detection:

```bash
npm install @mullion/eslint-plugin --save-dev
```

```javascript
// eslint.config.js
import mullion from '@mullion/eslint-plugin';

export default [
  {
    plugins: {'@mullion': mullion},
    rules: {
      '@mullion/no-context-leak': 'error',
      '@mullion/require-confidence-check': 'warn',
    },
  },
];
```

## Examples

See the [examples directory](../../examples/) for complete implementations:

- [Basic Example](../../examples/basic/) - Core concepts demonstration
- Integration test instructions in [docs/contributing/integration-tests.md](../../docs/contributing/integration-tests.md)

## Contributing

Found a bug or want to contribute? See [CONTRIBUTING.md](../../docs/contributing/CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](../../LICENSE) for details.
