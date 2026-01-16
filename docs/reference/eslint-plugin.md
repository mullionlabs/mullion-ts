# ESLint plugin

`@mullion/eslint-plugin` adds static checks that TypeScript alone cannot guarantee.

Typical goals:

- prevent context leaks caused by variable capture / shared state
- require explicit bridging
- enforce confidence checks before side effects
- keep LLM workflow topology readable

## Install

```bash
npm install -D @mullion/eslint-plugin
```

## Configuration

### ESLint v9+ (flat config)

```js
// eslint.config.mjs
import mullion from '@mullion/eslint-plugin';

export default [
  {
    plugins: {mullion},
    rules: {
      // Example names — adjust to the exact rule list in the package README.
      // 'mullion/no-context-leak': 'error',
      // 'mullion/require-bridge': 'error',
      // 'mullion/require-confidence-check': 'warn',
    },
  },
];
```

## What “context leak” linting catches (example)

```ts
// ❌ should be flagged: value escapes scope via outer variable
let leaked;

await client.scope('admin', async (ctx) => {
  leaked = await ctx.infer(Schema, 'secret');
});

await client.scope('public', async (ctx) => {
  return leaked.value; // leak
});
```

## Recommended workflow

- run lint in CI
- treat “leak” rules as `error`
- treat “confidence” rules as `warn` initially, upgrade to `error` later
