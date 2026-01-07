# @scopestack/core

Core type definitions and utilities for ScopeStack.

## Overview

This package provides the foundational types for type-safe LLM context management:

- `Owned<T, S>` — Value with scope ownership
- `SemanticValue<T, S>` — Extended owned value with confidence, alternatives, reasoning
- `Context<S>` — Scoped execution context
- `scope()` — Create isolated execution scope
- `bridge()` — Safely cross scope boundaries

## Installation

```bash
pnpm add @scopestack/core
```

## Quick Start

```typescript
import { scope } from '@scopestack/core';
import type { Owned, Context } from '@scopestack/core';

// Create a scoped execution
const result = await scope('analysis', async (ctx) => {
  // Everything inferred here is Owned by 'analysis' scope
  const sentiment = await ctx.infer(SentimentSchema, userInput);
  // sentiment: Owned<Sentiment, 'analysis'>

  return sentiment;
});
```

## Types

### Owned<T, S>

A value with tracked scope ownership:

```typescript
interface Owned<T, S extends string> {
  value: T;
  confidence: number;
  __scope: S; // Branded type
  traceId: string;
}
```

### SemanticValue<T, S>

Extended owned value with LLM-specific metadata:

```typescript
interface SemanticValue<T, S extends string> extends Owned<T, S> {
  alternatives?: Array<{ value: T; confidence: number }>;
  reasoning?: string;
}
```

### Context\<S\>

Scoped execution context:

```typescript
interface Context<S extends string> {
  readonly scope: S;

  // Infer a value within this scope
  infer<T>(schema: Schema<T>, input: string): Promise<Owned<T, S>>;

  // Bridge a value from another scope
  bridge<T, OS extends string>(owned: Owned<T, OS>): Owned<T, S | OS>;

  // Use a value from another scope (alias for bridge)
  use<T, OS extends string>(owned: Owned<T, OS>): Owned<T, S | OS>;
}
```

## API Reference

### scope(name, fn)

Create an isolated execution scope:

```typescript
function scope<S extends string, R>(
  name: S,
  fn: (ctx: Context<S>) => Promise<R>
): Promise<R>;
```

### bridge(owned, targetScope)

Explicitly cross scope boundaries:

```typescript
function bridge<T, S extends string, TS extends string>(
  owned: Owned<T, S>,
  targetScope: TS
): Owned<T, S | TS>;
```

## Design Principles

1. **Compile-time safety** — Scope violations are TypeScript errors
2. **Explicit bridging** — No implicit scope crossing
3. **Trackable provenance** — Every value knows its origin
4. **Confidence-aware** — Uncertainty is first-class

## Development

```bash
# Build
pnpm build

# Test
pnpm test

# Type check
pnpm typecheck
```

## Related Packages

- `eslint-plugin-scopestack` — ESLint rules for detecting scope violations
- `@scopestack/ai-sdk` — Vercel AI SDK integration
