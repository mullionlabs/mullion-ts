/**
 * Cost calculation for LLM API calls with cache savings analysis
 * @module cost/calculator
 */

import type {CacheStats} from '../cache/metrics.js';
import {getPricing} from './pricing.js';
import type {ModelPricing} from './pricing.js';

/**
 * Token usage information from API response
 */
export interface TokenUsage {
  /** Total input tokens (including cached) */
  inputTokens: number;
  /** Total output tokens generated */
  outputTokens: number;
  /** Tokens read from cache (if applicable) */
  cachedTokens?: number;
}

/**
 * Detailed cost breakdown for an LLM API call
 */
export interface CostBreakdown {
  /** Cost of input tokens (non-cached) */
  inputCost: number;
  /** Cost of output tokens */
  outputCost: number;
  /** Cost of writing to cache */
  cacheWriteCost: number;
  /** Cost of reading from cache */
  cacheReadCost: number;
  /** Total cost of the API call */
  totalCost: number;
  /** Amount saved vs no cache (can be negative if cache write cost > savings) */
  savings: number;
  /** Percentage saved vs no cache (can be negative) */
  savingsPercent: number;
  /** Cost breakdown without any caching (for comparison) */
  noCacheCost: number;
  /** Model pricing used for calculation */
  pricing: ModelPricing;
}

/**
 * Calculate cost breakdown for an LLM API call
 *
 * @param usage - Token usage from API response
 * @param cacheStats - Cache statistics (if caching was used)
 * @param model - Model identifier
 * @param pricingOverrides - Optional pricing overrides
 * @returns Detailed cost breakdown with savings analysis
 *
 * @example
 * ```typescript
 * const usage = { inputTokens: 10000, outputTokens: 500 };
 * const cacheStats = { cacheReadTokens: 8000, cacheWriteTokens: 0, ... };
 * const cost = calculateCost(usage, cacheStats, 'claude-3-5-sonnet-20241022');
 *
 * console.log(cost.totalCost); // Total cost in USD
 * console.log(cost.savings); // Amount saved by caching
 * console.log(cost.savingsPercent); // Percentage saved
 * ```
 */
export function calculateCost(
  usage: TokenUsage,
  cacheStats: CacheStats | null,
  model: string,
  pricingOverrides?: Partial<ModelPricing>,
): CostBreakdown {
  const pricing = getPricing(model, pricingOverrides);

  // Calculate non-cached input tokens
  const cachedTokens = cacheStats?.cacheReadTokens ?? 0;
  const nonCachedInputTokens = usage.inputTokens - cachedTokens;

  // Calculate base costs
  const inputCost = (nonCachedInputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPer1M;

  // Calculate cache costs
  let cacheWriteCost = 0;
  let cacheReadCost = 0;

  if (cacheStats) {
    // Cache write cost
    if (cacheStats.cacheWriteTokens > 0 && pricing.cacheWritePer1M) {
      cacheWriteCost =
        (cacheStats.cacheWriteTokens / 1_000_000) * pricing.cacheWritePer1M;
    }

    // Cache read cost
    if (
      cacheStats.cacheReadTokens > 0 &&
      pricing.cachedInputPer1M !== undefined
    ) {
      cacheReadCost =
        (cacheStats.cacheReadTokens / 1_000_000) * pricing.cachedInputPer1M;
    }
  }

  // Total cost
  const totalCost = inputCost + outputCost + cacheWriteCost + cacheReadCost;

  // Calculate no-cache baseline
  const noCacheCost =
    (usage.inputTokens / 1_000_000) * pricing.inputPer1M +
    (usage.outputTokens / 1_000_000) * pricing.outputPer1M;

  // Calculate savings
  const savings = noCacheCost - totalCost;
  const savingsPercent = noCacheCost > 0 ? (savings / noCacheCost) * 100 : 0;

  return {
    inputCost,
    outputCost,
    cacheWriteCost,
    cacheReadCost,
    totalCost,
    savings,
    savingsPercent,
    noCacheCost,
    pricing,
  };
}

/**
 * Calculate estimated cost before making an API call
 *
 * @param estimatedInputTokens - Estimated input tokens
 * @param estimatedOutputTokens - Estimated output tokens
 * @param model - Model identifier
 * @param useCache - Whether caching will be used
 * @param pricingOverrides - Optional pricing overrides
 * @returns Estimated cost breakdown
 *
 * @example
 * ```typescript
 * const estimate = estimateCost(10000, 500, 'gpt-4', false);
 * console.log(estimate.totalCost); // Estimated total cost
 * ```
 */
export function estimateCost(
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
  model: string,
  useCache = false,
  pricingOverrides?: Partial<ModelPricing>,
): CostBreakdown {
  const pricing = getPricing(model, pricingOverrides);

  const inputCost = (estimatedInputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (estimatedOutputTokens / 1_000_000) * pricing.outputPer1M;

  let cacheWriteCost = 0;
  const cacheReadCost = 0;

  // If using cache, assume worst case (all input will be written to cache initially)
  if (useCache && pricing.cacheWritePer1M) {
    cacheWriteCost =
      (estimatedInputTokens / 1_000_000) * pricing.cacheWritePer1M;
  }

  const totalCost = inputCost + outputCost + cacheWriteCost + cacheReadCost;
  const noCacheCost = inputCost + outputCost;

  const savings = noCacheCost - totalCost;
  const savingsPercent = noCacheCost > 0 ? (savings / noCacheCost) * 100 : 0;

  return {
    inputCost,
    outputCost,
    cacheWriteCost,
    cacheReadCost,
    totalCost,
    savings,
    savingsPercent,
    noCacheCost,
    pricing,
  };
}

/**
 * Calculate cost for multiple API calls (batch)
 *
 * @param calls - Array of token usage and cache stats
 * @param model - Model identifier
 * @param pricingOverrides - Optional pricing overrides
 * @returns Aggregated cost breakdown
 *
 * @example
 * ```typescript
 * const calls = [
 *   { usage: { inputTokens: 1000, outputTokens: 100 }, cacheStats: null },
 *   { usage: { inputTokens: 1000, outputTokens: 100 }, cacheStats: {...} },
 * ];
 * const total = calculateBatchCost(calls, 'gpt-4');
 * console.log(total.totalCost); // Sum of all calls
 * ```
 */
export function calculateBatchCost(
  calls: {usage: TokenUsage; cacheStats: CacheStats | null}[],
  model: string,
  pricingOverrides?: Partial<ModelPricing>,
): CostBreakdown {
  const costs = calls.map((call) =>
    calculateCost(call.usage, call.cacheStats, model, pricingOverrides),
  );

  // Sum all costs
  const totalInputCost = costs.reduce((sum, c) => sum + c.inputCost, 0);
  const totalOutputCost = costs.reduce((sum, c) => sum + c.outputCost, 0);
  const totalCacheWriteCost = costs.reduce(
    (sum, c) => sum + c.cacheWriteCost,
    0,
  );
  const totalCacheReadCost = costs.reduce((sum, c) => sum + c.cacheReadCost, 0);
  const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0);
  const totalNoCacheCost = costs.reduce((sum, c) => sum + c.noCacheCost, 0);
  const totalSavings = totalNoCacheCost - totalCost;
  const totalSavingsPercent =
    totalNoCacheCost > 0 ? (totalSavings / totalNoCacheCost) * 100 : 0;

  return {
    inputCost: totalInputCost,
    outputCost: totalOutputCost,
    cacheWriteCost: totalCacheWriteCost,
    cacheReadCost: totalCacheReadCost,
    totalCost,
    savings: totalSavings,
    savingsPercent: totalSavingsPercent,
    noCacheCost: totalNoCacheCost,
    pricing: costs[0]?.pricing ?? getPricing(model, pricingOverrides),
  };
}

/**
 * Format cost breakdown as human-readable string
 *
 * @param cost - Cost breakdown to format
 * @param options - Formatting options
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const cost = calculateCost(usage, cacheStats, 'gpt-4');
 * console.log(formatCostBreakdown(cost));
 * // Output:
 * // Total: $0.0350
 * // - Input: $0.0300 (1000 tokens)
 * // - Output: $0.0050 (100 tokens)
 * // - Cache Read: $0.0000
 * // Savings: $0.0000 (0.0%)
 * ```
 */
export function formatCostBreakdown(
  cost: CostBreakdown,
  options: {
    showBreakdown?: boolean;
    decimals?: number;
  } = {},
): string {
  const {showBreakdown = true, decimals = 4} = options;

  const format = (value: number) => `$${value.toFixed(decimals)}`;

  let result = `Total: ${format(cost.totalCost)}`;

  if (showBreakdown) {
    result += `\n- Input: ${format(cost.inputCost)}`;
    result += `\n- Output: ${format(cost.outputCost)}`;

    if (cost.cacheWriteCost > 0) {
      result += `\n- Cache Write: ${format(cost.cacheWriteCost)}`;
    }
    if (cost.cacheReadCost > 0) {
      result += `\n- Cache Read: ${format(cost.cacheReadCost)}`;
    }

    if (cost.savings !== 0) {
      const savingsSign = cost.savings >= 0 ? '' : '-';
      result += `\nSavings: ${savingsSign}${format(Math.abs(cost.savings))} (${cost.savingsPercent.toFixed(1)}%)`;
    }
  }

  return result;
}

/**
 * Compare actual cost vs estimated cost
 *
 * @param actual - Actual cost breakdown
 * @param estimated - Estimated cost breakdown
 * @returns Comparison metrics
 *
 * @example
 * ```typescript
 * const estimate = estimateCost(10000, 500, 'gpt-4');
 * // ... make API call ...
 * const actual = calculateCost(usage, cacheStats, 'gpt-4');
 * const comparison = compareCosts(actual, estimate);
 *
 * console.log(comparison.accuracyPercent); // How close was estimate
 * ```
 */
export function compareCosts(
  actual: CostBreakdown,
  estimated: CostBreakdown,
): {
  difference: number;
  differencePercent: number;
  accuracyPercent: number;
  underestimated: boolean;
} {
  const difference = actual.totalCost - estimated.totalCost;
  const differencePercent =
    estimated.totalCost > 0 ? (difference / estimated.totalCost) * 100 : 0;
  const accuracyPercent = 100 - Math.abs(differencePercent);
  const underestimated = difference > 0;

  return {
    difference,
    differencePercent,
    accuracyPercent,
    underestimated,
  };
}
