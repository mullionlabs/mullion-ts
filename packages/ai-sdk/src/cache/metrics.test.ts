/**
 * Tests for cache metrics module
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  parseAnthropicMetrics,
  parseOpenAIMetrics,
  parseCacheMetrics,
  aggregateCacheMetrics,
  estimateCacheSavings,
  formatCacheStats,
  CacheMetricsCollector,
  type CacheStats,
  type AnthropicCacheMetrics,
  type OpenAICacheMetrics,
} from './metrics.js';

describe('parseAnthropicMetrics', () => {
  it('parses Anthropic metrics with cache hits', () => {
    const usage: AnthropicCacheMetrics = {
      input_tokens: 1000,
      output_tokens: 500,
      cache_creation_input_tokens: 200,
      cache_read_input_tokens: 300,
    };

    const stats = parseAnthropicMetrics(
      usage,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(stats.provider).toBe('anthropic');
    expect(stats.inputTokens).toBe(1000);
    expect(stats.outputTokens).toBe(500);
    expect(stats.cacheWriteTokens).toBe(200);
    expect(stats.cacheReadTokens).toBe(300);
    expect(stats.savedTokens).toBe(300);
    expect(stats.cacheHitRate).toBe(0.3); // 300/1000
  });

  it('handles zero cache metrics', () => {
    const usage: AnthropicCacheMetrics = {
      input_tokens: 1000,
      output_tokens: 500,
    };

    const stats = parseAnthropicMetrics(
      usage,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(stats.cacheWriteTokens).toBe(0);
    expect(stats.cacheReadTokens).toBe(0);
    expect(stats.savedTokens).toBe(0);
    expect(stats.cacheHitRate).toBe(0);
  });

  it('calculates estimated savings in USD', () => {
    const usage: AnthropicCacheMetrics = {
      input_tokens: 1000000, // 1M tokens
      output_tokens: 100000,
      cache_read_input_tokens: 500000, // 500K saved tokens
    };

    const stats = parseAnthropicMetrics(
      usage,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    // Claude 3.5 Sonnet input is $3/1M tokens
    // 500K saved tokens = $1.50 savings
    expect(stats.estimatedSavingsUsd).toBeCloseTo(1.5, 2);
  });

  it('includes raw metrics for debugging', () => {
    const usage: AnthropicCacheMetrics = {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 10,
      cache_read_input_tokens: 20,
    };

    const stats = parseAnthropicMetrics(
      usage,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(stats.raw).toEqual({
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 10,
      cache_read_input_tokens: 20,
    });
  });
});

describe('parseOpenAIMetrics', () => {
  it('parses OpenAI metrics with cached tokens', () => {
    const usage: OpenAICacheMetrics = {
      prompt_tokens: 1000,
      completion_tokens: 500,
      total_tokens: 1500,
      prompt_tokens_details: {
        cached_tokens: 400,
      },
    };

    const stats = parseOpenAIMetrics(usage, 'openai', 'gpt-4o');

    expect(stats.provider).toBe('openai');
    expect(stats.inputTokens).toBe(1000);
    expect(stats.outputTokens).toBe(500);
    expect(stats.cacheReadTokens).toBe(400);
    expect(stats.cacheWriteTokens).toBe(0); // OpenAI doesn't report write cost
    expect(stats.savedTokens).toBe(400);
    expect(stats.cacheHitRate).toBe(0.4);
  });

  it('handles missing prompt_tokens_details', () => {
    const usage: OpenAICacheMetrics = {
      prompt_tokens: 1000,
      completion_tokens: 500,
      total_tokens: 1500,
    };

    const stats = parseOpenAIMetrics(usage, 'openai', 'gpt-4o');

    expect(stats.cacheReadTokens).toBe(0);
    expect(stats.cacheHitRate).toBe(0);
  });

  it('calculates estimated savings for OpenAI models', () => {
    const usage: OpenAICacheMetrics = {
      prompt_tokens: 1000000,
      completion_tokens: 100000,
      total_tokens: 1100000,
      prompt_tokens_details: {
        cached_tokens: 500000,
      },
    };

    const stats = parseOpenAIMetrics(usage, 'openai', 'gpt-4o');

    // GPT-4o input is $2.5/1M tokens
    // 500K saved = $1.25 savings
    expect(stats.estimatedSavingsUsd).toBeCloseTo(1.25, 2);
  });
});

describe('parseCacheMetrics', () => {
  it('routes to Anthropic parser', () => {
    const usage = {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 20,
    };

    const stats = parseCacheMetrics(
      usage,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(stats.provider).toBe('anthropic');
    expect(stats.cacheReadTokens).toBe(20);
  });

  it('routes to OpenAI parser', () => {
    const usage = {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
      prompt_tokens_details: { cached_tokens: 30 },
    };

    const stats = parseCacheMetrics(usage, 'openai', 'gpt-4o');

    expect(stats.provider).toBe('openai');
    expect(stats.cacheReadTokens).toBe(30);
  });

  it('returns unknown provider stats for other providers', () => {
    const usage = { some_metric: 100 };

    const stats = parseCacheMetrics(usage, 'google', 'gemini-pro');

    expect(stats.provider).toBe('unknown');
    expect(stats.cacheReadTokens).toBe(0);
    expect(stats.raw).toEqual(usage);
  });
});

describe('aggregateCacheMetrics', () => {
  it('aggregates multiple metrics correctly', () => {
    const metrics: CacheStats[] = [
      {
        provider: 'anthropic',
        inputTokens: 1000,
        outputTokens: 500,
        cacheWriteTokens: 100,
        cacheReadTokens: 200,
        savedTokens: 200,
        cacheHitRate: 0.2,
        estimatedSavingsUsd: 0.01,
      },
      {
        provider: 'anthropic',
        inputTokens: 2000,
        outputTokens: 1000,
        cacheWriteTokens: 50,
        cacheReadTokens: 800,
        savedTokens: 800,
        cacheHitRate: 0.4,
        estimatedSavingsUsd: 0.04,
      },
    ];

    const aggregated = aggregateCacheMetrics(metrics);

    expect(aggregated.inputTokens).toBe(3000);
    expect(aggregated.outputTokens).toBe(1500);
    expect(aggregated.cacheWriteTokens).toBe(150);
    expect(aggregated.cacheReadTokens).toBe(1000);
    expect(aggregated.savedTokens).toBe(1000);
    expect(aggregated.cacheHitRate).toBeCloseTo(1000 / 3000, 4);
    expect(aggregated.estimatedSavingsUsd).toBe(0.05);
  });

  it('returns empty stats for empty array', () => {
    const aggregated = aggregateCacheMetrics([]);

    expect(aggregated.provider).toBe('unknown');
    expect(aggregated.inputTokens).toBe(0);
    expect(aggregated.cacheReadTokens).toBe(0);
  });

  it('uses first metric provider', () => {
    const metrics: CacheStats[] = [
      {
        provider: 'openai',
        inputTokens: 100,
        outputTokens: 50,
        cacheWriteTokens: 0,
        cacheReadTokens: 20,
        savedTokens: 20,
        cacheHitRate: 0.2,
        estimatedSavingsUsd: 0.001,
      },
    ];

    const aggregated = aggregateCacheMetrics(metrics);

    expect(aggregated.provider).toBe('openai');
  });
});

describe('estimateCacheSavings', () => {
  it('estimates savings for cacheable content', () => {
    const result = estimateCacheSavings(
      2000,
      5,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(result.cacheEffective).toBe(true);
    expect(result.potentialSavedTokens).toBe(8000); // 2000 * 4 (first request pays)
    expect(result.potentialSavedUsd).toBeGreaterThan(0);
    expect(result.recommendation).toContain('recommended');
  });

  it('warns when content too short', () => {
    const result = estimateCacheSavings(
      500,
      5,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(result.cacheEffective).toBe(false);
    expect(result.recommendation).toContain('too short');
  });

  it('warns for single-use content', () => {
    const result = estimateCacheSavings(
      2000,
      1,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(result.cacheEffective).toBe(false);
    expect(result.recommendation).toContain('single-use');
  });

  it('calculates zero savings for single request', () => {
    const result = estimateCacheSavings(
      2000,
      1,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(result.potentialSavedTokens).toBe(0);
  });
});

describe('formatCacheStats', () => {
  it('formats stats as human-readable string', () => {
    const stats: CacheStats = {
      provider: 'anthropic',
      inputTokens: 10000,
      outputTokens: 5000,
      cacheWriteTokens: 1000,
      cacheReadTokens: 3000,
      savedTokens: 3000,
      cacheHitRate: 0.3,
      estimatedSavingsUsd: 0.009,
    };

    const formatted = formatCacheStats(stats);

    expect(formatted).toContain('anthropic');
    expect(formatted).toContain('10,000');
    expect(formatted).toContain('30.0%');
    expect(formatted).toContain('$0.0090');
  });

  it('includes optional fields when present', () => {
    const stats: CacheStats = {
      provider: 'anthropic',
      inputTokens: 1000,
      outputTokens: 500,
      cacheWriteTokens: 100,
      cacheReadTokens: 200,
      savedTokens: 200,
      cacheHitRate: 0.2,
      estimatedSavingsUsd: 0.001,
      ttl: '5m',
      breakpointsUsed: 2,
    };

    const formatted = formatCacheStats(stats);

    expect(formatted).toContain('5m');
    expect(formatted).toContain('Breakpoints: 2');
  });
});

describe('CacheMetricsCollector', () => {
  let collector: CacheMetricsCollector;

  beforeEach(() => {
    collector = new CacheMetricsCollector(
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );
  });

  it('starts with zero call count', () => {
    expect(collector.getCallCount()).toBe(0);
  });

  it('collects metrics from API calls', () => {
    collector.addMetrics({
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 20,
    });

    expect(collector.getCallCount()).toBe(1);

    const stats = collector.getAggregatedStats();
    expect(stats.inputTokens).toBe(100);
    expect(stats.cacheReadTokens).toBe(20);
  });

  it('aggregates multiple calls', () => {
    collector.addMetrics({ input_tokens: 100, output_tokens: 50 });
    collector.addMetrics({ input_tokens: 200, output_tokens: 100 });

    const stats = collector.getAggregatedStats();

    expect(stats.inputTokens).toBe(300);
    expect(stats.outputTokens).toBe(150);
    expect(collector.getCallCount()).toBe(2);
  });

  it('returns individual stats', () => {
    collector.addMetrics({ input_tokens: 100, output_tokens: 50 });
    collector.addMetrics({ input_tokens: 200, output_tokens: 100 });

    const individual = collector.getIndividualStats();

    expect(individual).toHaveLength(2);
    expect(individual[0].inputTokens).toBe(100);
    expect(individual[1].inputTokens).toBe(200);
  });

  it('clears collected metrics', () => {
    collector.addMetrics({ input_tokens: 100, output_tokens: 50 });
    collector.clear();

    expect(collector.getCallCount()).toBe(0);
    expect(collector.getAggregatedStats().inputTokens).toBe(0);
  });
});
