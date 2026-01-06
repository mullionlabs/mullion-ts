# eslint-plugin-intentkit

ESLint rules for type-safe LLM context management.

## Overview

Catch context leaks and confidence issues at lint time, before runtime.

## Installation

```bash
pnpm add -D eslint-plugin-intentkit
```

## Configuration

### Flat Config (ESLint 9+)

```javascript
// eslint.config.js
import intentkit from 'eslint-plugin-intentkit';

export default [
  intentkit.configs.recommended,
  // ... your other configs
];
```

### Legacy Config

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['intentkit'],
  extends: ['plugin:intentkit/recommended'],
};
```

## Rules

### `intentkit/no-context-leak`

Detects when an `Owned` value crosses scope boundary without explicit bridge.

```typescript
// ❌ Error: Context leak - 'adminNotes' from scope 'admin' used in scope 'customer'
async function handleCustomer(ctx: Context<'customer'>) {
  const adminNotes = await adminCtx.infer(Notes, doc);
  return ctx.respond(adminNotes.value); // LEAK!
}

// ✅ OK: Explicit bridge
async function handleCustomer(ctx: Context<'customer'>) {
  const adminNotes = await adminCtx.infer(Notes, doc);
  const bridged = ctx.bridge(adminNotes);
  return ctx.respond(bridged.value);
}
```

**Options:**
```javascript
{
  "intentkit/no-context-leak": ["error", {
    // Scopes that are always allowed to access each other
    "allowedPairs": [["internal", "public"]]
  }]
}
```

### `intentkit/require-confidence-check`

Requires confidence check before using `Owned` value.

```typescript
// ❌ Warning: Using Owned value without confidence check
const sentiment = await ctx.infer(SentimentSchema, input);
return sentiment.value; // No confidence check!

// ✅ OK: Confidence checked
const sentiment = await ctx.infer(SentimentSchema, input);
if (sentiment.confidence >= 0.8) {
  return sentiment.value;
}
return fallback;

// ✅ OK: Using bridge.resolve with require_confidence
const sentiment = await ctx.infer(SentimentSchema, input);
const resolved = bridge.resolve(sentiment, { require_confidence: 0.8 });
return resolved.value;
```

**Options:**
```javascript
{
  "intentkit/require-confidence-check": ["warn", {
    // Minimum confidence threshold
    "threshold": 0.8,
    // Functions that count as confidence handling
    "handlerFunctions": ["bridge.resolve", "handleLowConfidence"]
  }]
}
```

### `intentkit/no-unsafe-parallel-write` (experimental)

Detects potential race conditions in parallel LLM calls.

```typescript
// ❌ Warning: Both branches write to 'summary'
const [a, b] = await Promise.all([
  ctx.infer(Summary, doc1),
  ctx.infer(Summary, doc2),
]);
state.summary = a.value; // Race!
state.summary = b.value; // Race!

// ✅ OK: Explicit merge
const [a, b] = await Promise.all([
  ctx.infer(Summary, doc1),
  ctx.infer(Summary, doc2),
]);
state.summary = merge(a, b, { strategy: 'combine' });
```

## Recommended Config

```javascript
// All rules with sensible defaults
intentkit.configs.recommended = {
  plugins: { intentkit },
  rules: {
    'intentkit/no-context-leak': 'error',
    'intentkit/require-confidence-check': 'warn',
    'intentkit/no-unsafe-parallel-write': 'warn',
  },
};
```

## Strict Config

```javascript
// All rules as errors
intentkit.configs.strict = {
  plugins: { intentkit },
  rules: {
    'intentkit/no-context-leak': 'error',
    'intentkit/require-confidence-check': 'error',
    'intentkit/no-unsafe-parallel-write': 'error',
  },
};
```

## Development

```bash
# Build
pnpm build

# Test rules
pnpm test

# Run on example code
pnpm lint:examples
```

## How It Works

The plugin uses TypeScript type information via `@typescript-eslint/parser` to:

1. Track `Owned<T, S>` values and their scope parameter `S`
2. Analyze data flow to detect scope boundary crossings
3. Check for `.confidence` access patterns

This is why the plugin requires TypeScript and a properly configured `tsconfig.json`.

## Limitations

- Requires TypeScript (no plain JS support)
- Cannot detect runtime-only scope violations
- `any` casts will bypass checks (as with all TS tooling)

## Related Packages

- `@intentkit/core` — Core type definitions
- `@intentkit/ai-sdk` — Vercel AI SDK integration
