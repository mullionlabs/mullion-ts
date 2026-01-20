<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/mullionlabs/mullion-ts/main/.github/images/logo-dark.png" />
    <img alt="Mullion" src="https://raw.githubusercontent.com/mullionlabs/mullion-ts/main/.github/images/logo-light.png" width="180" />
  </picture>

  <h1>@mullion/core</h1>

  <p><strong>Core types and utilities for type-safe LLM context management</strong></p>

  <p>
    <a href="https://www.npmjs.com/package/@mullion/core"><img alt="npm version" src="https://img.shields.io/npm/v/@mullion/core?style=flat-square"></a>
    <a href="https://www.npmjs.com/package/@mullion/core"><img alt="npm downloads" src="https://img.shields.io/npm/dm/@mullion/core?style=flat-square"></a>
    <a href="https://github.com/mullionlabs/mullion-ts/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/github/license/mullionlabs/mullion-ts?style=flat-square"></a>
    <img alt="TypeScript 5+" src="https://img.shields.io/badge/TypeScript-5%2B-3178C6?style=flat-square&logo=typescript&logoColor=white">
  </p>
</div>

---

## Live Demos

Try Mullion in action (requires Google sign-in, 20 requests/day):

- 🎫 **[Helpdesk Demo](https://mullion-demo-helpdesk.vercel.app)** — Scope isolation preventing internal notes from leaking to customers
- 📚 **[RAG Demo](https://mullion-demo-rag.vercel.app)** — Fork/merge patterns with role-based access control

---

## Installation

```bash
npm install @mullion/core
```

## Project Generator

Scaffold a full Nuxt app with Mullion pre-wired:

```bash
npm create mullion@latest
```

Note: create-mullion currently scaffolds Nuxt templates only. Next.js support is planned.

See: https://github.com/mullionlabs/mullion-ts/tree/main/packages/create-mullion

## Overview

The core package provides fundamental types and utilities for Mullion's type-safe context management system. Use this package if you want to build custom integrations or don't need the Vercel AI SDK wrapper.

## Features

- ✅ **Type-safe contexts** - `Owned<T, S>` with compile-time scope tracking
- ✅ **Semantic values** - Extended outputs with alternatives and reasoning
- ✅ **Explicit bridging** - Traceable data flow across trust boundaries
- ✅ **Fork/merge system** - Parallel execution with type-safe aggregation
- ✅ **6 merge strategies** - Categorical, continuous, object, array, custom, consensus
- ✅ **OpenTelemetry tracing** - Zero-dependency OTLP exporter with presets
- ✅ **Bridge utilities** - Advanced provenance tracking and metadata
- ✅ **Zero runtime overhead** - Compile-time safety without runtime cost

## Key Types

### `Owned<T, S>`

Wraps LLM-generated values with scope tracking and metadata:

```typescript
import type {Owned} from '@mullion/core';

interface Owned<T, S extends string> {
  value: T; // The actual data
  confidence: number; // 0-1 confidence score
  __scope: S; // Compile-time scope tracking
  traceId: string; // Unique identifier for audit trails
}
```

### `Context<S>`

Provides scoped execution environment for LLM operations:

```typescript
import type {Context} from '@mullion/core';

interface Context<S extends string> {
  readonly scope: S;

  // Infer structured data from unstructured input
  infer<T>(
    schema: Schema<T>,
    input: string,
    options?: InferOptions,
  ): Promise<Owned<T, S>>;

  // Transfer value from another scope
  bridge<T, OS extends string>(owned: Owned<T, OS>): Owned<T, S | OS>;

  // Extract raw value (scope-safe)
  use<T>(owned: Owned<T, S>): T;
}
```

## Utilities

### `createOwned()`

Factory function for creating Owned values:

```typescript
import {createOwned} from '@mullion/core';

const data = createOwned({
  value: {name: 'John', age: 30},
  scope: 'user-data',
  confidence: 0.95,
  traceId: 'trace-123',
});

console.log(data.__scope); // 'user-data'
```

### `isOwned()`

Type guard for checking if a value is Owned:

```typescript
import {isOwned} from '@mullion/core';

if (isOwned(someValue)) {
  // TypeScript knows someValue is Owned<unknown, string>
  console.log(someValue.confidence);
}
```

## Example: Custom Integration

```typescript
import {createOwned, isOwned} from '@mullion/core';
import type {Context, Owned} from '@mullion/core';

// Create a custom context implementation
class MyContext<S extends string> implements Context<S> {
  constructor(public readonly scope: S) {}

  async infer<T>(schema: any, input: string): Promise<Owned<T, S>> {
    // Your custom LLM integration here
    const result = await myLLM.generate(schema, input);

    return createOwned({
      value: result.data,
      scope: this.scope,
      confidence: result.confidence,
      traceId: `${this.scope}-${Date.now()}`,
    });
  }

  bridge<T, OS extends string>(owned: Owned<T, OS>): Owned<T, S | OS> {
    return {
      ...owned,
      __scope: this.scope as S | OS,
    };
  }

  use<T>(owned: Owned<T, S>): T {
    if (owned.__scope !== this.scope) {
      throw new Error(`Scope mismatch: ${owned.__scope} !== ${this.scope}`);
    }
    return owned.value;
  }
}

// Usage
const ctx = new MyContext('my-scope');
const result = await ctx.infer(schema, 'analyze this text');

if (result.confidence > 0.8) {
  console.log('High confidence result:', ctx.use(result));
}
```

## SemanticValue

`SemanticValue<T, S>` extends `Owned<T, S>` with additional fields for LLM reasoning:

```typescript
import {createSemanticValue} from '@mullion/core';
import type {SemanticValue, Alternative} from '@mullion/core';

const analysis: SemanticValue<Classification, 'analysis'> = createSemanticValue(
  {
    value: {category: 'technical', priority: 'high'},
    scope: 'analysis',
    confidence: 0.85,
    traceId: 'trace-456',
    reasoning: 'Based on technical keywords and urgency indicators',
    alternatives: [
      {value: {category: 'support', priority: 'high'}, confidence: 0.75},
      {
        value: {category: 'technical', priority: 'medium'},
        confidence: 0.65,
      },
    ],
  },
);

// Access reasoning chain
console.log(analysis.reasoning);
// "Based on technical keywords and urgency indicators"

// Explore alternatives
analysis.alternatives.forEach((alt, i) => {
  console.log(
    `Alternative ${i + 1}:`,
    alt.value,
    `(confidence: ${alt.confidence})`,
  );
});
```

**Use SemanticValue when:**

- You need to understand LLM's reasoning process
- Want to provide alternative interpretations to users
- Building systems that require explainability
- Implementing human-in-the-loop workflows with fallbacks

## Fork & Merge

Run multiple LLM inferences in parallel with intelligent cache optimization.

### Fork Strategies

```typescript
import {fork} from '@mullion/core';

// Fast parallel: All branches execute immediately
const result = await fork(ctx, {
  branches: {
    compliance: (c) => c.infer(ComplianceSchema, prompt),
    quality: (c) => c.infer(QualitySchema, prompt),
    tags: (c) => c.infer(TagsSchema, prompt),
  },
  strategy: 'fast-parallel',
});

// Cache optimized: Warm up cache first for cost savings
const result = await fork(ctx, {
  branches: {
    model1: (c) => c.infer(schema, prompt),
    model2: (c) => c.infer(schema, prompt),
    model3: (c) => c.infer(schema, prompt),
  },
  strategy: 'cache-optimized',
  warmup: 'first-branch',
});
```

### Merge Strategies

Aggregate parallel results with 6 built-in strategies:

```typescript
import {
  categorical,
  continuous,
  object,
  array,
  custom,
  requireConsensus
} from '@mullion/core';

// 1. Categorical weighted vote - for enums/categories
const merged = categorical.weightedVote(results, {
  tiebreaker: 'highest-confidence',
});

// 2. Continuous weighted average - for numbers
const merged = continuous.weightedAverage(results, {
  field: 'score',
  outlierThreshold: 2.0,
});

// 3. Object fieldwise - merge objects field-by-field
const merged = object.fieldwise(results, {
  fieldStrategies: {
    title: categorical.weightedVote(),
    score: continuous.weightedAverage(),
    tags: array.concat(),
  },
});

// 4. Array concatenation - combine arrays with deduplication
const merged = array.concat(results, {
  deduplicate: true,
  maxItems: 20,
});

// 5. Custom merge function - your own logic
const merged = custom((values) => ({
  value: /* your aggregation */,
  confidence: /* your calculation */,
  provenance: values.map(v => v.traceId),
}));

// 6. Require consensus - enforce k-of-n agreement
const merged = requireConsensus({
  k: 2, // Require 2 out of 3 agreement
  baseStrategy: categorical.weightedVote(),
  onFailure: 'error',
})(results);
```

**Learn more:** See [docs/reference/fork.md](../../docs/reference/fork.md) and [docs/reference/merge-strategies.md](../../docs/reference/merge-strategies.md)

## Bridge Utilities

Advanced bridging utilities for complex dataflow scenarios:

```typescript
import {
  bridgeMultiple,
  bridgeWithMetadata,
  getProvenance,
  isBridged,
} from '@mullion/core';

// Bridge multiple values at once
const [a, b, c] = bridgeMultiple(ctx, [valueA, valueB, valueC]);

// Add custom metadata to bridges
const bridged = bridgeWithMetadata(ctx, value, {
  reason: 'Approved for public display',
  reviewedBy: 'admin-123',
  approvedAt: new Date().toISOString(),
});

// Inspect provenance history
const history = getProvenance(bridged);
console.log(`Value crossed ${history.length} scope boundaries`);
history.forEach((hop, i) => {
  console.log(`Hop ${i + 1}: ${hop.fromScope} → ${hop.toScope}`);
  console.log(`  Reason: ${hop.metadata?.reason}`);
});

// Check if value has been bridged
if (isBridged(value)) {
  console.log('This value has crossed scope boundaries');
}
```

## Tracing & Observability

Mullion includes production-ready OpenTelemetry-compatible tracing for LLM workflow observability.

### Quick Start

```typescript
import {TracingPresets} from '@mullion/core';

// Enable tracing with one line
TracingPresets.jaeger(); // Local development

// Or for production
TracingPresets.honeycomb(process.env.HONEYCOMB_API_KEY!);
```

### Features

- ✅ Zero-dependency OTLP exporter
- ✅ One-liner setup for major backends (Jaeger, Honeycomb, Datadog, New Relic, Grafana)
- ✅ Mullion-specific attributes (scope, confidence, cost, cache metrics)
- ✅ Zero overhead by default (disabled until exporter attached)
- ✅ Full OpenTelemetry compatibility

### Manual Instrumentation

```typescript
import {getGlobalTraceCollector, setupMullionTracing} from '@mullion/core';

setupMullionTracing({
  endpoint: 'http://localhost:4318/v1/traces',
});

const collector = getGlobalTraceCollector();

const spanCtx = collector.startSpan({
  name: 'mullion.infer',
  kind: 'client',
  attributes: {
    'mullion.scope.id': 'admin',
    'mullion.operation': 'infer',
  },
});

try {
  // Your operation
  await performOperation();
  await collector.endSpan(spanCtx, {status: 'ok'});
} catch (error) {
  await collector.endSpan(spanCtx, {
    status: 'error',
    statusMessage: error.message,
  });
  throw error;
}
```

### Learn More

See [TRACING.md](./TRACING.md) for complete guide including:

- Production setup for all major backends
- Configuration options
- Mullion attribute schema
- Manual instrumentation patterns
- Performance tuning
- Troubleshooting

## API Reference

### Core Types

- `Owned<T, S>` - Scoped value wrapper with confidence and provenance
- `SemanticValue<T, S>` - Extended Owned with alternatives and reasoning
- `Alternative<T>` - Alternative interpretation with confidence
- `Context<S>` - Execution context interface
- `Schema<T>` - Schema interface (usually Zod)
- `InferOptions` - Options for inference operations
- `BridgeMetadata` - Custom metadata for bridge operations

### Fork/Merge Types

- `ForkStrategy` - Fork execution strategy (`'fast-parallel'` | `'cache-optimized'`)
- `WarmupStrategy` - Cache warmup strategy
- `ForkOptions` - Fork configuration options
- `ForkResult<T>` - Fork execution results
- `MergeStrategy` - Merge strategy type
- `MergeResult<T>` - Merged result with provenance
- `ConflictResolution` - How to handle merge conflicts

### Tracing Types

- `MullionSpan` - OpenTelemetry-compatible span
- `SpanContext` - Active span context
- `SpanExporter` - Exporter interface
- `MullionAttributes` - Span attributes
- `MullionOperation` - Operation types for tracing

### Core Functions

**Owned & SemanticValue:**

- `createOwned(params)` - Create Owned value
- `isOwned(value)` - Type guard for Owned values
- `createSemanticValue(params)` - Create SemanticValue
- `isSemanticValue(value)` - Type guard for SemanticValue

**Scope:**

- `scope(name, fn)` - Create scoped execution context

**Bridging:**

- `bridge(ctx, owned)` - Bridge value to new scope
- `bridgeSemantic(ctx, semantic)` - Bridge SemanticValue
- `bridgeMultiple(ctx, values)` - Bridge multiple values at once
- `bridgeWithMetadata(ctx, value, metadata)` - Bridge with custom metadata
- `getProvenance(value)` - Get provenance history
- `isBridged(value)` - Check if value has been bridged

**Fork & Merge:**

- `fork(ctx, options)` - Execute parallel branches
- `merge(results, strategy)` - Merge parallel results
- `mergeResults(results, strategy)` - Convenience wrapper for merge

**Merge Strategies:**

- `categorical.weightedVote(options?)` - Voting for categorical values
- `continuous.weightedAverage(options?)` - Weighted average for numbers
- `object.fieldwise(options)` - Per-field merging
- `array.concat(options?)` - Array concatenation with deduplication
- `custom(fn)` - Custom merge function
- `requireConsensus(options)` - Enforce k-of-n agreement

**Tracing:**

- `setupMullionTracing(options)` - One-liner tracing setup
- `TracingPresets.jaeger()` - Jaeger preset
- `TracingPresets.honeycomb(apiKey)` - Honeycomb preset
- `TracingPresets.datadog(apiKey)` - Datadog preset
- `TracingPresets.newRelic(key)` - New Relic preset
- `TracingPresets.grafana(instanceId, apiKey)` - Grafana preset
- `getGlobalTraceCollector()` - Get global collector
- `setGlobalTraceCollector(collector)` - Set global collector
- `clearGlobalTraceCollector()` - Clear global collector
- `disableMullionTracing()` - Graceful shutdown

### Classes

- `TraceCollector` - Span collection and export
- `OTLPHttpExporter` - OTLP/HTTP exporter

## Related Packages

- [@mullion/ai-sdk](../ai-sdk) - Vercel AI SDK integration with caching and cost tracking
- [@mullion/eslint-plugin](../eslint-plugin) - Static analysis for context leak prevention

## Documentation

- [Fork API](../../docs/reference/fork.md) - Parallel execution patterns
- [Merge Strategies](../../docs/reference/merge-strategies.md) - Result aggregation strategies
- [Tracing Guide](./TRACING.md) - Complete observability guide
- [Examples](../../examples/) - Working examples

## Contributing

Found a bug or want to contribute? See [CONTRIBUTING.md](../../docs/contributing/CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](../../LICENSE) for details.
