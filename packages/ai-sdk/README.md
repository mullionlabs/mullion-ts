# @scopestack/ai-sdk

> ScopeStack integration with Vercel AI SDK for type-safe LLM context management

## Installation

```bash
npm install @scopestack/ai-sdk ai zod
```

## Overview

This package provides a seamless integration between ScopeStack and the Vercel AI SDK, enabling type-safe context management for LLM operations with automatic confidence tracking.

## Quick Start

### Basic Usage

```typescript
import { createScopeStackClient } from '@scopestack/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Create a client with your preferred model
const client = createScopeStackClient(openai('gpt-4'));

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

Works with all Vercel AI SDK providers:

### OpenAI

```typescript
import { openai } from '@ai-sdk/openai';

const client = createScopeStackClient(openai('gpt-4'));
// or
const client = createScopeStackClient(openai('gpt-3.5-turbo'));
```

### Anthropic

```typescript
import { anthropic } from '@ai-sdk/anthropic';

const client = createScopeStackClient(anthropic('claude-3-5-sonnet-20241022'));
```

### Google

```typescript
import { google } from '@ai-sdk/google';

const client = createScopeStackClient(google('gemini-1.5-pro'));
```

### Custom Providers

```typescript
import { createOpenAI } from '@ai-sdk/openai';

const customProvider = createOpenAI({
  apiKey: process.env.CUSTOM_API_KEY,
  baseURL: 'https://your-custom-endpoint.com/v1',
});

const client = createScopeStackClient(customProvider('your-model'));
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

## Advanced Examples

### Error Handling with Confidence

```typescript
async function processWithConfidence<T>(
  ctx: Context<string>,
  schema: z.ZodType<T>,
  input: string,
  minConfidence = 0.8
): Promise<T> {
  const result = await ctx.infer(schema, input);

  if (result.confidence < minConfidence) {
    throw new Error(
      `Low confidence: ${result.confidence.toFixed(2)} < ${minConfidence}. ` +
        `Trace ID: ${result.traceId}`
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

### `createScopeStackClient(model)`

Creates a ScopeStack client with AI SDK integration.

**Parameters:**

- `model: LanguageModel` - Vercel AI SDK language model instance

**Returns:**

- `ScopeStackClient` - Client with `scope()` method

### `ScopeStackClient.scope<S, R>(name, fn)`

Creates a scoped execution context.

**Parameters:**

- `name: S` - Scope identifier (string literal)
- `fn: (ctx: Context<S>) => Promise<R>` - Scoped function

**Returns:**

- `Promise<R>` - Result of the scoped function

### `Context<S>.infer<T>(schema, input, options?)`

Infer structured data using the LLM.

**Parameters:**

- `schema: z.ZodType<T>` - Zod schema for validation
- `input: string` - Input text to analyze
- `options?: InferOptions` - Optional generation parameters

**Returns:**

- `Promise<Owned<T, S>>` - Scoped result with confidence

### `Context<S>.bridge<T, OS>(owned)`

Transfer value from another scope.

**Parameters:**

- `owned: Owned<T, OS>` - Value from source scope

**Returns:**

- `Owned<T, S | OS>` - Value tagged with union scope

### `Context<S>.use<T>(owned)`

Extract raw value (scope-safe).

**Parameters:**

- `owned: Owned<T, S>` - Value from same scope

**Returns:**

- `T` - Raw value

**Throws:**

- `Error` - If scope mismatch detected

## Integration with ESLint

Use with `eslint-plugin-scopestack` for compile-time leak detection:

```bash
npm install eslint-plugin-scopestack --save-dev
```

```javascript
// eslint.config.js
import scopestack from 'eslint-plugin-scopestack';

export default [
  {
    plugins: { scopestack },
    rules: {
      'scopestack/no-context-leak': 'error',
      'scopestack/require-confidence-check': 'warn',
    },
  },
];
```

## Examples

See the [examples directory](../../examples/) for complete implementations:

- [Basic Example](../../examples/basic/) - Core concepts demonstration
- Integration test instructions in [INTEGRATION_TEST_INSTRUCTIONS.md](../../INTEGRATION_TEST_INSTRUCTIONS.md)

## License

MIT - see [LICENSE](../../LICENSE) for details.
