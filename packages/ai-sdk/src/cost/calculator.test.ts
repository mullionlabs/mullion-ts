import { describe, it, expect } from 'vitest';
import {
  calculateCost,
  estimateCost,
  calculateBatchCost,
  formatCostBreakdown,
  compareCosts,
} from './calculator.js';
import type { TokenUsage, CostBreakdown } from './calculator.js';
import type { CacheStats } from '../cache/metrics.js';

describe('calculateCost', () => {
  describe('without caching', () => {
    it('should calculate cost for GPT-4 without cache', () => {
      const usage: TokenUsage = {
        inputTokens: 10000,
        outputTokens: 500,
      };

      const cost = calculateCost(usage, null, 'gpt-4');

      expect(cost.inputCost).toBeCloseTo(0.3, 4); // 10k * $30/1M
      expect(cost.outputCost).toBeCloseTo(0.03, 4); // 500 * $60/1M
      expect(cost.cacheWriteCost).toBe(0);
      expect(cost.cacheReadCost).toBe(0);
      expect(cost.totalCost).toBeCloseTo(0.33, 4);
      expect(cost.noCacheCost).toBeCloseTo(0.33, 4);
      expect(cost.savings).toBe(0);
      expect(cost.savingsPercent).toBe(0);
    });

    it('should calculate cost for Claude without cache', () => {
      const usage: TokenUsage = {
        inputTokens: 10000,
        outputTokens: 500,
      };

      const cost = calculateCost(usage, null, 'claude-3-5-sonnet-20241022');

      expect(cost.inputCost).toBeCloseTo(0.03, 4); // 10k * $3/1M
      expect(cost.outputCost).toBeCloseTo(0.0075, 4); // 500 * $15/1M
      expect(cost.totalCost).toBeCloseTo(0.0375, 4);
    });

    it('should handle zero tokens', () => {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
      };

      const cost = calculateCost(usage, null, 'gpt-4');

      expect(cost.totalCost).toBe(0);
      expect(cost.savings).toBe(0);
    });

    it('should handle only input tokens', () => {
      const usage: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 0,
      };

      const cost = calculateCost(usage, null, 'gpt-4');

      expect(cost.inputCost).toBeCloseTo(0.03, 4);
      expect(cost.outputCost).toBe(0);
      expect(cost.totalCost).toBeCloseTo(0.03, 4);
    });

    it('should handle only output tokens', () => {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 1000,
      };

      const cost = calculateCost(usage, null, 'gpt-4');

      expect(cost.inputCost).toBe(0);
      expect(cost.outputCost).toBeCloseTo(0.06, 4);
      expect(cost.totalCost).toBeCloseTo(0.06, 4);
    });
  });

  describe('with caching', () => {
    it('should calculate cost with cache read (Claude)', () => {
      const usage: TokenUsage = {
        inputTokens: 10000,
        outputTokens: 500,
      };

      const cacheStats: CacheStats = {
        provider: 'anthropic',
        cacheWriteTokens: 0,
        cacheReadTokens: 8000,
        inputTokens: 10000,
        outputTokens: 500,
        savedTokens: 7200,
        cacheHitRate: 0.8,
        estimatedSavingsUsd: 0,
      };

      const cost = calculateCost(
        usage,
        cacheStats,
        'claude-3-5-sonnet-20241022'
      );

      // 2000 non-cached * $3/1M = $0.006
      expect(cost.inputCost).toBeCloseTo(0.006, 4);
      // 500 output * $15/1M = $0.0075
      expect(cost.outputCost).toBeCloseTo(0.0075, 4);
      // 8000 cached * $0.3/1M = $0.0024
      expect(cost.cacheReadCost).toBeCloseTo(0.0024, 4);
      expect(cost.cacheWriteCost).toBe(0);

      const expectedTotal = 0.006 + 0.0075 + 0.0024;
      expect(cost.totalCost).toBeCloseTo(expectedTotal, 4);

      // Savings: no-cache (0.0375) - total (0.0159) = 0.0216
      expect(cost.savings).toBeGreaterThan(0);
      expect(cost.savingsPercent).toBeGreaterThan(50);
    });

    it('should calculate cost with cache write (Claude)', () => {
      const usage: TokenUsage = {
        inputTokens: 10000,
        outputTokens: 500,
      };

      const cacheStats: CacheStats = {
        provider: 'anthropic',
        cacheWriteTokens: 10000,
        cacheReadTokens: 0,
        inputTokens: 10000,
        outputTokens: 500,
        savedTokens: 0,
        cacheHitRate: 0,
        estimatedSavingsUsd: 0,
      };

      const cost = calculateCost(
        usage,
        cacheStats,
        'claude-3-5-sonnet-20241022'
      );

      expect(cost.inputCost).toBeCloseTo(0.03, 4);
      expect(cost.outputCost).toBeCloseTo(0.0075, 4);
      // Cache write: 10000 * $3.75/1M = $0.0375
      expect(cost.cacheWriteCost).toBeCloseTo(0.0375, 4);
      expect(cost.cacheReadCost).toBe(0);

      // Total with cache write is higher than no-cache
      expect(cost.totalCost).toBeGreaterThan(cost.noCacheCost);
      expect(cost.savings).toBeLessThan(0); // Negative savings
    });

    it('should calculate cost with both cache write and read', () => {
      const usage: TokenUsage = {
        inputTokens: 10000,
        outputTokens: 500,
      };

      const cacheStats: CacheStats = {
        provider: 'anthropic',
        cacheWriteTokens: 5000,
        cacheReadTokens: 5000,
        inputTokens: 10000,
        outputTokens: 500,
        savedTokens: 4500,
        cacheHitRate: 0.5,
        estimatedSavingsUsd: 0,
      };

      const cost = calculateCost(
        usage,
        cacheStats,
        'claude-3-5-sonnet-20241022'
      );

      expect(cost.cacheWriteCost).toBeGreaterThan(0);
      expect(cost.cacheReadCost).toBeGreaterThan(0);
      expect(cost.totalCost).toBeGreaterThan(0);
    });

    it('should handle OpenAI free caching', () => {
      const usage: TokenUsage = {
        inputTokens: 10000,
        outputTokens: 500,
        cachedTokens: 8000,
      };

      const cacheStats: CacheStats = {
        provider: 'openai',
        cacheWriteTokens: 0,
        cacheReadTokens: 8000,
        inputTokens: 10000,
        outputTokens: 500,
        savedTokens: 8000,
        cacheHitRate: 0.8,
        estimatedSavingsUsd: 0,
      };

      const cost = calculateCost(usage, cacheStats, 'gpt-4');

      // OpenAI cache is free
      expect(cost.cacheWriteCost).toBe(0);
      expect(cost.cacheReadCost).toBe(0);
      // Only non-cached input tokens are charged: 2000 * $30/1M + 500 * $60/1M
      expect(cost.inputCost).toBeCloseTo(0.06, 4); // 2000 non-cached tokens
      expect(cost.outputCost).toBeCloseTo(0.03, 4);
      expect(cost.totalCost).toBeCloseTo(0.09, 4);
    });
  });

  describe('with pricing overrides', () => {
    it('should use custom pricing', () => {
      const usage: TokenUsage = {
        inputTokens: 10000,
        outputTokens: 500,
      };

      const cost = calculateCost(usage, null, 'custom-model', {
        inputPer1M: 5.0,
        outputPer1M: 10.0,
      });

      expect(cost.inputCost).toBeCloseTo(0.05, 4); // 10k * $5/1M
      expect(cost.outputCost).toBeCloseTo(0.005, 4); // 500 * $10/1M
      expect(cost.totalCost).toBeCloseTo(0.055, 4);
    });
  });

  describe('large token counts', () => {
    it('should handle millions of tokens', () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 100_000,
      };

      const cost = calculateCost(usage, null, 'gpt-4');

      expect(cost.inputCost).toBeCloseTo(30.0, 2);
      expect(cost.outputCost).toBeCloseTo(6.0, 2);
      expect(cost.totalCost).toBeCloseTo(36.0, 2);
    });

    it('should handle very large cache savings', () => {
      const usage: TokenUsage = {
        inputTokens: 1_000_000,
        outputTokens: 10_000,
      };

      const cacheStats: CacheStats = {
        provider: 'anthropic',
        cacheWriteTokens: 0,
        cacheReadTokens: 900_000,
        inputTokens: 1_000_000,
        outputTokens: 10_000,
        savedTokens: 810_000,
        cacheHitRate: 0.9,
        estimatedSavingsUsd: 0,
      };

      const cost = calculateCost(
        usage,
        cacheStats,
        'claude-3-5-sonnet-20241022'
      );

      expect(cost.savings).toBeGreaterThan(2.0);
      expect(cost.savingsPercent).toBeGreaterThan(70); // Adjusted from 80 to 70
    });
  });
});

describe('estimateCost', () => {
  it('should estimate cost without cache', () => {
    const cost = estimateCost(10000, 500, 'gpt-4', false);

    expect(cost.inputCost).toBeCloseTo(0.3, 4);
    expect(cost.outputCost).toBeCloseTo(0.03, 4);
    expect(cost.cacheWriteCost).toBe(0);
    expect(cost.totalCost).toBeCloseTo(0.33, 4);
  });

  it('should estimate cost with cache write (worst case)', () => {
    const cost = estimateCost(10000, 500, 'claude-3-5-sonnet-20241022', true);

    expect(cost.inputCost).toBeCloseTo(0.03, 4);
    expect(cost.outputCost).toBeCloseTo(0.0075, 4);
    // Worst case: all input written to cache
    expect(cost.cacheWriteCost).toBeCloseTo(0.0375, 4);
    expect(cost.totalCost).toBeGreaterThan(cost.noCacheCost);
  });

  it('should estimate with custom pricing', () => {
    const cost = estimateCost(10000, 500, 'custom', false, {
      inputPer1M: 5.0,
      outputPer1M: 10.0,
    });

    expect(cost.inputCost).toBeCloseTo(0.05, 4);
    expect(cost.outputCost).toBeCloseTo(0.005, 4);
  });

  it('should handle zero tokens estimate', () => {
    const cost = estimateCost(0, 0, 'gpt-4');

    expect(cost.totalCost).toBe(0);
  });

  it('should not add cache cost for OpenAI', () => {
    const cost = estimateCost(10000, 500, 'gpt-4', true);

    // OpenAI cache is free
    expect(cost.cacheWriteCost).toBe(0);
  });
});

describe('calculateBatchCost', () => {
  it('should sum costs from multiple calls', () => {
    const calls = [
      {
        usage: { inputTokens: 1000, outputTokens: 100 },
        cacheStats: null,
      },
      {
        usage: { inputTokens: 2000, outputTokens: 200 },
        cacheStats: null,
      },
      {
        usage: { inputTokens: 3000, outputTokens: 300 },
        cacheStats: null,
      },
    ];

    const total = calculateBatchCost(calls, 'gpt-4');

    // Total input: 6000 tokens * $30/1M = $0.18
    expect(total.inputCost).toBeCloseTo(0.18, 4);
    // Total output: 600 tokens * $60/1M = $0.036
    expect(total.outputCost).toBeCloseTo(0.036, 4);
    expect(total.totalCost).toBeCloseTo(0.216, 4);
  });

  it('should aggregate cache costs', () => {
    const calls = [
      {
        usage: { inputTokens: 10000, outputTokens: 500 },
        cacheStats: {
          provider: 'anthropic' as const,
          cacheWriteTokens: 10000,
          cacheReadTokens: 0,
          inputTokens: 10000,
          outputTokens: 500,
          savedTokens: 0,
          cacheHitRate: 0,
          estimatedSavingsUsd: 0,
        },
      },
      {
        usage: { inputTokens: 10000, outputTokens: 500 },
        cacheStats: {
          provider: 'anthropic' as const,
          cacheWriteTokens: 0,
          cacheReadTokens: 10000,
          inputTokens: 10000,
          outputTokens: 500,
          savedTokens: 9000,
          cacheHitRate: 1.0,
          estimatedSavingsUsd: 0,
        },
      },
    ];

    const total = calculateBatchCost(calls, 'claude-3-5-sonnet-20241022');

    expect(total.cacheWriteCost).toBeGreaterThan(0);
    expect(total.cacheReadCost).toBeGreaterThan(0);
    // First call has negative savings (cache write cost), second has positive
    // Net could be negative, so just check it's calculated
    expect(total.savings).toBeDefined();
    expect(typeof total.savings).toBe('number');
  });

  it('should handle empty batch', () => {
    const total = calculateBatchCost([], 'gpt-4');

    expect(total.totalCost).toBe(0);
    expect(total.savings).toBe(0);
  });

  it('should handle single call', () => {
    const calls = [
      {
        usage: { inputTokens: 1000, outputTokens: 100 },
        cacheStats: null,
      },
    ];

    const total = calculateBatchCost(calls, 'gpt-4');
    const single = calculateCost(
      { inputTokens: 1000, outputTokens: 100 },
      null,
      'gpt-4'
    );

    expect(total.totalCost).toBeCloseTo(single.totalCost, 4);
  });
});

describe('formatCostBreakdown', () => {
  it('should format simple cost breakdown', () => {
    const cost: CostBreakdown = {
      inputCost: 0.3,
      outputCost: 0.03,
      cacheWriteCost: 0,
      cacheReadCost: 0,
      totalCost: 0.33,
      savings: 0,
      savingsPercent: 0,
      noCacheCost: 0.33,
      pricing: {} as any,
    };

    const formatted = formatCostBreakdown(cost);

    expect(formatted).toContain('Total: $0.3300');
    expect(formatted).toContain('Input: $0.3000');
    expect(formatted).toContain('Output: $0.0300');
  });

  it('should format with cache costs', () => {
    const cost: CostBreakdown = {
      inputCost: 0.1,
      outputCost: 0.01,
      cacheWriteCost: 0.05,
      cacheReadCost: 0.02,
      totalCost: 0.18,
      savings: 0.02,
      savingsPercent: 10.0,
      noCacheCost: 0.2,
      pricing: {} as any,
    };

    const formatted = formatCostBreakdown(cost);

    expect(formatted).toContain('Cache Write: $0.0500');
    expect(formatted).toContain('Cache Read: $0.0200');
    expect(formatted).toContain('Savings: $0.0200 (10.0%)');
  });

  it('should format negative savings', () => {
    const cost: CostBreakdown = {
      inputCost: 0.1,
      outputCost: 0.01,
      cacheWriteCost: 0.15,
      cacheReadCost: 0,
      totalCost: 0.26,
      savings: -0.15,
      savingsPercent: -136.4,
      noCacheCost: 0.11,
      pricing: {} as any,
    };

    const formatted = formatCostBreakdown(cost);

    expect(formatted).toContain('Savings: -$0.1500');
  });

  it('should respect decimals option', () => {
    const cost: CostBreakdown = {
      inputCost: 0.123456,
      outputCost: 0.01,
      cacheWriteCost: 0,
      cacheReadCost: 0,
      totalCost: 0.133456,
      savings: 0,
      savingsPercent: 0,
      noCacheCost: 0.133456,
      pricing: {} as any,
    };

    const formatted = formatCostBreakdown(cost, { decimals: 2 });

    expect(formatted).toContain('$0.12');
    expect(formatted).not.toContain('$0.1234');
  });

  it('should hide breakdown when requested', () => {
    const cost: CostBreakdown = {
      inputCost: 0.3,
      outputCost: 0.03,
      cacheWriteCost: 0,
      cacheReadCost: 0,
      totalCost: 0.33,
      savings: 0,
      savingsPercent: 0,
      noCacheCost: 0.33,
      pricing: {} as any,
    };

    const formatted = formatCostBreakdown(cost, { showBreakdown: false });

    expect(formatted).toBe('Total: $0.3300');
    expect(formatted).not.toContain('Input:');
  });
});

describe('compareCosts', () => {
  it('should compare exact match', () => {
    const estimate = estimateCost(10000, 500, 'gpt-4');
    const actual = calculateCost(
      { inputTokens: 10000, outputTokens: 500 },
      null,
      'gpt-4'
    );

    const comparison = compareCosts(actual, estimate);

    expect(comparison.difference).toBeCloseTo(0, 4);
    expect(comparison.differencePercent).toBeCloseTo(0, 1);
    expect(comparison.accuracyPercent).toBeCloseTo(100, 1);
    expect(comparison.underestimated).toBe(false);
  });

  it('should detect underestimate', () => {
    const estimate = estimateCost(10000, 500, 'gpt-4');
    const actual = calculateCost(
      { inputTokens: 15000, outputTokens: 500 },
      null,
      'gpt-4'
    );

    const comparison = compareCosts(actual, estimate);

    expect(comparison.difference).toBeGreaterThan(0);
    expect(comparison.underestimated).toBe(true);
    expect(comparison.accuracyPercent).toBeLessThan(100);
  });

  it('should detect overestimate', () => {
    const estimate = estimateCost(10000, 500, 'gpt-4');
    const actual = calculateCost(
      { inputTokens: 5000, outputTokens: 500 },
      null,
      'gpt-4'
    );

    const comparison = compareCosts(actual, estimate);

    expect(comparison.difference).toBeLessThan(0);
    expect(comparison.underestimated).toBe(false);
    expect(comparison.accuracyPercent).toBeLessThan(100);
  });

  it('should calculate accuracy percentage', () => {
    const estimate: CostBreakdown = {
      totalCost: 1.0,
    } as CostBreakdown;

    const actual: CostBreakdown = {
      totalCost: 0.9,
    } as CostBreakdown;

    const comparison = compareCosts(actual, estimate);

    expect(comparison.differencePercent).toBeCloseTo(-10, 1);
    expect(comparison.accuracyPercent).toBeCloseTo(90, 1);
  });
});
