# Getting started

This guide shows a minimal setup for Mullion in a TypeScript project.

> Each npm package has its own README. This guide is repository-level.

## Install

```bash
npm install @mullion/core
npm install @mullion/ai-sdk ai zod
npm install -D @mullion/eslint-plugin
```

## 1) Create a client (AI SDK adapter)

```ts
import {createMullionClient} from '@mullion/ai-sdk';
import {openai} from '@ai-sdk/openai';

export const client = createMullionClient(openai('gpt-4o-mini'));
```

## 2) Define schemas for model outputs

Mullion encourages schema-first LLM outputs (e.g. Zod):

```ts
import {z} from 'zod';

export const TicketSchema = z.object({
  severity: z.enum(['low', 'high', 'critical']),
  summary: z.string(),
});
```

## 3) Run everything inside a scope

Scopes are the unit of trust + provenance.

```ts
import {TicketSchema} from './schemas';

const ticket = await client.scope('triage', async (ctx) => {
  const result = await ctx.infer(TicketSchema, "User can't login.");
  if (result.confidence < 0.8) throw new Error('needs review');
  return ctx.use(result);
});
```

## 4) Move data across boundaries explicitly

```ts
const adminResult = await client.scope('admin', async (ctx) => {
  return ctx.use(await ctx.infer(TicketSchema, 'Internal incident report...'));
});

const publicResult = await client.scope('public', async (ctx) => {
  const bridged = ctx.bridge(adminResult);
  return ctx.use(bridged);
});
```

## Next steps

- Learn the mental model: [Core concepts](../reference/concepts.md)
- Add guardrails: [ESLint plugin](../reference/eslint-plugin.md)
- Explore patterns: [Patterns & recipes](./patterns.md)
