---
'@mullion/ai-sdk': minor
---

Add comprehensive cost calculation with cache savings analysis

Implements Task 10.3: Cost Calculation with the following features:

- `calculateCost(usage, cacheStats, model)` for actual API call cost analysis
- `estimateCost()` for pre-call cost estimation
- `calculateBatchCost()` for aggregating costs across multiple calls
- `formatCostBreakdown()` for human-readable cost display
- `compareCosts()` for comparing estimated vs actual costs

Cost breakdown includes:

- Input tokens cost (non-cached)
- Output tokens cost
- Cache write cost (Anthropic only)
- Cache read cost (10% of input for Anthropic, free for OpenAI)
- Total cost and savings analysis
- Savings percentage vs no-cache baseline

Key features:

- Supports both OpenAI (free cache) and Anthropic (paid cache)
- Correctly handles cache economics (write costs vs read savings)
- Can show negative savings when cache write cost exceeds immediate benefit
- Batch cost aggregation for multi-call workflows
- Cost comparison for estimate accuracy validation

Example: 10k tokens on Claude 3.5 Sonnet with 80% cache hit

- No cache: $0.0375
- With cache: $0.0159 (57.6% savings)

Comprehensive test suite with 30 test cases covering various scenarios including large-scale processing, batch operations, and cache cost analysis.
