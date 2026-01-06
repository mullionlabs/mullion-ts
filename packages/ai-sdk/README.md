# @intentkit/ai-sdk

IntentKit integration with Vercel AI SDK.

## Overview

Thin wrapper around Vercel AI SDK that returns `Owned` values with scope tracking and confidence.

## Installation

```bash
pnpm add @intentkit/ai-sdk @intentkit/core
pnpm add @ai-sdk/openai  # or your preferred provider
```

## Quick Start

```typescript
import { createIntentClient } from '@intentkit/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Create client with provider
const client = createIntentClient(openai('gpt-4o'));

// Use scoped inference
const result = await client.scope('analysis', async (ctx) => {
  const sentiment = await ctx.infer(
    z.object({
      sentiment: z.enum(['positive', 'negative', 'neutral']),
      confidence: z.number(),
    }),
    'Analyze: "I love this product!"'
  );
  
  // sentiment: Owned<{ sentiment: string; confidence: number }, 'analysis'>
  console.log(sentiment.value);     // { sentiment: 'positive', confidence: 0.95 }
  console.log(sentiment.confidence); // 0.95
  console.log(sentiment.__scope);    // 'analysis'
  
  return sentiment;
});
```

## API Reference

### createIntentClient(provider)

Create an IntentKit-wrapped AI SDK client:

```typescript
import { createIntentClient } from '@intentkit/ai-sdk';
import { anthropic } from '@ai-sdk/anthropic';

const client = createIntentClient(anthropic('claude-sonnet-4-20250514'), {
  // Default confidence extraction method
  confidenceMethod: 'self-eval', // 'logprobs' | 'self-eval' | 'schema'
  
  // Caching strategy
  caching: {
    enabled: true,
    ttl: 300, // seconds
  },
});
```

### client.scope(name, fn)

Create a scoped execution context:

```typescript
const result = await client.scope('my-scope', async (ctx) => {
  // ctx: IntentContext<'my-scope'>
  return await ctx.infer(schema, input);
});
```

### ctx.infer(schema, input, options?)

Infer a value within the scope:

```typescript
const value = await ctx.infer(
  z.object({ ... }),
  'Your prompt here',
  {
    // Override confidence method for this call
    confidenceMethod: 'schema',
    
    // Number of samples for ensemble confidence
    samples: 3,
    
    // System prompt
    system: 'You are an analyst...',
  }
);
```

### ctx.bridge(owned)

Explicitly bridge a value from another scope:

```typescript
const adminData = await adminClient.scope('admin', async (ctx) => {
  return ctx.infer(schema, input);
});

await client.scope('customer', async (ctx) => {
  // Must explicitly bridge
  const bridged = ctx.bridge(adminData);
  // bridged: Owned<T, 'admin' | 'customer'>
});
```

## Confidence Extraction

IntentKit supports multiple methods for extracting confidence:

### Schema-based (recommended)

Include confidence in your schema:

```typescript
const schema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
});
```

### Self-evaluation

Ask the model to evaluate its own confidence:

```typescript
const client = createIntentClient(provider, {
  confidenceMethod: 'self-eval',
});
```

### Logprobs (provider-dependent)

Use token probabilities (when available):

```typescript
const client = createIntentClient(provider, {
  confidenceMethod: 'logprobs',
});
```

## Caching

IntentKit integrates with provider caching to reduce costs for `fork` operations:

```typescript
const client = createIntentClient(provider, {
  caching: {
    enabled: true,
    // Mark stable content as cacheable
    cacheableKeys: ['system', 'context'],
  },
});

await client.scope('analysis', async (ctx) => {
  // System prompt and context are cached
  // Only user message varies
  return ctx.infer(schema, userInput, {
    system: 'Long system prompt...', // Cached
    context: largeDocument,          // Cached
  });
});
```

## Error Handling

```typescript
import { IntentKitError, LowConfidenceError } from '@intentkit/ai-sdk';

try {
  const result = await ctx.infer(schema, input, {
    require_confidence: 0.8,
  });
} catch (error) {
  if (error instanceof LowConfidenceError) {
    console.log('Confidence too low:', error.confidence);
    console.log('Alternatives:', error.alternatives);
  }
}
```

## TypeScript Support

Full type inference is supported:

```typescript
const schema = z.object({
  category: z.enum(['A', 'B', 'C']),
  score: z.number(),
});

await client.scope('test', async (ctx) => {
  const result = await ctx.infer(schema, input);
  // result: Owned<{ category: 'A' | 'B' | 'C'; score: number }, 'test'>
  
  result.value.category; // Autocomplete: 'A' | 'B' | 'C'
  result.__scope;        // Type: 'test'
});
```

## Supported Providers

Any Vercel AI SDK provider works:

- `@ai-sdk/openai`
- `@ai-sdk/anthropic`
- `@ai-sdk/google`
- `@ai-sdk/mistral`
- `@ai-sdk/cohere`
- ... and more

## Development

```bash
# Build
pnpm build

# Test
pnpm test

# Test with real API (requires API key)
OPENAI_API_KEY=... pnpm test:integration
```

## Related Packages

- `@intentkit/core` — Core type definitions
- `eslint-plugin-intentkit` — ESLint rules
