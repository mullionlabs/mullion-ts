# Caching

Mullion provides provider-aware caching with safe-by-default behavior and automatic optimization for fork/merge patterns.

## Overview

LLM providers offer prompt caching to reduce costs and latency:

- **Anthropic**: Explicit cache control with breakpoints and TTLs
- **OpenAI**: Automatic caching for prompts > 1024 tokens

Mullion's cache system:

- ✅ Provider-specific optimizations
- ✅ Safe-by-default (never caches user content without opt-in)
- ✅ Automatic cache warmup for fork branches
- ✅ Schema conflict detection
- ✅ Cost savings tracking

## Quick Start

### Basic Caching

```typescript
import {createMullionClient} from '@mullion/ai-sdk';
import {anthropic} from '@ai-sdk/anthropic';

const client = createMullionClient(anthropic('claude-3-5-sonnet-20241022'));

const result = await client.scope('analysis', async (ctx) => {
  // Add cacheable content
  ctx.cache.addSystemPrompt('You are an expert data analyst.');
  ctx.cache.addDeveloperContent(largeDocument, {
    ttl: '5m',
    scope: 'ephemeral',
  });

  // This inference will benefit from caching on repeat calls
  const analysis = await ctx.infer(AnalysisSchema, 'Analyze this data');

  // Check cache performance
  const stats = await ctx.getCacheStats();
  console.log(`Cache hits: ${stats.cacheReadTokens} tokens`);
  console.log(`Saved: $${stats.estimatedSavings.toFixed(4)}`);

  return ctx.use(analysis);
});
```

## Cache Segment Manager

Access the cache API via `ctx.cache`:

### Adding System Prompts

System prompts are always safe to cache:

```typescript
ctx.cache.addSystemPrompt('You are a helpful assistant.');
```

**Anthropic:**

- Default TTL: '5m'
- Min tokens: 1024-4096 (model-specific)
- Max 4 cache breakpoints per request

**OpenAI:**

- Automatic caching (no explicit control)
- Min tokens: 1024

### Adding Developer Content

Developer content is owned by you (not user-submitted):

```typescript
ctx.cache.addDeveloperContent(documentationText, {
  ttl: '1h',
  scope: 'persistent',
});
```

**Options:**

- `ttl` - Time-to-live: `'5m'` | `'1h'` | `'1d'` (Anthropic only)
- `scope` - Cache scope:
  - `'ephemeral'` - Short-lived, request-specific
  - `'persistent'` - Long-lived, shared across requests
  - `'allow-user-content'` - **Dangerous:** explicitly allow user content

**TTL Guidelines:**

| TTL | Use Case                        | Cost       |
| --- | ------------------------------- | ---------- |
| 5m  | Single session, rapid iteration | Base rate  |
| 1h  | Multi-session workflows         | 10% higher |
| 1d  | Static documentation/prompts    | 20% higher |

See [Anthropic pricing](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching#pricing) for details.

### Safe-by-Default Policy

```typescript
// ❌ REJECTED: User content without explicit opt-in
ctx.cache.addDeveloperContent(userQuery); // Error!

// ✅ ALLOWED: Explicit opt-in with understanding
ctx.cache.addDeveloperContent(userQuery, {
  scope: 'allow-user-content',
  ttl: '5m',
});

// ⚠️ WARNING: Think carefully before caching user data
// - May cache PII/sensitive information
// - May leak between users if not properly scoped
// - May violate privacy policies
```

**Why safe-by-default?**
Caching user input can accidentally:

- Store PII indefinitely
- Leak data across user sessions
- Violate GDPR/CCPA compliance
- Mix privileged and public data

Only use `'allow-user-content'` when you're certain it's safe.

## Provider-Specific Behavior

### Anthropic

**Cache Control Points:**

- System prompts
- Developer content segments
- Each segment becomes a cache breakpoint

**Minimum Token Thresholds:**

| Model                      | Min Tokens |
| -------------------------- | ---------- |
| claude-3-5-sonnet-20241022 | 1024       |
| claude-3-5-haiku-20241022  | 2048       |
| claude-3-opus-20240229     | 1024       |
| claude-3-sonnet-20240229   | 2048       |
| claude-3-haiku-20240307    | 4096       |

**TTL and Breakpoint Ordering:**

```typescript
// ✅ VALID: Longer TTL before shorter
ctx.cache.addDeveloperContent(docA, {ttl: '1h'});
ctx.cache.addDeveloperContent(docB, {ttl: '5m'});

// ❌ INVALID: Shorter TTL before longer
ctx.cache.addDeveloperContent(docC, {ttl: '5m'});
ctx.cache.addDeveloperContent(docD, {ttl: '1h'}); // Error!
```

**Max 4 Breakpoints:**

```typescript
ctx.cache.addSystemPrompt('...'); // Breakpoint 1
ctx.cache.addDeveloperContent('...'); // Breakpoint 2
ctx.cache.addDeveloperContent('...'); // Breakpoint 3
ctx.cache.addDeveloperContent('...'); // Breakpoint 4
ctx.cache.addDeveloperContent('...'); // Error: exceeds limit
```

### OpenAI

**Automatic Caching:**

- No explicit cache control
- Automatically caches prompts > 1024 tokens
- 1-hour TTL (not configurable)
- Free cache reads

**Detection:**

```typescript
const stats = await ctx.getCacheStats();
// OpenAI reports cache hits in usage.prompt_tokens_details.cached_tokens
console.log(stats.cacheReadTokens); // Automatically detected
```

## Cache Metrics

Track cache performance:

```typescript
const stats = await ctx.getCacheStats();

console.log(stats);
// {
//   cacheCreationInputTokens: 2048,   // Tokens written to cache
//   cacheReadInputTokens: 2048,       // Tokens read from cache
//   inputTokens: 2100,                // Total input tokens
//   outputTokens: 150,                // Output tokens generated
//   cacheHitRate: 0.975,              // Cache hit rate
//   estimatedSavings: 0.0234,         // Estimated $ saved
//   provider: 'anthropic',
// }
```

### Aggregating Metrics Across Multiple Calls

```typescript
import {aggregateCacheMetrics} from '@mullion/ai-sdk';

const call1Stats = await ctx.getCacheStats();
const call2Stats = await ctx.getCacheStats();

const total = aggregateCacheMetrics([call1Stats, call2Stats]);
console.log(`Total saved: $${total.estimatedSavings}`);
```

## Cache Warmup for Fork

When using `fork()`, cache warmup ensures subsequent branches benefit from cache:

```typescript
const result = await ctx.fork({
  branches: {
    compliance: (c) => c.infer(ComplianceSchema, 'Check policy'),
    quality: (c) => c.infer(QualitySchema, 'Check quality'),
    tags: (c) => c.infer(TagsSchema, 'Extract tags'),
  },
  strategy: 'cache-optimized',
  warmup: 'first-branch', // Run first branch to prime cache
});
```

**Without Warmup:**

```
Branch 1: Cache MISS (writes cache)
Branch 2: Cache MISS (parallel, cache not available yet)
Branch 3: Cache MISS (parallel, cache not available yet)
Total: 0% cache hits
```

**With Warmup:**

```
Warmup (first branch): Cache MISS (writes cache)
Branch 2: Cache HIT (reads from cache)
Branch 3: Cache HIT (reads from cache)
Total: 67% cache hits (2/3 branches)
```

### Warmup Strategies

```typescript
import {firstBranchWarmup, explicitWarmup} from '@mullion/ai-sdk';

// 1. First Branch Warmup (automatic)
const result = await ctx.fork({
  branches: {a: fnA, b: fnB, c: fnC},
  warmup: 'first-branch', // Runs 'a', then 'b' and 'c' in parallel
});

// 2. Explicit Warmup (manual control)
const result = await ctx.fork({
  branches: {a: fnA, b: fnB, c: fnC},
  warmup: explicitWarmup({
    content: sharedContext,
    schema: SharedSchema, // Optional: prime schema cache
  }),
});

// 3. No Warmup (fast-parallel)
const result = await ctx.fork({
  branches: {a: fnA, b: fnB, c: fnC},
  strategy: 'fast-parallel', // No warmup, all parallel
});
```

### Estimating Warmup Cost

```typescript
import {estimateWarmupCost, shouldWarmup} from '@mullion/ai-sdk';

const estimate = await estimateWarmupCost({
  content: largeDocument,
  model: 'claude-3-5-sonnet-20241022',
  numBranches: 5,
});

console.log(estimate);
// {
//   warmupCost: 0.0150,        // Cost of warmup call
//   withoutWarmupCost: 0.0450, // Cost if no warmup (5 × full cost)
//   withWarmupCost: 0.0240,    // Warmup + 4 cached calls
//   savings: 0.0210,           // Net savings
//   recommendWarmup: true,
// }

// Automatic recommendation
if (shouldWarmup(estimate)) {
  // Use cache-optimized
} else {
  // Use fast-parallel
}
```

**When to Warmup:**

- ✅ Large shared context (>2000 tokens)
- ✅ Multiple branches (3+)
- ✅ Anthropic provider (OpenAI auto-caches)
- ❌ Small context (<1000 tokens)
- ❌ Single branch
- ❌ Ultra-low latency requirements

## Schema Conflict Detection

When fork branches use different schemas, they create different tool definitions → different cache keys → no cache reuse.

Mullion automatically detects schema conflicts:

```typescript
const result = await ctx.fork({
  branches: {
    simple: (c) => c.infer(SimpleSchema, prompt),
    complex: (c) => c.infer(ComplexSchema, prompt), // Different schema!
  },
  onSchemaConflict: 'warn', // or 'error', 'ignore'
});

// Console warning:
// "Schema conflict detected: branches use different schemas, cache reuse limited"
```

**Behaviors:**

- `'warn'` - Log warning, continue (default)
- `'error'` - Throw error, prevent execution
- `'ignore'` - Silent, no detection

**Best Practice:**
Use the same schema for all branches when possible:

```typescript
// ✅ GOOD: Same schema, full cache reuse
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

// ❌ BAD: Different schemas, no cache reuse
const result = await ctx.fork({
  branches: {
    model1: (c) => c.infer(ComplianceSchema, prompt),
    model2: (c) => c.infer(QualitySchema, prompt),
  },
});
```

## Configuration

### Model-Specific Thresholds

Override default thresholds:

```typescript
import {createDefaultCacheConfig} from '@mullion/ai-sdk';

const config = createDefaultCacheConfig('anthropic', {
  model: 'claude-3-5-sonnet-20241022',
  minTokens: 2048, // Override default 1024
  maxBreakpoints: 3, // Override default 4
});
```

### Custom Provider Adapters

Integrate custom caching logic:

```typescript
import {createAnthropicAdapter} from '@mullion/ai-sdk';

const adapter = createAnthropicAdapter({
  minTokens: 2048,
  maxBreakpoints: 4,
  defaultTtl: '5m',
});

// Use with client
const client = createMullionClient(model, {
  cache: {
    adapter,
    enabled: true,
  },
});
```

## Cost Savings Examples

### Example 1: Documentation Q&A

**Scenario:**

- 10,000 token documentation (cached)
- 50 user queries/hour
- Claude 3.5 Sonnet

**Without Caching:**

```
50 queries × 10,000 input tokens = 500,000 tokens/hour
Cost: 500,000 × $0.000003 = $1.50/hour
```

**With Caching (5m TTL):**

```
First query: 10,000 tokens write = $0.03375 (cache write cost)
Next 49 queries: 49 × 10,000 × $0.0000003 = $0.147 (cache read cost)
Total: $0.18/hour
Savings: $1.32/hour (88%)
```

### Example 2: Fork with 5 Branches

**Without Warmup:**

```
5 branches × 5,000 tokens = 25,000 input tokens
Cost: 25,000 × $0.000003 = $0.075
```

**With Warmup:**

```
Warmup: 5,000 × $0.00001125 = $0.05625 (cache write)
4 branches: 4 × 5,000 × $0.0000003 = $0.006 (cache read)
Total: $0.06225
Savings: $0.01275 (17%)
```

As document size and branch count increase, savings multiply.

## Best Practices

### 1. Cache Static Content

```typescript
// ✅ GOOD: Cache documentation, system prompts
ctx.cache.addSystemPrompt(SYSTEM_PROMPT);
ctx.cache.addDeveloperContent(docs, {ttl: '1d', scope: 'persistent'});

// ❌ BAD: Don't cache frequently changing content
ctx.cache.addDeveloperContent(realtimeData); // Wastes cache writes
```

### 2. Use Appropriate TTLs

```typescript
// ✅ GOOD: Match TTL to content lifecycle
ctx.cache.addDeveloperContent(staticDocs, {ttl: '1d'});
ctx.cache.addDeveloperContent(sessionContext, {ttl: '5m'});

// ❌ BAD: Long TTL for ephemeral content
ctx.cache.addDeveloperContent(tempData, {ttl: '1d'}); // Wastes money
```

### 3. Measure Cache Performance

```typescript
const stats = await ctx.getCacheStats();

if (stats.cacheHitRate < 0.5) {
  logger.warn('Low cache hit rate', {
    hitRate: stats.cacheHitRate,
    context: 'Consider increasing TTL or cache scope',
  });
}
```

### 4. Never Cache PII Without Review

```typescript
// ❌ DANGEROUS: Caching user data without review
ctx.cache.addDeveloperContent(userData, {
  scope: 'allow-user-content', // DON'T DO THIS
});

// ✅ SAFE: Only cache non-sensitive, derived data
const summary = await ctx.infer(SummarySchema, userData);
ctx.cache.addDeveloperContent(summary.value.nonSensitiveSummary);
```

## Troubleshooting

### Cache Not Working

**Symptom:** `cacheReadTokens` always 0

**Possible causes:**

1. Content below minimum token threshold
2. Cache not primed (first call)
3. TTL expired
4. Schema changed between calls
5. Different cache scope/breakpoint ordering

**Debug:**

```typescript
import {getCacheCapabilities} from '@mullion/ai-sdk';

const caps = getCacheCapabilities('anthropic', 'claude-3-5-sonnet-20241022');
console.log(`Min tokens: ${caps.minTokens}`);
console.log(`Supports cache: ${caps.supportsCache}`);

// Estimate tokens
import {estimateTokens} from '@mullion/ai-sdk';
const estimate = estimateTokens(content);
console.log(`Content tokens: ${estimate.tokens} (min: ${caps.minTokens})`);
```

### Schema Conflict Warnings

**Symptom:** Console warnings about schema conflicts

**Solution:**
Use unified schemas for fork branches:

```typescript
// Before: Different schemas
const result = await ctx.fork({
  branches: {
    a: (c) => c.infer(SchemaA, prompt),
    b: (c) => c.infer(SchemaB, prompt),
  },
});

// After: Unified schema
const UnifiedSchema = z.object({
  resultA: SchemaA,
  resultB: SchemaB,
});

const result = await ctx.fork({
  branches: {
    a: (c) => c.infer(UnifiedSchema, prompt),
    b: (c) => c.infer(UnifiedSchema, prompt),
  },
});
```

## See Also

- [Cost Estimation](./cost-estimation.md) - Calculate cache savings
- [Fork API](./fork.md) - Parallel execution with cache optimization
- [Merge Strategies](./merge-strategies.md) - Aggregating cached results
- [Anthropic Prompt Caching Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
