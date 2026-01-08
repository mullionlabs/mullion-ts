---
'@mullion/ai-sdk': minor
---

Add cost tracking integration to Mullion context

Implements Task 10.4: Context Cost Integration with the following features:

- `getLastCallCost()` - Returns cost breakdown from last API call
- `estimateNextCallCost()` - Pre-call cost estimation for decision making
- Automatic cost tracking for all `infer()` calls
- Integration with existing cache metrics system

New MullionContext methods:

```typescript
interface MullionContext<S> extends Context<S> {
  getLastCallCost(): CostBreakdown | null;
  estimateNextCallCost(
    prompt: string,
    estimatedOutputTokens?: number
  ): CostBreakdown;
}
```

Features:

- Automatic cost calculation after each `infer()` call
- Uses actual token usage from API response
- Combines with cache stats for accurate savings analysis
- Token estimation based on prompt text
- Model-specific pricing support

Example usage:

```typescript
const client = createMullionClient(model, {
  provider: 'openai',
  model: 'gpt-4',
});

await client.scope('test', async (ctx) => {
  // Estimate before call
  const estimate = ctx.estimateNextCallCost(longPrompt);
  if (estimate.totalCost > 0.1) {
    console.warn('Expensive call!');
  }

  // Make call
  await ctx.infer(schema, longPrompt);

  // Get actual cost
  const actual = ctx.getLastCallCost();
  console.log(`Cost: $${actual.totalCost.toFixed(4)}`);
  console.log(`Savings: ${actual.savingsPercent.toFixed(1)}%`);
});
```

Completes Task 10 (Cost Estimation) with full integration into the context API for real-time cost tracking and decision making.
