# ScopeStack

> **TypeScript library for type-safe LLM context management**

**Core philosophy:** Compile-time safety, not runtime orchestration. We are ESLint + TypeScript for LLM workflows, not a new LangChain.

**One-liner:** "Catch context leaks and confidence issues before runtime"

[![npm version](https://badge.fury.io/js/%40scopestack%2Fcore.svg)](https://www.npmjs.com/package/@scopestack/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Quick Start

### Installation

```bash
# Core library
npm install @scopestack/core

# AI SDK integration
npm install @scopestack/ai-sdk ai zod

# ESLint plugin (recommended)
npm install eslint-plugin-scopestack --save-dev
```

### Basic Example

```typescript
import { createScopeStackClient } from '@scopestack/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const client = createScopeStackClient(openai('gpt-4'));

const EmailSchema = z.object({
  intent: z.enum(['support', 'sales', 'billing']),
  urgency: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
});

// ✅ Safe: Scoped execution
const analysis = await client.scope('intake', async (ctx) => {
  const email = await ctx.infer(EmailSchema, userInput);

  // Check confidence before use
  if (email.confidence < 0.8) {
    throw new Error('Low confidence - needs human review');
  }

  return ctx.use(email); // ✅ Safe: same scope
});

// ✅ Safe: Explicit bridging between scopes
const response = await client.scope('support', async (ctx) => {
  const bridged = ctx.bridge(analysis); // ✅ Explicit transfer
  // Process bridged data...
  return result;
});
```

### ESLint Protection

```typescript
// ❌ ESLint Error: Context leak detected
let leaked;
await client.scope('admin', async (ctx) => {
  leaked = await ctx.infer(Schema, 'secret data');
});

await client.scope('public', async (ctx) => {
  return leaked.value; // 🚨 ESLint catches this!
});
```

## The Problem We Solve

**Context leaks** are the #1 cause of LLM security vulnerabilities:

```typescript
// ❌ DANGEROUS: Admin data leaks to customer context
const adminNotes = await adminCtx.infer(Notes, document);
await customerCtx.respond(adminNotes.value); // 🚨 LEAK!

// ✅ SAFE: Explicit bridge with full provenance
const adminNotes = await adminCtx.infer(Notes, document);
const safe = customerCtx.bridge(adminNotes);
await customerCtx.respond(safe.value); // ✅ Tracked!
```

ScopeStack makes these leaks **impossible by design**, not just detectable after the fact.

## Core Concepts

### 🎯 Scoped Execution

Every LLM operation runs in a named scope:

```typescript
await client.scope('user-query', async (ctx) => {
  // All operations in this scope are tagged as 'user-query'
  const result = await ctx.infer(Schema, input);
  return ctx.use(result); // ✅ Safe within same scope
});
```

### 🏷️ Owned Values

LLM outputs are wrapped with metadata:

```typescript
interface Owned<T, S extends string> {
  value: T; // The actual data
  confidence: number; // 0-1 confidence score
  __scope: S; // Compile-time scope tracking
  traceId: string; // Audit trail
}
```

### 🌉 Safe Bridging

Explicit transfers between scopes:

```typescript
const adminData = await adminCtx.infer(Schema, secret);

await userCtx.scope('processing', async (ctx) => {
  const bridged = ctx.bridge(adminData); // ✅ Explicit
  // bridged.__scope is now 'admin' | 'processing'
  return bridged;
});
```

### 📊 Confidence Tracking

Automatic confidence extraction:

```typescript
const result = await ctx.infer(Schema, input);

if (result.confidence < 0.8) {
  // Handle low confidence
  await escalateToHuman(result);
}
```

## Packages

| Package                                                | Description                     | Status    |
| ------------------------------------------------------ | ------------------------------- | --------- |
| [`@scopestack/core`](./packages/core)                  | Core types and utilities        | ✅ Stable |
| [`@scopestack/ai-sdk`](./packages/ai-sdk)              | Vercel AI SDK integration       | ✅ Stable |
| [`eslint-plugin-scopestack`](./packages/eslint-plugin) | ESLint rules for leak detection | ✅ Stable |

## Examples

| Example                                                             | Description                       |
| ------------------------------------------------------------------- | --------------------------------- |
| [Basic](./examples/basic)                                           | Core concepts demonstration       |
| [Integration Test Instructions](./INTEGRATION_TEST_INSTRUCTIONS.md) | Manual API testing guide          |
| [Comprehensive Examples](./EXAMPLES.md)                             | Real-world patterns and use cases |
| [Next.js](./examples/nextjs)                                        | React integration _(coming soon)_ |

### Quick Examples

#### Customer Support Pipeline

```typescript
import { createScopeStackClient } from '@scopestack/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const client = createScopeStackClient(openai('gpt-4'));

const TicketSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['billing', 'technical', 'account']),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  summary: z.string(),
});

// Process customer ticket in isolated scope
const ticket = await client.scope('customer-intake', async (ctx) => {
  const analysis = await ctx.infer(TicketSchema, customerMessage);

  if (analysis.confidence < 0.8) {
    throw new Error('Uncertain analysis - route to human agent');
  }

  return ctx.use(analysis);
});

// Generate response in support scope with explicit bridging
const response = await client.scope('support-response', async (ctx) => {
  // Must explicitly bridge customer data to support scope
  const bridgedTicket = ctx.bridge(ticket);

  const reply = await ctx.infer(
    z.object({
      message: z.string(),
      escalate: z.boolean(),
      followUpActions: z.array(z.string()),
    }),
    `Respond to ${bridgedTicket.priority} priority ${bridgedTicket.category} ticket`
  );

  return ctx.use(reply);
});
```

#### Multi-Tenant Data Processing

```typescript
// Safe tenant isolation with ScopeStack
async function processTenantData(tenants: Tenant[]) {
  const results = [];

  for (const tenant of tenants) {
    // Each tenant gets its own isolated scope
    const result = await client.scope(`tenant-${tenant.id}`, async (ctx) => {
      const analysis = await ctx.infer(AnalysisSchema, tenant.data);

      // Data stays within tenant scope
      return {
        tenantId: tenant.id,
        analysis: ctx.use(analysis),
        processedAt: new Date(),
      };
    });

    results.push(result);
  }

  return results; // ✅ No cross-tenant contamination
}
```

#### Document Classification with Confidence

````typescript
const ClassificationSchema = z.object({
  category: z.enum(['public', 'internal', 'confidential']),
  topics: z.array(z.string()),
  containsPII: z.boolean(),
  riskLevel: z.number().min(0).max(10)
});

async function classifyDocument(content: string) {
  return await client.scope('classification', async (ctx) => {
    const result = await ctx.infer(ClassificationSchema, content);

    // Different confidence thresholds for different risk levels
    const minConfidence = result.value.riskLevel > 7 ? 0.95 : 0.8;

    if (result.confidence < minConfidence) {
      return {
        status: 'needs_review',
        reason: `Low confidence ${result.confidence.toFixed(2)} < ${minConfidence}`,
        traceId: result.traceId
      };
    }

    return {
      status: 'classified',
      classification: ctx.use(result),
      confidence: result.confidence
    };
  });
}

## ESLint Setup

Add to your `.eslintrc.js`:

```javascript
export default [
  {
    plugins: {
      scopestack: require('eslint-plugin-scopestack')
    },
    rules: {
      'scopestack/no-context-leak': 'error',
      'scopestack/require-confidence-check': 'warn'
    }
  }
];
````

Or use the recommended config:

```javascript
import scopestack from 'eslint-plugin-scopestack';

export default [...scopestack.configs.recommended];
```

## Features

### ✅ **Type Safety**

- Compile-time scope tracking
- TypeScript-first design
- Zero runtime type checking overhead

### ✅ **Leak Prevention**

- ESLint rules catch context leaks
- Runtime scope validation
- Explicit bridging requirements

### ✅ **Confidence System**

- Automatic confidence extraction
- Configurable thresholds
- Handler-based validation

### ✅ **Audit Trails**

- Unique trace IDs
- Full provenance tracking
- Scope transition logging

### ✅ **AI SDK Integration**

- Works with Vercel AI SDK
- OpenAI, Anthropic, Google support
- Structured output parsing

## Use Cases

### 🛡️ **Security-Critical Applications**

- Multi-tenant AI systems
- Customer data processing
- Admin/user boundary enforcement

### 🏢 **Enterprise Workflows**

- Document classification pipelines
- Customer support automation
- Content moderation systems

### 🔍 **Data Processing**

- ETL with LLM enrichment
- Multi-stage analysis pipelines
- Quality control workflows

## Philosophy

### **Compile-time Safety Over Runtime Orchestration**

ScopeStack is **not** a workflow engine. We don't compete with LangChain or other orchestration frameworks. Instead, we provide:

- **Static analysis** for context leak detection
- **Type-level** scope tracking
- **Compile-time** safety guarantees

Think of us as the **ESLint for LLM workflows**.

### **Explicit Over Implicit**

```typescript
// ❌ Implicit: Hard to audit, easy to leak
function processDocument(doc: string, userRole: Role) {
  const analysis = await llm.analyze(doc);
  return await llm.respond(analysis, userRole);
}

// ✅ Explicit: Clear boundaries, full provenance
async function processDocument(doc: string, userRole: Role) {
  const analysis = await adminCtx.infer(AnalysisSchema, doc);

  return await userCtx.scope(userRole, async (ctx) => {
    const bridged = ctx.bridge(analysis);
    return await ctx.infer(ResponseSchema, bridged.value);
  });
}
```

## Contributing

This is a monorepo managed with:

- **pnpm workspaces** for dependency management
- **Turborepo** for build caching
- **Changesets** for versioning

```bash
# Setup
pnpm install
pnpm build

# Development
pnpm dev
pnpm test
pnpm lint

# Releases
pnpm changeset
pnpm version
pnpm release
```

See [CLAUDE.md](./CLAUDE.md) for detailed development guidelines.

## Roadmap

### **Version 0.1** _(Current)_

- ✅ Core types and scope management
- ✅ ESLint rules for leak detection
- ✅ Vercel AI SDK integration
- ✅ Basic examples

### **Version 0.2** _(Next)_

- [ ] Next.js integration example
- [ ] Advanced ESLint rules
- [ ] Performance optimizations
- [ ] Documentation site

### **Version 0.3** _(Future)_

- [ ] OpenAI Assistants API adapter
- [ ] VSCode extension
- [ ] `fork()` and `merge()` primitives
- [ ] Advanced audit logging

## License

MIT - see [LICENSE](./LICENSE) for details.

## Support

- 📖 [Documentation](./packages/core/README.md)
- 🐛 [Issues](https://github.com/scopestack/scopestack-ts/issues)
- 💬 [Discussions](https://github.com/scopestack/scopestack-ts/discussions)

---

**Made with ❤️ for safer LLM applications**
