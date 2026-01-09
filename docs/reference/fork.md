# Fork API

The `fork()` API enables parallel execution of multiple LLM inferences sharing the same context, with intelligent cache optimization and type-safe result aggregation.

## Overview

**Use fork when:**

- Multiple analyses needed on the same large context
- Want to maximize cache reuse across parallel calls
- Need to aggregate results with confidence weighting
- Running ensemble models for consensus

**Benefits:**

- ⚡ Parallel execution (faster than sequential)
- 💰 Cache optimization (lower cost than independent calls)
- 🔒 Type-safe branching (TypeScript inference)
- 📊 Automatic provenance tracking

## Quick Start

```typescript
import { createMullionClient } from '@mullion/ai-sdk';
import { anthropic } from '@ai-sdk/anthropic';
import { categorical } from '@mullion/core';

const client = createMullionClient(anthropic('claude-3-5-sonnet-20241022'));

const result = await client.scope('analysis', async (ctx) => {
  // Add shared context once
  ctx.cache.addDeveloperContent(largeDocument);

  // Fork into multiple branches
  const branches = await ctx.fork({
    branches: {
      compliance: (c) => c.infer(ComplianceSchema, 'Check policy compliance'),
      quality: (c) => c.infer(QualitySchema, 'Assess content quality'),
      tags: (c) => c.infer(TagsSchema, 'Extract relevant tags'),
    },
    strategy: 'cache-optimized',
    warmup: 'first-branch',
  });

  // Results are type-safe
  const compliance = branches.compliance; // Owned<ComplianceType, 'analysis'>
  const quality = branches.quality; // Owned<QualityType, 'analysis'>
  const tags = branches.tags; // Owned<TagsType, 'analysis'>

  return { compliance, quality, tags };
});
```

## Fork Strategies

### 1. Fast Parallel (No Warmup)

Executes all branches immediately in parallel. Fastest but no cache sharing.

```typescript
const result = await ctx.fork({
  branches: {
    model1: (c) => c.infer(schema, prompt),
    model2: (c) => c.infer(schema, prompt),
    model3: (c) => c.infer(schema, prompt),
  },
  strategy: 'fast-parallel',
});
```

**Performance:**

```
├─ Branch 1 ──┐
├─ Branch 2 ──┼─→ All start simultaneously
└─ Branch 3 ──┘

Time: T
Cache: 0% hit rate (all write cache in parallel)
Cost: N × full price
```

**Use when:**

- Ultra-low latency required
- Small context (<1000 tokens)
- Cache not available/supported
- Only 1-2 branches

### 2. Cache Optimized (With Warmup)

Runs warmup first to prime cache, then executes remaining branches in parallel.

```typescript
const result = await ctx.fork({
  branches: {
    model1: (c) => c.infer(schema, prompt),
    model2: (c) => c.infer(schema, prompt),
    model3: (c) => c.infer(schema, prompt),
  },
  strategy: 'cache-optimized',
  warmup: 'first-branch', // or explicitWarmup({ content, schema })
});
```

**Performance:**

```
Warmup (Branch 1) ──→ Cache primed
                      ├─ Branch 2 (cache hit)
                      └─ Branch 3 (cache hit)

Time: T(warmup) + T(branch)
Cache: 67% hit rate (2/3 branches)
Cost: 1 × full + 2 × cached (~40% savings)
```

**Use when:**

- Large shared context (>2000 tokens)
- 3+ branches
- Cost optimization priority
- Anthropic provider (best cache support)

## Warmup Strategies

### First Branch Warmup

Automatically runs the first branch, then uses its cache for remaining branches.

```typescript
const result = await ctx.fork({
  branches: {
    primary: (c) => c.infer(PrimarySchema, 'Main analysis'),
    secondary: (c) => c.infer(SecondarySchema, 'Secondary analysis'),
    tertiary: (c) => c.infer(TertiarySchema, 'Tertiary analysis'),
  },
  warmup: 'first-branch', // 'primary' runs first
});
```

**Branch execution order:**

1. `primary` runs → writes cache
2. `secondary` and `tertiary` run in parallel → read cache

### Explicit Warmup

Runs a custom warmup call before any branches, giving full control over cache content.

```typescript
import { explicitWarmup } from '@mullion/ai-sdk';

const result = await ctx.fork({
  branches: {
    a: (c) => c.infer(SchemaA, 'Task A'),
    b: (c) => c.infer(SchemaB, 'Task B'),
    c: (c) => c.infer(SchemaC, 'Task C'),
  },
  warmup: explicitWarmup({
    content: sharedContext,
    schema: WarmupSchema, // Optional: ensure schema compatibility
    prompt: 'Warmup prompt',
  }),
});
```

**Use explicit warmup when:**

- Branches use different schemas (avoid schema conflicts)
- Want to prime cache with specific content
- Need warmup call result for other purposes

### No Warmup

Disable warmup entirely (same as `fast-parallel`).

```typescript
const result = await ctx.fork({
  branches: {
    /* ... */
  },
  strategy: 'fast-parallel', // No warmup
});

// Or explicitly
const result = await ctx.fork({
  branches: {
    /* ... */
  },
  warmup: 'none',
});
```

## Branch Isolation

Each branch receives its own isolated child context:

```typescript
const result = await ctx.fork({
  branches: {
    a: (branchA) => {
      // branchA is isolated from branchB
      branchA.cache.addDeveloperContent('branch A specific');
      return branchA.infer(schema, 'A prompt');
    },
    b: (branchB) => {
      // branchB doesn't see branchA's cache additions
      return branchB.infer(schema, 'B prompt');
    },
  },
});
```

**What's shared:**

- ✅ Parent context cache segments (from `ctx.cache`)
- ✅ Trace context (parent span ID)
- ✅ Client configuration

**What's isolated:**

- ❌ Branch-specific cache additions
- ❌ Branch-specific state
- ❌ Inference results

## Schema Conflict Detection

When branches use different schemas, they generate different tool definitions → different cache prefixes → no cache reuse.

Mullion automatically detects this:

```typescript
const result = await ctx.fork({
  branches: {
    simple: (c) => c.infer(SimpleSchema, prompt),
    complex: (c) => c.infer(ComplexSchema, prompt), // Different schema!
  },
  onSchemaConflict: 'warn', // or 'error', 'ignore'
});

// Console warning:
// "Schema conflict detected in fork branches: limited cache reuse"
```

### Conflict Behaviors

```typescript
// 1. Warn (default) - log warning, continue
onSchemaConflict: 'warn';

// 2. Error - throw error, prevent execution
onSchemaConflict: 'error';

// 3. Ignore - no detection, silent
onSchemaConflict: 'ignore';
```

### Avoiding Schema Conflicts

**❌ Bad: Different schemas**

```typescript
const result = await ctx.fork({
  branches: {
    compliance: (c) => c.infer(ComplianceSchema, prompt),
    quality: (c) => c.infer(QualitySchema, prompt), // Different!
  },
});
// No cache reuse between branches
```

**✅ Good: Unified schema**

```typescript
const UnifiedSchema = z.object({
  compliance: ComplianceSchema,
  quality: QualitySchema,
});

const result = await ctx.fork({
  branches: {
    model1: (c) => c.infer(UnifiedSchema, prompt),
    model2: (c) => c.infer(UnifiedSchema, prompt),
  },
});
// Full cache reuse!
```

## Type Safety

Fork results are fully typed based on branch schemas:

```typescript
const ComplianceSchema = z.object({ approved: z.boolean() });
const QualitySchema = z.object({ score: z.number() });

const result = await ctx.fork({
  branches: {
    compliance: (c) => c.infer(ComplianceSchema, prompt),
    quality: (c) => c.infer(QualitySchema, prompt),
  },
});

// TypeScript knows the exact types
result.compliance; // Owned<{ approved: boolean }, S>
result.quality; // Owned<{ score: number }, S>

// Autocomplete works
if (result.compliance.value.approved) {
  /* ... */
}
const score: number = result.quality.value.score;
```

## Merge Integration

Fork results are designed to work seamlessly with merge strategies:

```typescript
import { categorical, continuous, object } from '@mullion/core';

const result = await ctx.fork({
  branches: {
    model1: (c) => c.infer(SentimentSchema, text),
    model2: (c) => c.infer(SentimentSchema, text),
    model3: (c) => c.infer(SentimentSchema, text),
  },
});

// Convert to array for merging
const values = Object.values(result);

// Merge with strategy
const merged = categorical.weightedVote(values);

console.log(merged.value); // 'positive'
console.log(merged.confidence); // 0.92
console.log(merged.provenance); // ['model1', 'model2']
```

See [Merge Strategies](./merge-strategies.md) for details.

## Performance Monitoring

### Cache Statistics

Track cache performance across fork branches:

```typescript
const result = await ctx.fork({
  branches: {
    a: (c) => c.infer(schema, prompt),
    b: (c) => c.infer(schema, prompt),
    c: (c) => c.infer(schema, prompt),
  },
  strategy: 'cache-optimized',
});

// Aggregate stats from all branches
const statsA = await result.a.context.getCacheStats();
const statsB = await result.b.context.getCacheStats();
const statsC = await result.c.context.getCacheStats();

import { aggregateCacheMetrics } from '@mullion/ai-sdk';
const totalStats = aggregateCacheMetrics([statsA, statsB, statsC]);

console.log(`Total cache hits: ${totalStats.cacheReadTokens}`);
console.log(`Total saved: $${totalStats.estimatedSavings.toFixed(4)}`);
console.log(`Hit rate: ${(totalStats.cacheHitRate * 100).toFixed(1)}%`);
```

### Cost Tracking

Monitor costs per branch:

```typescript
const result = await ctx.fork({
  branches: {
    cheap: (c) => c.infer(SimpleSchema, prompt),
    expensive: (c) => c.infer(ComplexSchema, longPrompt),
  },
});

const cheapCost = await result.cheap.context.getLastCallCost();
const expensiveCost = await result.expensive.context.getLastCallCost();

console.log(`Cheap branch: $${cheapCost.netCost.toFixed(4)}`);
console.log(`Expensive branch: $${expensiveCost.netCost.toFixed(4)}`);
console.log(
  `Total: $${(cheapCost.netCost + expensiveCost.netCost).toFixed(4)}`
);
```

## Advanced Patterns

### Ensemble Modeling

Run multiple models for consensus:

```typescript
import { requireConsensus, categorical } from '@mullion/core';

const result = await ctx.fork({
  branches: {
    sonnet: (c) => c.infer(DecisionSchema, proposal),
    opus: (c) => c.infer(DecisionSchema, proposal),
    haiku: (c) => c.infer(DecisionSchema, proposal),
  },
  strategy: 'fast-parallel', // Different models, no cache benefit
});

const decision = requireConsensus({
  k: 2, // Require 2/3 agreement
  baseStrategy: categorical.weightedVote(),
  onFailure: 'error',
})(Object.values(result));

if (decision.consensus.met) {
  console.log('Consensus achieved:', decision.value);
} else {
  throw new Error('Models disagree - manual review required');
}
```

### Progressive Analysis

Start with fast/cheap analysis, conditionally run deeper analysis:

```typescript
const initial = await ctx.fork({
  branches: {
    quick: (c) => c.infer(QuickSchema, document),
  },
});

if (
  initial.quick.confidence < 0.8 ||
  initial.quick.value.requiresDeepAnalysis
) {
  // Run deeper analysis
  const detailed = await ctx.fork({
    branches: {
      deep1: (c) => c.infer(DetailedSchema, document),
      deep2: (c) => c.infer(DetailedSchema, document),
      deep3: (c) => c.infer(DetailedSchema, document),
    },
    strategy: 'cache-optimized',
  });

  return detailed;
}

return initial;
```

### Batched Fork

Process multiple documents with fork:

```typescript
const documents = [doc1, doc2, doc3];

const results = await Promise.all(
  documents.map(async (doc) => {
    return await ctx.fork({
      branches: {
        extract: (c) => c.infer(ExtractSchema, doc),
        classify: (c) => c.infer(ClassifySchema, doc),
        summarize: (c) => c.infer(SummarySchema, doc),
      },
      strategy: 'cache-optimized',
    });
  })
);
```

## Best Practices

### 1. Choose Strategy Based on Context Size

```typescript
// ✅ GOOD: Large context → cache-optimized
if (documentTokens > 2000) {
  return await ctx.fork({
    branches,
    strategy: 'cache-optimized',
  });
}

// ✅ GOOD: Small context → fast-parallel
return await ctx.fork({
  branches,
  strategy: 'fast-parallel',
});
```

### 2. Use Same Schema When Possible

```typescript
// ❌ BAD: Different schemas, no cache reuse
const result = await ctx.fork({
  branches: {
    a: (c) => c.infer(SchemaA, prompt),
    b: (c) => c.infer(SchemaB, prompt),
  },
});

// ✅ GOOD: Unified schema
const UnifiedSchema = z.object({
  analysisA: SchemaA,
  analysisB: SchemaB,
});

const result = await ctx.fork({
  branches: {
    a: (c) => c.infer(UnifiedSchema, prompt),
    b: (c) => c.infer(UnifiedSchema, prompt),
  },
});
```

### 3. Monitor Cache Effectiveness

```typescript
const result = await ctx.fork({
  branches,
  strategy: 'cache-optimized',
});

const stats = await aggregateStats(result);

if (stats.cacheHitRate < 0.5) {
  logger.warn('Low cache hit rate in fork', {
    hitRate: stats.cacheHitRate,
    strategy: 'cache-optimized',
    recommendation: 'Check schema compatibility and context size',
  });
}
```

### 4. Handle Branch Failures Gracefully

```typescript
const result = await ctx.fork({
  branches: {
    critical: (c) => c.infer(schema, prompt),
    optional: (c) =>
      c.infer(schema, prompt).catch((err) => {
        logger.warn('Optional branch failed', err);
        return createOwned({
          value: null,
          scope: c.scope,
          confidence: 0,
          traceId: generateId(),
        });
      }),
  },
});
```

## Limitations

### Anthropic Cache Availability

Cache becomes available only **after the first response starts**. This means:

```typescript
// ❌ Without warmup: No cache reuse
Promise.all([
  ctx.infer(schema, prompt), // Writes cache
  ctx.infer(schema, prompt), // Writes cache (parallel, can't read yet)
  ctx.infer(schema, prompt), // Writes cache (parallel, can't read yet)
]);
// Result: 0% cache hits

// ✅ With warmup: Cache reuse
await ctx.infer(schema, prompt); // Writes cache
await Promise.all([
  ctx.infer(schema, prompt), // Reads cache
  ctx.infer(schema, prompt), // Reads cache
]);
// Result: 67% cache hits
```

This is why `cache-optimized` strategy exists.

### OpenAI Automatic Caching

OpenAI caches automatically for prompts >1024 tokens, but:

- No explicit control over cache
- No TTL configuration
- No warmup benefit (auto-caches on first call)

For OpenAI, `fast-parallel` and `cache-optimized` have similar performance.

### Schema Conflicts

Different schemas = different tool definitions = different cache keys.

Always use unified schemas when possible for fork branches.

## Troubleshooting

### Low Cache Hit Rate

**Problem:** `cacheHitRate < 0.3` with `cache-optimized`

**Check:**

1. Schema conflicts between branches
2. Context below minimum threshold
3. Warmup not executing correctly

```typescript
// Debug schema conflicts
const result = await ctx.fork({
  branches,
  onSchemaConflict: 'error', // Will throw if conflict
});

// Debug cache segments
console.log(ctx.cache.getSegments());
```

### Higher Cost Than Expected

**Problem:** Fork costs more than estimated

**Possible causes:**

1. No warmup → all branches write cache
2. Schema conflicts → no cache reuse
3. Output tokens higher than expected

```typescript
// Track costs per branch
const costs = await Promise.all(
  Object.values(result).map((r) => r.context.getLastCallCost())
);

costs.forEach((cost, i) => {
  console.log(`Branch ${i}: $${cost.netCost.toFixed(4)}`);
  console.log(`  Cache savings: $${cost.cacheSavings.toFixed(4)}`);
});
```

## See Also

- [Merge Strategies](./merge-strategies.md) - Aggregating fork results
- [Caching](./caching.md) - Cache optimization details
- [Cost Estimation](./cost-estimation.md) - Tracking fork costs
- [Concepts](./concepts.md) - Core Mullion concepts
