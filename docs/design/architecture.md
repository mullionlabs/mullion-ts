# Architecture & mental model

This doc explains how to think about Mullion as “guardrails for code topology”.

## Mullion is not orchestration

Mullion does not try to replace:

- workflow engines
- graph runners
- agent frameworks

Instead it adds constraints so your existing architecture stays safe.

## Think “trust zones”

Your code naturally has zones:

- public user input
- internal tooling
- admin-only data
- billing / payments
- long-lived memory stores

Scopes make those zones explicit and reviewable.

## Data flow is the product

In LLM-heavy systems, the core risk is data flow:

- what reaches the model
- what the model output controls
- what crosses boundaries

Mullion’s primitives exist to make these flows:

- explicit
- typed
- lintable
- auditable

## Fork / merge patterns

```ts
const result = await client.scope('analyzer', async (ctx) => {
  ctx.add('Common context: ' + doc);

  const branches = await ctx.fork({
    branches: {
      compliance: (c) => c.infer(ComplianceSchema, 'Check policy issues'),
      quality: (c) => c.infer(QualitySchema, 'Check grammar and clarity'),
      tags: (c) => c.infer(TagsSchema, 'Extract tags'),
    },
    strategy: 'fast-parallel', // or 'cache-optimized'
  });

  return ctx.merge(branches);
});
```

## Roadmap hooks

Two big “next” surfaces that benefit from this architecture:

- **Cost visibility** (token estimation, cache economics, attribution)
- **Observability** (structured trace events, provenance graphs, OpenTelemetry exporters)

See [Roadmap](./roadmap.md) and [TODO](../../TODO.md).
