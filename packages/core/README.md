# @mullion/core

> Core types and utilities for type-safe LLM context management

## Installation

```bash
npm install @mullion/core
```

## Overview

The core package provides fundamental types and utilities for Mullion's type-safe context management system. Use this package if you want to build custom integrations or don't need the Vercel AI SDK wrapper.

## Key Types

### `Owned<T, S>`

Wraps LLM-generated values with scope tracking and metadata:

```typescript
import type { Owned } from '@mullion/core';

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
import type { Context } from '@mullion/core';

interface Context<S extends string> {
  readonly scope: S;

  // Infer structured data from unstructured input
  infer<T>(
    schema: Schema<T>,
    input: string,
    options?: InferOptions
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
import { createOwned } from '@mullion/core';

const data = createOwned({
  value: { name: 'John', age: 30 },
  scope: 'user-data',
  confidence: 0.95,
  traceId: 'trace-123',
});

console.log(data.__scope); // 'user-data'
```

### `isOwned()`

Type guard for checking if a value is Owned:

```typescript
import { isOwned } from '@mullion/core';

if (isOwned(someValue)) {
  // TypeScript knows someValue is Owned<unknown, string>
  console.log(someValue.confidence);
}
```

## Example: Custom Integration

```typescript
import { createOwned, isOwned } from '@mullion/core';
import type { Context, Owned } from '@mullion/core';

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

## Tracing & Observability

Mullion includes production-ready OpenTelemetry-compatible tracing for LLM workflow observability.

### Quick Start

```typescript
import { TracingPresets } from '@mullion/core';

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
import { getGlobalTraceCollector, setupMullionTracing } from '@mullion/core';

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
  await collector.endSpan(spanCtx, { status: 'ok' });
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

- `Owned<T, S>` - Scoped value wrapper
- `Context<S>` - Execution context interface
- `Schema<T>` - Schema interface (usually Zod)
- `InferOptions` - Options for inference operations

### Tracing Types

- `MullionSpan` - OpenTelemetry-compatible span
- `SpanContext` - Active span context
- `SpanExporter` - Exporter interface
- `MullionAttributes` - Span attributes

### Core Functions

- `createOwned(params)` - Create Owned value
- `isOwned(value)` - Type guard for Owned values

### Tracing Functions

- `setupMullionTracing(options)` - One-liner tracing setup
- `TracingPresets.jaeger()` - Jaeger preset
- `TracingPresets.honeycomb(apiKey)` - Honeycomb preset
- `TracingPresets.datadog(apiKey)` - Datadog preset
- `TracingPresets.newRelic(key)` - New Relic preset
- `TracingPresets.grafana(instanceId, apiKey)` - Grafana preset
- `getGlobalTraceCollector()` - Get global collector
- `disableMullionTracing()` - Graceful shutdown

### Tracing Classes

- `TraceCollector` - Span collection and export
- `OTLPHttpExporter` - OTLP/HTTP exporter

## License

MIT - see [LICENSE](../../LICENSE) for details.
