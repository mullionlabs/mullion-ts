# Cost Estimation

Mullion provides comprehensive cost estimation and tracking for LLM operations, helping you understand and control expenses.

## Overview

Cost transparency features:

- ✅ Pre-call estimation (predict costs before API call)
- ✅ Post-call tracking (actual costs with cache savings)
- ✅ Multi-provider pricing (OpenAI, Anthropic, extensible)
- ✅ Cache savings calculation
- ✅ Batch cost analysis
- ✅ Custom pricing overrides

## Quick Start

### Basic Cost Tracking

```typescript
import {createMullionClient} from '@mullion/ai-sdk';
import {anthropic} from '@ai-sdk/anthropic';

const client = createMullionClient(anthropic('claude-3-5-sonnet-20241022'));

const result = await client.scope('analysis', async (ctx) => {
  // Estimate cost before calling
  const estimate = await ctx.estimateNextCallCost(schema, input);
  console.log(`Estimated: $${estimate.totalCost.toFixed(4)}`);

  // Make the actual call
  const data = await ctx.infer(schema, input);

  // Check actual cost
  const actual = await ctx.getLastCallCost();
  console.log(`Actual: $${actual.totalCost.toFixed(4)}`);
  console.log(`Cache saved: $${actual.cacheSavings.toFixed(4)}`);
  console.log(
    `Difference: ${(((actual.totalCost - estimate.totalCost) / estimate.totalCost) * 100).toFixed(1)}%`,
  );

  return ctx.use(data);
});
```

## Token Estimation

### Estimating Input Tokens

```typescript
import {estimateTokens} from '@mullion/ai-sdk';

const text = 'Your input text here...';

const estimate = estimateTokens(text, 'gpt-4');
console.log(estimate);
// {
//   tokens: 847,
//   method: 'tiktoken',  // or 'approximation'
//   confidence: 'high',  // or 'medium', 'low'
// }
```

**Estimation methods:**

| Provider  | Method           | Accuracy |
| --------- | ---------------- | -------- |
| OpenAI    | tiktoken (exact) | High     |
| Anthropic | Approximation    | Medium   |
| Other     | Char-based       | Low      |

**Approximation formula (Anthropic):**

```
tokens ≈ characters / 4
```

This is conservative (tends to overestimate) to avoid cost surprises.

### Estimating Cache Segments

```typescript
import {estimateTokensForSegments} from '@mullion/ai-sdk';

const segments = [
  {content: systemPrompt, type: 'system'},
  {content: documentation, type: 'developer'},
];

const estimate = estimateTokensForSegments(
  segments,
  'claude-3-5-sonnet-20241022',
);
console.log(estimate);
// {
//   totalTokens: 2847,
//   segments: [
//     { type: 'system', tokens: 45 },
//     { type: 'developer', tokens: 2802 },
//   ],
//   cacheableTokens: 2802,
//   belowThreshold: false,
// }
```

## Pricing Data

### Getting Pricing for a Model

```typescript
import {getPricing} from '@mullion/ai-sdk';

const pricing = getPricing('claude-3-5-sonnet-20241022');
console.log(pricing);
// {
//   modelId: 'claude-3-5-sonnet-20241022',
//   provider: 'anthropic',
//   inputTokenPrice: 0.000003,
//   outputTokenPrice: 0.000015,
//   cacheWritePrice: 0.00001125,     // 3.75× input price
//   cacheReadPrice: 0.0000003,        // 0.1× input price
//   currency: 'USD',
//   effectiveDate: '2024-10-22',
// }
```

### Supported Models

#### Anthropic

| Model                      | Input    | Output   | Cache Write | Cache Read |
| -------------------------- | -------- | -------- | ----------- | ---------- |
| claude-3-5-sonnet-20241022 | $3/MTok  | $15/MTok | $11.25/MTok | $0.30/MTok |
| claude-3-5-haiku-20241022  | $1/MTok  | $5/MTok  | $3.75/MTok  | $0.10/MTok |
| claude-3-opus-20240229     | $15/MTok | $75/MTok | $56.25/MTok | $1.50/MTok |

#### OpenAI

| Model         | Input      | Output     | Cache Read |
| ------------- | ---------- | ---------- | ---------- |
| gpt-4o        | $2.50/MTok | $10/MTok   | Free       |
| gpt-4o-mini   | $0.15/MTok | $0.60/MTok | Free       |
| gpt-4-turbo   | $10/MTok   | $30/MTok   | N/A        |
| gpt-3.5-turbo | $0.50/MTok | $1.50/MTok | N/A        |

_MTok = 1 million tokens_

### Custom Pricing

Override or add pricing:

```typescript
import {importPricingFromJSON, PRICING_DATA} from '@mullion/ai-sdk';

// Add custom model
PRICING_DATA['custom-model-v1'] = {
  modelId: 'custom-model-v1',
  provider: 'custom',
  inputTokenPrice: 0.000002,
  outputTokenPrice: 0.000008,
  currency: 'USD',
  effectiveDate: '2024-01-01',
};

// Or import from JSON
const customPricing = {
  'custom-model-v1': {
    modelId: 'custom-model-v1',
    provider: 'custom',
    inputTokenPrice: 0.000002,
    outputTokenPrice: 0.000008,
  },
};

importPricingFromJSON(customPricing);
```

### Exporting Pricing Data

```typescript
import {exportPricingAsJSON} from '@mullion/ai-sdk';

const pricingJson = exportPricingAsJSON();
fs.writeFileSync('pricing.json', JSON.stringify(pricingJson, null, 2));
```

## Cost Calculation

### Single Inference Cost

```typescript
import {calculateCost} from '@mullion/ai-sdk';

const cost = calculateCost({
  modelId: 'claude-3-5-sonnet-20241022',
  usage: {
    inputTokens: 1000,
    outputTokens: 200,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  },
});

console.log(cost);
// {
//   inputCost: 0.003,
//   outputCost: 0.003,
//   cacheWriteCost: 0,
//   cacheReadCost: 0,
//   totalCost: 0.006,
//   cacheSavings: 0,
//   netCost: 0.006,
//   breakdown: {
//     inputTokens: 1000,
//     outputTokens: 200,
//     cacheCreationTokens: 0,
//     cacheReadTokens: 0,
//   },
// }
```

### With Cache Savings

```typescript
const cost = calculateCost({
  modelId: 'claude-3-5-sonnet-20241022',
  usage: {
    inputTokens: 200, // Non-cached input
    outputTokens: 150,
    cacheCreationTokens: 5000, // Initial cache write
    cacheReadTokens: 5000, // Cache hit
  },
});

console.log(cost);
// {
//   inputCost: 0.0006,              // 200 × $0.000003
//   outputCost: 0.00225,            // 150 × $0.000015
//   cacheWriteCost: 0.05625,        // 5000 × $0.00001125
//   cacheReadCost: 0.0015,          // 5000 × $0.0000003
//   totalCost: 0.0606,
//   cacheSavings: 0.0135,           // What we would have paid without cache
//   netCost: 0.0471,                // Total - savings
// }
```

**Cache savings calculation:**

```
Without cache: 5000 tokens × $0.000003 = $0.015
With cache: 5000 tokens × $0.0000003 = $0.0015
Savings: $0.015 - $0.0015 = $0.0135 (90%)
```

### Batch Cost Analysis

```typescript
import {calculateBatchCost} from '@mullion/ai-sdk';

const costs = calculateBatchCost([
  {modelId: 'gpt-4o', usage: {inputTokens: 1000, outputTokens: 200}},
  {modelId: 'gpt-4o', usage: {inputTokens: 1500, outputTokens: 300}},
  {
    modelId: 'claude-3-5-sonnet-20241022',
    usage: {inputTokens: 2000, outputTokens: 400},
  },
]);

console.log(costs);
// {
//   totalCost: 0.0345,
//   totalInputTokens: 4500,
//   totalOutputTokens: 900,
//   totalCacheSavings: 0,
//   byModel: {
//     'gpt-4o': { count: 2, totalCost: 0.0275 },
//     'claude-3-5-sonnet-20241022': { count: 1, totalCost: 0.007 },
//   },
// }
```

## Estimation Accuracy

### Compare Estimate vs Actual

```typescript
import {compareCosts} from '@mullion/ai-sdk';

const estimate = await ctx.estimateNextCallCost(schema, input);
const result = await ctx.infer(schema, input);
const actual = await ctx.getLastCallCost();

const comparison = compareCosts(estimate, actual);
console.log(comparison);
// {
//   estimatedCost: 0.0045,
//   actualCost: 0.0048,
//   difference: 0.0003,
//   percentDifference: 6.67,
//   wasUnderestimated: true,
//   reason: 'Output tokens exceeded estimate',
// }
```

**Why estimates differ:**

1. **Output tokens unpredictable** - Models generate variable-length responses
2. **Cache behavior** - Hard to predict cache hits/misses
3. **Token counting** - Estimation vs actual tokenization
4. **Model-specific overhead** - Some models use more tokens than estimated

**Typical accuracy:**

- Input tokens: ±5%
- Output tokens: ±20-50% (highly variable)
- Total cost: ±10-30%

### Improving Estimates

```typescript
// Provide expected output length
const estimate = await ctx.estimateNextCallCost(schema, input, {
  expectedOutputTokens: 300, // Default is 150
});

// Or use historical data
const avgOutputTokens = calculateAverageOutputTokens(previousCalls);
const estimate = await ctx.estimateNextCallCost(schema, input, {
  expectedOutputTokens: avgOutputTokens,
});
```

## Cost Formatting

### Human-Readable Output

```typescript
import {formatCostBreakdown} from '@mullion/ai-sdk';

const cost = await ctx.getLastCallCost();
const formatted = formatCostBreakdown(cost);

console.log(formatted);
```

Output:

```
Cost Breakdown:
  Input:        1,000 tokens × $0.000003 = $0.0030
  Output:         200 tokens × $0.000015 = $0.0030
  Cache Write:  5,000 tokens × $0.000011 = $0.0563
  Cache Read:   5,000 tokens × $0.000000 = $0.0015
  ─────────────────────────────────────────────────
  Total:                                  $0.0608
  Cache Savings:                         -$0.0135
  Net Cost:                               $0.0473
```

## Cost Monitoring Patterns

### Budget Alerts

```typescript
const DAILY_BUDGET = 10.0; // $10/day
let dailySpend = 0;

async function monitoredInference(ctx, schema, input) {
  const estimate = await ctx.estimateNextCallCost(schema, input);

  if (dailySpend + estimate.totalCost > DAILY_BUDGET) {
    throw new Error(
      `Budget exceeded: $${dailySpend.toFixed(2)} + $${estimate.totalCost.toFixed(4)} > $${DAILY_BUDGET}`,
    );
  }

  const result = await ctx.infer(schema, input);
  const actual = await ctx.getLastCallCost();

  dailySpend += actual.netCost;

  logger.info('Inference cost', {
    estimated: estimate.totalCost,
    actual: actual.netCost,
    dailySpend,
    budgetRemaining: DAILY_BUDGET - dailySpend,
  });

  return result;
}
```

### Cost Per Request Tracking

```typescript
class CostTracker {
  private costs: Map<string, CostBreakdown> = new Map();

  async trackInference(
    requestId: string,
    ctx: Context,
    schema: any,
    input: string,
  ) {
    const result = await ctx.infer(schema, input);
    const cost = await ctx.getLastCallCost();

    this.costs.set(requestId, cost);

    return result;
  }

  getTotalCost(): number {
    return Array.from(this.costs.values()).reduce(
      (sum, cost) => sum + cost.netCost,
      0,
    );
  }

  getCostByRequest(requestId: string): CostBreakdown | undefined {
    return this.costs.get(requestId);
  }

  getHighestCostRequests(limit: number = 10) {
    return Array.from(this.costs.entries())
      .sort(([, a], [, b]) => b.netCost - a.netCost)
      .slice(0, limit);
  }
}
```

### Cache ROI Analysis

```typescript
function analyzeCacheROI(costs: CostBreakdown[]) {
  const totalCacheWrites = costs.reduce((sum, c) => sum + c.cacheWriteCost, 0);
  const totalCacheReads = costs.reduce((sum, c) => sum + c.cacheReadCost, 0);
  const totalSavings = costs.reduce((sum, c) => sum + c.cacheSavings, 0);

  const netCacheBenefit = totalSavings - totalCacheWrites;
  const roi = (netCacheBenefit / totalCacheWrites) * 100;

  return {
    totalInvested: totalCacheWrites,
    totalSaved: totalSavings,
    netBenefit: netCacheBenefit,
    roi: roi,
    recommendation: roi > 50 ? 'Keep caching' : 'Review cache strategy',
  };
}
```

## Fork/Merge Cost Tracking

### Tracking Parallel Execution Costs

```typescript
const result = await ctx.fork({
  branches: {
    compliance: (c) => c.infer(ComplianceSchema, prompt),
    quality: (c) => c.infer(QualitySchema, prompt),
    tags: (c) => c.infer(TagsSchema, prompt),
  },
  strategy: 'cache-optimized',
});

// Each branch tracks its own cost
const branchCosts = await Promise.all(
  Object.keys(result).map(async (branchName) => {
    const cost = await result[branchName].context.getLastCallCost();
    return {branch: branchName, cost};
  }),
);

const totalCost = branchCosts.reduce((sum, {cost}) => sum + cost.netCost, 0);
const totalSavings = branchCosts.reduce(
  (sum, {cost}) => sum + cost.cacheSavings,
  0,
);

console.log(`Fork total cost: $${totalCost.toFixed(4)}`);
console.log(`Fork total savings: $${totalSavings.toFixed(4)}`);
console.log(
  `Cache efficiency: ${((totalSavings / totalCost) * 100).toFixed(1)}%`,
);
```

## Best Practices

### 1. Always Estimate Before Expensive Operations

```typescript
// ✅ GOOD: Check cost before proceeding
const estimate = await ctx.estimateNextCallCost(schema, largeDocument);

if (estimate.totalCost > 0.1) {
  logger.warn('High cost operation', {estimate});
  // Maybe use smaller model or cached alternative
}

const result = await ctx.infer(schema, largeDocument);
```

### 2. Track Actual vs Estimated

```typescript
// ✅ GOOD: Monitor estimation accuracy
const estimate = await ctx.estimateNextCallCost(schema, input);
const result = await ctx.infer(schema, input);
const actual = await ctx.getLastCallCost();

const accuracy = Math.abs(
  (actual.netCost - estimate.totalCost) / estimate.totalCost,
);

if (accuracy > 0.5) {
  logger.warn('Poor cost estimation', {
    estimated: estimate.totalCost,
    actual: actual.netCost,
    accuracy: `${(accuracy * 100).toFixed(1)}%`,
  });
}
```

### 3. Aggregate Costs for Reporting

```typescript
// ✅ GOOD: Collect costs for analysis
const dailyCosts: CostBreakdown[] = [];

// After each inference
dailyCosts.push(await ctx.getLastCallCost());

// End of day
const report = calculateBatchCost(
  dailyCosts.map((c) => ({
    modelId: c.modelId,
    usage: c.breakdown,
  })),
);

logger.info('Daily cost report', report);
```

### 4. Use Cache Metrics to Optimize

```typescript
// ✅ GOOD: Monitor cache effectiveness
const cost = await ctx.getLastCallCost();

if (cost.cacheSavings > cost.cacheWriteCost * 2) {
  logger.info('Cache is cost-effective', {
    savings: cost.cacheSavings,
    writes: cost.cacheWriteCost,
    roi: ((cost.cacheSavings / cost.cacheWriteCost - 1) * 100).toFixed(1) + '%',
  });
}
```

## Troubleshooting

### Estimates Way Off

**Problem:** Actual costs 2-3× estimated

**Common causes:**

1. Output tokens much longer than expected
2. Cache misses when hits expected
3. Wrong model pricing data

**Solutions:**

```typescript
// Adjust output token estimate
const estimate = await ctx.estimateNextCallCost(schema, input, {
  expectedOutputTokens: 500, // Increase default
});

// Check cache performance
const stats = await ctx.getCacheStats();
if (stats.cacheHitRate < 0.5) {
  // Review cache strategy
}

// Verify pricing
const pricing = getPricing(modelId);
console.log('Using pricing:', pricing);
```

### Missing Cache Savings

**Problem:** `cacheSavings` is 0 when cache should be working

**Check:**

1. Cache actually hitting (check `cacheReadTokens`)
2. Pricing data includes cache pricing
3. Using supported provider (Anthropic)

```typescript
const pricing = getPricing(modelId);
if (!pricing.cacheReadPrice) {
  console.warn('Model does not support cache pricing tracking');
}
```

## See Also

- [Caching](./caching.md) - Cache strategies for cost savings
- [Fork API](./fork.md) - Parallel execution cost tracking
- [Pricing Updates](https://www.anthropic.com/pricing) - Latest Anthropic pricing
- [OpenAI Pricing](https://openai.com/api/pricing/) - Latest OpenAI pricing
