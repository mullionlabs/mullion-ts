# Merge Strategies

When using `fork()` to run parallel inferences, you'll need to merge the results. Mullion provides 6 built-in merge strategies for different data types and aggregation patterns.

## Overview

All merge strategies:

- Accept an array of `Owned<T, S>` values
- Return a `MergeResult<T>` with aggregated value and provenance
- Use confidence scores to weight contributions
- Track which branches contributed to the final result

## Built-in Strategies

### 1. Categorical Weighted Vote

**Use when:** You have categorical/enum values and want the most common choice weighted by confidence.

```typescript
import { categorical } from '@mullion/core';

const SentimentSchema = z.enum(['positive', 'negative', 'neutral']);

const result = await ctx.fork({
  branches: {
    model1: (c) => c.infer(SentimentSchema, text),
    model2: (c) => c.infer(SentimentSchema, text),
    model3: (c) => c.infer(SentimentSchema, text),
  },
});

const merged = merge(result, {
  strategy: categorical.weightedVote({
    tiebreaker: 'highest-confidence', // or 'first-seen', 'lowest-entropy'
  }),
});

console.log(merged.value); // 'positive'
console.log(merged.confidence); // 0.92
console.log(merged.provenance); // ['model1', 'model3']
```

**Options:**

- `tiebreaker` - How to break ties: `'highest-confidence'` | `'first-seen'` | `'lowest-entropy'`

**Algorithm:**

1. For each unique value, sum: `value_score = Σ(confidence_i)` for all branches with that value
2. Winner = value with highest score
3. Final confidence = winner_score / total_score

### 2. Continuous Weighted Average

**Use when:** You have numeric values and want a confidence-weighted average.

```typescript
import { continuous } from '@mullion/core';

const PriceSchema = z.object({
  amount: z.number(),
  currency: z.string(),
});

const result = await ctx.fork({
  branches: {
    estimator1: (c) => c.infer(PriceSchema, description),
    estimator2: (c) => c.infer(PriceSchema, description),
    estimator3: (c) => c.infer(PriceSchema, description),
  },
});

const merged = merge(result, {
  strategy: continuous.weightedAverage({
    field: 'amount', // Which field to average
    outlierThreshold: 2.0, // Remove values > 2 std deviations
  }),
});

console.log(merged.value.amount); // 45.67 (weighted average)
console.log(merged.metadata.mean); // Unweighted mean
console.log(merged.metadata.stdDev); // Standard deviation
console.log(merged.metadata.outliers); // Removed outliers
```

**Options:**

- `field` - Which numeric field to average (optional if T is number)
- `outlierThreshold` - Remove outliers beyond N standard deviations (default: none)
- `minSamples` - Minimum branches required (default: 1)

**Algorithm:**

1. Filter outliers if threshold set
2. Compute: `weighted_avg = Σ(value_i × confidence_i) / Σ(confidence_i)`
3. Final confidence = average of contributing confidences

### 3. Object Fieldwise Merge

**Use when:** You have objects and want to merge field-by-field with conflict detection.

```typescript
import { object } from '@mullion/core';

const MetadataSchema = z.object({
  title: z.string(),
  author: z.string(),
  tags: z.array(z.string()),
  priority: z.number(),
});

const result = await ctx.fork({
  branches: {
    extractor1: (c) => c.infer(MetadataSchema, document),
    extractor2: (c) => c.infer(MetadataSchema, document),
  },
});

const merged = merge(result, {
  strategy: object.fieldwise({
    fieldStrategies: {
      title: categorical.weightedVote(), // Use voting for title
      author: categorical.weightedVote(),
      tags: array.concat(), // Combine all tags
      priority: continuous.weightedAverage(), // Average priority
    },
    onConflict: 'use-highest-confidence', // or 'error', 'warn'
  }),
});
```

**Options:**

- `fieldStrategies` - Per-field merge strategy map
- `onConflict` - How to handle field-level conflicts: `'use-highest-confidence'` | `'error'` | `'warn'`

**Conflicts:**
A conflict occurs when:

- Different strategies disagree on a field value
- No clear winner by confidence
- Tie in voting

### 4. Array Concatenation

**Use when:** You have arrays and want to combine + deduplicate.

```typescript
import { array } from '@mullion/core';

const KeywordsSchema = z.object({
  keywords: z.array(z.string()),
});

const result = await ctx.fork({
  branches: {
    extractor1: (c) => c.infer(KeywordsSchema, text),
    extractor2: (c) => c.infer(KeywordsSchema, text),
    extractor3: (c) => c.infer(KeywordsSchema, text),
  },
});

const merged = merge(result, {
  strategy: array.concat({
    deduplicate: true, // Remove duplicates
    scoreThreshold: 0.7, // Only include from branches with confidence >= 0.7
    maxItems: 20, // Limit result size
  }),
});
```

**Options:**

- `deduplicate` - Remove duplicates (default: true)
- `scoreThreshold` - Min confidence to include branch (default: 0)
- `maxItems` - Max items in result array (default: unlimited)
- `field` - Which field to concat if T is object with array field

**Deduplication:**

- Uses strict equality (`===`) by default
- For objects, provide custom `isEqual` function

### 5. Custom Merge Function

**Use when:** You need custom aggregation logic.

```typescript
import { custom } from '@mullion/core';

const merged = merge(result, {
  strategy: custom((values) => {
    // values: Array<Owned<T, S>>

    // Your custom logic
    const aggregated = /* ... */;

    return {
      value: aggregated,
      confidence: 0.85, // Your confidence calculation
      provenance: values.map(v => v.traceId),
    };
  }),
});
```

**Custom function signature:**

```typescript
type CustomMergeFn<T, S extends string> = (
  values: Array<Owned<T, S>>
) => MergeResult<T>;
```

### 6. Require Consensus

**Use when:** You need k-of-n agreement to accept result.

```typescript
import { requireConsensus } from '@mullion/core';

const DecisionSchema = z.object({
  approve: z.boolean(),
  risk: z.enum(['low', 'medium', 'high']),
});

const result = await ctx.fork({
  branches: {
    reviewer1: (c) => c.infer(DecisionSchema, proposal),
    reviewer2: (c) => c.infer(DecisionSchema, proposal),
    reviewer3: (c) => c.infer(DecisionSchema, proposal),
  },
});

const merged = merge(result, {
  strategy: requireConsensus({
    k: 2, // Require 2 out of 3 agreement
    baseStrategy: categorical.weightedVote(),
    onFailure: 'lower-confidence', // or 'error', 'return-null'
  }),
});

if (merged.consensus.met) {
  console.log('Consensus achieved:', merged.value);
} else {
  console.log('No consensus - needs human review');
}
```

**Options:**

- `k` - Required number of agreeing branches (default: Math.ceil(n/2))
- `baseStrategy` - Strategy to use for determining agreement
- `onFailure` - What to do if consensus not met:
  - `'lower-confidence'` - Return best guess with low confidence
  - `'error'` - Throw error
  - `'return-null'` - Return null value

**Consensus calculation:**

1. Apply base strategy to get primary value
2. Count how many branches produced same/similar value
3. If count >= k, consensus met
4. Otherwise, apply failure behavior

## Combining Strategies

You can nest strategies for complex scenarios:

```typescript
const merged = merge(result, {
  strategy: object.fieldwise({
    fieldStrategies: {
      // Require consensus on critical decision
      approve: requireConsensus({
        k: 3,
        baseStrategy: categorical.weightedVote(),
      }),
      // Average numeric scores
      riskScore: continuous.weightedAverage(),
      // Combine all findings
      findings: array.concat({ deduplicate: true }),
    },
  }),
});
```

## Confidence Calculation

Each strategy calculates final confidence differently:

| Strategy           | Confidence Calculation                     |
| ------------------ | ------------------------------------------ |
| Categorical Vote   | Winner's total score / All scores          |
| Continuous Average | Average of contributing confidences        |
| Object Fieldwise   | Minimum of all field confidences           |
| Array Concat       | Average confidence of included branches    |
| Custom             | Returned by your function                  |
| Require Consensus  | Base strategy confidence × consensus ratio |

## Provenance Tracking

All strategies track which branches contributed:

```typescript
const merged = merge(result, { strategy: categorical.weightedVote() });

console.log(merged.provenance);
// {
//   sources: ['branch1', 'branch2'], // Which branches contributed to final value
//   conflicts: [],                   // Any conflicts detected
//   strategy: 'categorical.weightedVote',
//   mergedAt: '2024-01-15T10:30:00Z',
// }
```

## Best Practices

### 1. Choose the Right Strategy

| Data Type      | Recommended Strategy           |
| -------------- | ------------------------------ |
| Enum/Category  | `categorical.weightedVote()`   |
| Number         | `continuous.weightedAverage()` |
| Object         | `object.fieldwise()`           |
| Array          | `array.concat()`               |
| Boolean        | `categorical.weightedVote()`   |
| Complex/Custom | `custom()`                     |

### 2. Use Consensus for Critical Decisions

```typescript
// ✅ GOOD: Require agreement for high-stakes decisions
const decision = merge(reviews, {
  strategy: requireConsensus({
    k: Math.ceil(reviews.length * 0.75), // 75% agreement
    onFailure: 'error',
  }),
});

// ❌ BAD: Single model decides financial transaction
const decision = await ctx.infer(ApprovalSchema, transaction);
if (decision.value.approve) processPayment();
```

### 3. Handle Conflicts Explicitly

```typescript
const merged = merge(result, {
  strategy: object.fieldwise({
    onConflict: 'warn', // Log conflicts for review
  }),
});

if (merged.conflicts.length > 0) {
  logger.warn('Merge conflicts detected', {
    conflicts: merged.conflicts,
    traceId: merged.traceId,
  });
  // Consider manual review
}
```

### 4. Set Confidence Thresholds

```typescript
const merged = merge(result, { strategy: categorical.weightedVote() });

if (merged.confidence < 0.8) {
  // Low confidence in merged result
  throw new Error('Insufficient agreement between models');
}
```

## See Also

- [Fork API](./fork.md) - Parallel execution patterns
- [Cost Estimation](./cost-estimation.md) - Track merge operation costs
- [Caching](./caching.md) - Cache optimization for fork/merge
