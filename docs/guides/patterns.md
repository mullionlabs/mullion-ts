# Patterns & recipes

This page describes common Mullion patterns for production LLM features.

## Pattern: “analyze once, use many times”

- Put privileged context inside a privileged scope
- Produce an Owned<T> result
- Bridge only the minimum necessary into public scope(s)

## Pattern: “same context, multiple analyses” (fork/merge)

Use fork/merge when you want multiple analyses from the same large prefix:

- compliance
- quality
- tagging
- classification

```ts
const result = await client.scope('analyzer', async (ctx) => {
  ctx.add('Common context: ' + doc);

  const branches = await ctx.fork({
    branches: {
      compliance: (c) => c.infer(ComplianceSchema, 'Check policy issues'),
      quality: (c) => c.infer(QualitySchema, 'Check grammar and clarity'),
      tags: (c) => c.infer(TagsSchema, 'Extract tags'),
    },
    strategy: 'cache-optimized', // or 'fast-parallel'
  });

  return ctx.merge(branches);
});
```

## Pattern: “confidence gates”

Treat confidence as an explicit contract:

- below threshold → retry
- below lower threshold → human review
- never allow low-confidence outputs to trigger irreversible side effects

## Pattern: “no shared state”

Avoid outer variables and implicit captures across scopes.
If you must share, do it via explicit bridges or explicit stores with policies.
