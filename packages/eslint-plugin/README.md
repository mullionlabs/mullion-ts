<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/mullionlabs/mullion-ts/main/.github/images/logo-dark.png" />
    <img alt="Mullion" src="https://raw.githubusercontent.com/mullionlabs/mullion-ts/main/.github/images/logo-light.png" width="180" />
  </picture>

  <h1>@mullion/eslint-plugin</h1>

  <p><strong>ESLint rules for detecting context leaks and enforcing best practices</strong></p>

  <p>
    <a href="https://www.npmjs.com/package/@mullion/eslint-plugin"><img alt="npm version" src="https://img.shields.io/npm/v/@mullion/eslint-plugin?style=flat-square"></a>
    <a href="https://www.npmjs.com/package/@mullion/eslint-plugin"><img alt="npm downloads" src="https://img.shields.io/npm/dm/@mullion/eslint-plugin?style=flat-square"></a>
    <a href="https://github.com/mullionlabs/mullion-ts/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/github/license/mullionlabs/mullion-ts?style=flat-square"></a>
    <img alt="TypeScript 5+" src="https://img.shields.io/badge/TypeScript-5%2B-3178C6?style=flat-square&logo=typescript&logoColor=white">
  </p>
</div>

---

## Installation

```bash
npm install @mullion/eslint-plugin --save-dev
```

## Overview

This ESLint plugin provides static analysis rules to catch context leaks and enforce confidence checking in Mullion applications. It helps prevent security vulnerabilities by detecting when LLM-generated values cross scope boundaries without proper bridging.

## Why Use This?

LLM applications deal with data that crosses trust boundaries. Without static analysis, it's easy to accidentally:

- **Leak privileged data** into public scopes (admin → customer)
- **Mix tenant data** in multi-tenant systems
- **Use low-confidence outputs** for critical decisions without validation
- **Lose audit trails** when data flows between contexts

**This plugin catches these issues at compile-time** with zero runtime overhead.

### What It Prevents

| Risk                 | Without Plugin                    | With Plugin           |
| -------------------- | --------------------------------- | --------------------- |
| Context leaks        | Discovered in production          | Caught in IDE/CI      |
| Low confidence usage | Runtime errors or silent failures | Compile-time warnings |
| Audit trail gaps     | Manual code review needed         | Automatic enforcement |
| Security review time | Hours per PR                      | Seconds (automated)   |

### Real-World Impact

```typescript
// ❌ Without plugin: This compiles but leaks admin data
let adminData;
await client.scope('admin', async (ctx) => {
  adminData = await ctx.infer(SecretSchema, sensitiveDoc);
});

await client.scope('public', async (ctx) => {
  return adminData.value; // BUG: No warning!
});

// ✅ With plugin: ESLint error prevents compilation
// "Context leak detected: 'adminData' crosses scope boundary"
```

## Quick Setup

### Flat Config (ESLint 9+)

```javascript
// eslint.config.js
import mullion from '@mullion/eslint-plugin';

export default [
  {
    plugins: {
      '@mullion': mullion,
    },
    rules: {
      '@mullion/no-context-leak': 'error',
      '@mullion/require-confidence-check': 'warn',
    },
  },
];
```

### Legacy Config (.eslintrc)

```javascript
{
  "plugins": ["@mullion"],
  "rules": {
    "@mullion/no-context-leak": "error",
    "@mullion/require-confidence-check": "warn"
  }
}
```

### Using Preset Configs

```javascript
// Use recommended configuration
import mullion from '@mullion/eslint-plugin';

export default [
  ...mullion.configs.recommended
];

// Or use strict configuration
export default [
  ...mullion.configs.strict
];
```

## Rules

### `no-context-leak` (🚨 Error)

**Prevents accidental context leaks when LLM-generated values cross scope boundaries without proper bridging.**

#### ❌ Incorrect

```typescript
let leaked;

await client.scope('admin', async (ctx) => {
  leaked = await ctx.infer(Schema, 'secret data'); // 🚨 ESLint error
});

await client.scope('public', async (ctx) => {
  return leaked.value; // 🚨 ESLint error
});
```

```typescript
await client.scope('scope-a', async (ctxA) => {
  const dataA = await ctxA.infer(Schema, input);

  await client.scope('scope-b', async (ctxB) => {
    return dataA.value; // 🚨 ESLint error - cross-scope usage
  });
});
```

#### ✅ Correct

```typescript
await client.scope('admin', async (adminCtx) => {
  const adminData = await adminCtx.infer(Schema, 'secret data');

  await client.scope('public', async (publicCtx) => {
    const bridged = publicCtx.bridge(adminData); // ✅ Explicit bridge
    return bridged.value;
  });
});
```

```typescript
await client.scope('scope-a', async (ctxA) => {
  const dataA = await ctxA.infer(Schema, input);
  return ctxA.use(dataA); // ✅ Safe - same scope
});
```

### `require-confidence-check` (⚠️ Warning)

**Warns when LLM-generated values are used without checking their confidence scores.**

#### ❌ Triggers Warning

```typescript
await client.scope('processing', async (ctx) => {
  const result = await ctx.infer(Schema, input);

  // ⚠️ ESLint warning - using value without confidence check
  if (result.value.category === 'important') {
    processImportantData(result.value);
  }

  return result.value; // ⚠️ ESLint warning
});
```

#### ✅ Correct

```typescript
await client.scope('processing', async (ctx) => {
  const result = await ctx.infer(Schema, input);

  // ✅ Check confidence before use
  if (result.confidence >= 0.8 && result.value.category === 'important') {
    processImportantData(result.value);
  }

  // ✅ Or use a handler function
  return handleResult(result); // Function receives full Owned object
});
```

## Configuration

### Rule Options

#### `no-context-leak`

```javascript
{
  "@mullion/no-context-leak": ["error", {
    "allowBridge": true,    // Allow ctx.bridge() calls (default: true)
    "strictMode": false     // Stricter checking (default: false)
  }]
}
```

#### `require-confidence-check`

```javascript
{
  "@mullion/require-confidence-check": ["warn", {
    "minConfidence": 0.8,      // Minimum confidence threshold
    "requireExplicit": false,  // Require explicit .confidence checks
    "allowHandlers": true      // Allow functions that handle Owned values
  }]
}
```

### Preset Configurations

#### `recommended`

```javascript
{
  rules: {
    '@mullion/no-context-leak': 'error',
    '@mullion/require-confidence-check': 'warn'
  }
}
```

#### `strict`

```javascript
{
  rules: {
    '@mullion/no-context-leak': 'error',
    '@mullion/require-confidence-check': 'error' // More strict
  }
}
```

## Examples

### Real-World Violations

#### Customer Support Pipeline

```typescript
// ❌ BAD: Customer data leaks to admin scope
let customerQuery;

await client.scope('customer', async (ctx) => {
  customerQuery = await ctx.infer(QuerySchema, userInput); // 🚨 Leak
});

await client.scope('admin', async (ctx) => {
  // This could expose customer PII to admin systems
  return analyzeWithAdminTools(customerQuery.value); // 🚨 Leak
});

// ✅ GOOD: Explicit bridging
await client.scope('customer', async (customerCtx) => {
  const query = await customerCtx.infer(QuerySchema, userInput);

  return await client.scope('admin', async (adminCtx) => {
    const bridged = adminCtx.bridge(query); // ✅ Tracked transfer
    return analyzeWithAdminTools(bridged.value);
  });
});
```

#### Multi-Tenant Data Processing

```typescript
// ❌ BAD: Tenant data cross-contamination
const results = [];

for (const tenant of tenants) {
  await client.scope(`tenant-${tenant.id}`, async (ctx) => {
    const data = await ctx.infer(Schema, tenant.input);
    results.push(data); // 🚨 Mixing tenant scopes!
  });
}

// ✅ GOOD: Keep tenant data isolated
const results = [];

for (const tenant of tenants) {
  const result = await client.scope(`tenant-${tenant.id}`, async (ctx) => {
    const data = await ctx.infer(Schema, tenant.input);
    return ctx.use(data); // ✅ Extract safely within scope
  });
  results.push({tenantId: tenant.id, data: result});
}
```

### Confidence Checking Patterns

#### ❌ Common Anti-Patterns

```typescript
// Direct value access without confidence check
const result = await ctx.infer(Schema, input);
const decision = result.value.decision; // ⚠️ Warning

// Implicit confidence in conditional
if (result.value.important) {
  // ⚠️ Warning
  processImportant();
}
```

#### ✅ Good Patterns

```typescript
// Explicit confidence checking
const result = await ctx.infer(Schema, input);

if (result.confidence >= 0.9) {
  const decision = result.value.decision; // ✅ Safe
}

// Handler function approach
function handleClassification(owned: Owned<Classification, string>) {
  if (owned.confidence < 0.8) {
    return escalateToHuman(owned);
  }
  return processAutomatically(owned.value);
}

const result = await ctx.infer(Schema, input);
handleClassification(result); // ✅ Handler receives full context
```

## TypeScript Integration

The plugin leverages TypeScript's type system for accurate detection:

```typescript
// The plugin understands scope types
type AdminData = Owned<Secret, 'admin'>;
type UserData = Owned<Public, 'user'>;

// It detects type mismatches
function processUserData(data: UserData) {
  /* ... */
}

const adminData: AdminData = await adminCtx.infer(SecretSchema, input);
processUserData(adminData); // 🚨 Type and scope mismatch detected
```

## Troubleshooting

### Common Issues

#### False Positives

If you get false positives, you might need to:

1. **Update TypeScript configuration:**

   ```json
   {
     "parserOptions": {
       "project": "./tsconfig.json"
     }
   }
   ```

2. **Ensure proper imports:**
   ```typescript
   import type {Owned, Context} from '@mullion/core';
   ```

#### Missing Violations

If leaks aren't being caught:

1. **Check TypeScript types are available**
2. **Verify the plugin can access type information**
3. **Ensure you're using the correct scope patterns**

### Debugging

Enable debug mode to see what the plugin is detecting:

```bash
DEBUG=@mullion/eslint-plugin eslint your-file.ts
```

## Examples in Action

See the [basic example](../../examples/basic/) which demonstrates both correct usage and intentional violations that ESLint catches.

Run the example:

```bash
cd examples/basic
npm install
npm run lint  # See violations caught
npm run demo  # See proper usage
```

## Contributing

Found a bug or want to add a rule? See [CONTRIBUTING.md](../../docs/contributing/CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](../../LICENSE) for details.
