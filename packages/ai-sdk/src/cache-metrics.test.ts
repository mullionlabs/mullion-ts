import { describe, it, expect, beforeEach } from 'vitest';
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
} from './cache-metrics.js';

describe('Cache Metrics', () => {
  describe('parseAnthropicMetrics', () => {
    it('should parse Anthropic metrics with cache hits', () => {
      const usage: AnthropicCacheMetrics = {
        input_tokens: 1500,
        output_tokens: 500,
        cache_creation_input_tokens: 200,
        cache_read_input_tokens: 800,
      };

      const stats = parseAnthropicMetrics(
        usage,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(stats).toMatchObject({
        totalTokens: 2000,
        cachedTokens: 800,
        freshTokens: 1200,
        savedTokens: 800,
        cacheHitRatio: 0.4, // 800/2000
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      });

      // Check cost calculation (800 tokens * $3/1M = $0.0024)
      expect(stats.estimatedSavedUsd).toBeCloseTo(0.0024, 6);

      expect(stats.rawMetrics).toMatchObject({
        input_tokens: 1500,
        output_tokens: 500,
        cache_creation_input_tokens: 200,
        cache_read_input_tokens: 800,
      });
    });

    it('should handle Anthropic metrics without cache', () => {
      const usage: AnthropicCacheMetrics = {
        input_tokens: 1000,
        output_tokens: 300,
      };

      const stats = parseAnthropicMetrics(
        usage,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(stats).toMatchObject({
        totalTokens: 1300,
        cachedTokens: 0,
        freshTokens: 1300,
        savedTokens: 0,
        cacheHitRatio: 0,
        estimatedSavedUsd: 0,
      });
    });

    it('should use default pricing for unknown models', () => {
      const usage: AnthropicCacheMetrics = {
        input_tokens: 1000000, // 1M tokens
        output_tokens: 0,
        cache_read_input_tokens: 1000000,
      };

      const stats = parseAnthropicMetrics(usage, 'anthropic', 'unknown-model');

      // Should use default pricing: $5/1M tokens
      expect(stats.estimatedSavedUsd).toBe(5.0);
    });
  });

  describe('parseOpenAIMetrics', () => {
    it('should parse OpenAI metrics with cache hits', () => {
      const usage: OpenAICacheMetrics = {
        prompt_tokens: 1200,
        completion_tokens: 400,
        total_tokens: 1600,
        prompt_tokens_details: {
          cached_tokens: 600,
        },
      };

      const stats = parseOpenAIMetrics(usage, 'openai', 'gpt-4o');

      expect(stats).toMatchObject({
        totalTokens: 1600,
        cachedTokens: 600,
        freshTokens: 1000,
        savedTokens: 600,
        cacheHitRatio: 0.375, // 600/1600
        provider: 'openai',
        model: 'gpt-4o',
      });

      // Check cost calculation (600 tokens * $2.50/1M = $0.0015)
      expect(stats.estimatedSavedUsd).toBeCloseTo(0.0015, 6);

      expect(stats.rawMetrics).toMatchObject({
        prompt_tokens: 1200,
        completion_tokens: 400,
        total_tokens: 1600,
        prompt_tokens_details: {
          cached_tokens: 600,
        },
      });
    });

    it('should handle OpenAI metrics without cache details', () => {
      const usage: OpenAICacheMetrics = {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500,
      };

      const stats = parseOpenAIMetrics(usage, 'openai', 'gpt-4o');

      expect(stats).toMatchObject({
        totalTokens: 1500,
        cachedTokens: 0,
        freshTokens: 1500,
        savedTokens: 0,
        cacheHitRatio: 0,
        estimatedSavedUsd: 0,
      });
    });

    it('should handle missing prompt_tokens_details', () => {
      const usage: OpenAICacheMetrics = {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500,
        prompt_tokens_details: {},
      };

      const stats = parseOpenAIMetrics(usage, 'openai', 'gpt-4o');

      expect(stats.cachedTokens).toBe(0);
      expect(stats.savedTokens).toBe(0);
    });
  });

  describe('parseCacheMetrics', () => {
    it('should route to correct parser based on provider', () => {
      const anthropicUsage = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_input_tokens: 300,
      };

      const openaiUsage = {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500,
        prompt_tokens_details: { cached_tokens: 200 },
      };

      const anthropicStats = parseCacheMetrics(
        anthropicUsage,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );
      const openaiStats = parseCacheMetrics(openaiUsage, 'openai', 'gpt-4o');

      expect(anthropicStats.provider).toBe('anthropic');
      expect(anthropicStats.cachedTokens).toBe(300);

      expect(openaiStats.provider).toBe('openai');
      expect(openaiStats.cachedTokens).toBe(200);
    });

    it('should handle unknown providers', () => {
      const usage = { tokens: 1000 };

      const stats = parseCacheMetrics(usage, 'other', 'unknown-model');

      expect(stats).toMatchObject({
        totalTokens: 0,
        cachedTokens: 0,
        freshTokens: 0,
        savedTokens: 0,
        estimatedSavedUsd: 0,
        cacheHitRatio: 0,
        provider: 'other',
        model: 'unknown-model',
      });

      expect(stats.rawMetrics).toEqual({ tokens: 1000 });
    });
  });

  describe('aggregateCacheMetrics', () => {
    it('should aggregate multiple metrics correctly', () => {
      const metrics: CacheStats[] = [
        {
          totalTokens: 1000,
          cachedTokens: 200,
          freshTokens: 800,
          savedTokens: 200,
          estimatedSavedUsd: 0.001,
          cacheHitRatio: 0.2,
          rawMetrics: {},
          collectedAt: new Date(),
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
        },
        {
          totalTokens: 2000,
          cachedTokens: 800,
          freshTokens: 1200,
          savedTokens: 800,
          estimatedSavedUsd: 0.004,
          cacheHitRatio: 0.4,
          rawMetrics: {},
          collectedAt: new Date(),
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
        },
      ];

      const aggregated = aggregateCacheMetrics(metrics);

      expect(aggregated).toMatchObject({
        totalTokens: 3000,
        cachedTokens: 1000,
        freshTokens: 2000,
        savedTokens: 1000,
        estimatedSavedUsd: 0.005,
        cacheHitRatio: 1000 / 3000, // 0.333...
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      });

      expect(aggregated.rawMetrics).toMatchObject({
        aggregatedFrom: 2,
        individualMetrics: [metrics[0].rawMetrics, metrics[1].rawMetrics],
      });
    });

    it('should handle empty metrics array', () => {
      const aggregated = aggregateCacheMetrics([]);

      expect(aggregated).toMatchObject({
        totalTokens: 0,
        cachedTokens: 0,
        freshTokens: 0,
        savedTokens: 0,
        estimatedSavedUsd: 0,
        cacheHitRatio: 0,
        provider: 'other',
        model: 'aggregated',
      });
    });

    it('should handle single metric', () => {
      const metric: CacheStats = {
        totalTokens: 1500,
        cachedTokens: 500,
        freshTokens: 1000,
        savedTokens: 500,
        estimatedSavedUsd: 0.0025,
        cacheHitRatio: 1 / 3,
        rawMetrics: { test: 'data' },
        collectedAt: new Date(),
        provider: 'openai',
        model: 'gpt-4o',
      };

      const aggregated = aggregateCacheMetrics([metric]);

      expect(aggregated).toMatchObject({
        totalTokens: 1500,
        cachedTokens: 500,
        freshTokens: 1000,
        savedTokens: 500,
        estimatedSavedUsd: 0.0025,
        provider: 'openai',
        model: 'gpt-4o',
      });
    });
  });

  describe('estimateCacheSavings', () => {
    it('should calculate potential savings correctly', () => {
      const result = estimateCacheSavings(
        2000,
        5,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result).toMatchObject({
        potentialSavedTokens: 8000, // 2000 * (5-1)
        cacheEffective: true,
      });

      // Cost: 8000 tokens * $3/1M = $0.024
      expect(result.potentialSavedUsd).toBeCloseTo(0.024, 6);
      expect(result.recommendation).toContain('Caching recommended');
    });

    it('should reject short content', () => {
      const result = estimateCacheSavings(
        500,
        10,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result).toMatchObject({
        potentialSavedTokens: 4500,
        cacheEffective: false,
      });

      expect(result.recommendation).toContain('Content too short');
    });

    it('should reject single-use content', () => {
      const result = estimateCacheSavings(
        2000,
        1,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result).toMatchObject({
        potentialSavedTokens: 0, // 2000 * (1-1)
        cacheEffective: false,
      });

      expect(result.recommendation).toContain('not beneficial for single-use');
    });

    it('should handle minimal savings', () => {
      // Very small content with few requests
      const result = estimateCacheSavings(
        1100,
        2,
        'anthropic',
        'claude-3-haiku-20240307'
      );

      expect(result.cacheEffective).toBe(true);

      if (result.potentialSavedUsd < 0.01) {
        expect(result.recommendation).toContain('Cache savings minimal');
      } else {
        expect(result.recommendation).toContain('Caching recommended');
      }
    });
  });

  describe('formatCacheStats', () => {
    it('should format cache stats for display', () => {
      const stats: CacheStats = {
        totalTokens: 5000,
        cachedTokens: 1500,
        freshTokens: 3500,
        savedTokens: 1500,
        estimatedSavedUsd: 0.0075,
        cacheHitRatio: 0.3,
        rawMetrics: {},
        collectedAt: new Date('2024-01-15T10:30:00Z'),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      };

      const formatted = formatCacheStats(stats);

      expect(formatted).toContain(
        'Cache Stats (anthropic/claude-3-5-sonnet-20241022)'
      );
      expect(formatted).toContain('Total Tokens: 5,000');
      expect(formatted).toContain('Cached: 1,500 (30.0%)');
      expect(formatted).toContain('Fresh: 3,500');
      expect(formatted).toContain('Saved: 1,500 tokens (~$0.0075)');
      expect(formatted).toContain('2024-01-15T10:30:00.000Z');
    });

    it('should handle zero values gracefully', () => {
      const stats: CacheStats = {
        totalTokens: 0,
        cachedTokens: 0,
        freshTokens: 0,
        savedTokens: 0,
        estimatedSavedUsd: 0,
        cacheHitRatio: 0,
        rawMetrics: {},
        collectedAt: new Date(),
        provider: 'openai',
        model: 'gpt-4o',
      };

      const formatted = formatCacheStats(stats);

      expect(formatted).toContain('Cached: 0 (0.0%)');
      expect(formatted).toContain('Saved: 0 tokens (~$0.0000)');
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

    it('should collect and aggregate metrics', () => {
      const usage1 = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_input_tokens: 300,
      };

      const usage2 = {
        input_tokens: 2000,
        output_tokens: 800,
        cache_read_input_tokens: 600,
      };

      collector.addMetrics(usage1);
      collector.addMetrics(usage2);

      expect(collector.getCallCount()).toBe(2);

      const individual = collector.getIndividualStats();
      expect(individual).toHaveLength(2);
      expect(individual[0].cachedTokens).toBe(300);
      expect(individual[1].cachedTokens).toBe(600);

      const aggregated = collector.getAggregatedStats();
      expect(aggregated.totalTokens).toBe(4300); // (1000+500) + (2000+800)
      expect(aggregated.cachedTokens).toBe(900); // 300 + 600
    });

    it('should clear metrics', () => {
      collector.addMetrics({ input_tokens: 1000, output_tokens: 500 });

      expect(collector.getCallCount()).toBe(1);

      collector.clear();

      expect(collector.getCallCount()).toBe(0);
      expect(collector.getIndividualStats()).toHaveLength(0);

      const aggregated = collector.getAggregatedStats();
      expect(aggregated.totalTokens).toBe(0);
    });

    it('should handle empty state', () => {
      expect(collector.getCallCount()).toBe(0);
      expect(collector.getIndividualStats()).toHaveLength(0);

      const aggregated = collector.getAggregatedStats();
      expect(aggregated).toMatchObject({
        totalTokens: 0,
        cachedTokens: 0,
        provider: 'other',
        model: 'aggregated',
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle real Anthropic response format', () => {
      const anthropicResponse = {
        input_tokens: 1523,
        output_tokens: 892,
        cache_creation_input_tokens: 1024,
        cache_read_input_tokens: 499,
      };

      const stats = parseAnthropicMetrics(
        anthropicResponse,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(stats.totalTokens).toBe(2415);
      expect(stats.cachedTokens).toBe(499);
      expect(stats.cacheHitRatio).toBeCloseTo(0.207, 3);
      expect(stats.estimatedSavedUsd).toBeCloseTo(0.001497, 6);
    });

    it('should handle real OpenAI response format', () => {
      const openaiResponse = {
        prompt_tokens: 1200,
        completion_tokens: 750,
        total_tokens: 1950,
        prompt_tokens_details: {
          cached_tokens: 600,
          audio_tokens: 0,
        },
      };

      const stats = parseOpenAIMetrics(openaiResponse, 'openai', 'gpt-4o');

      expect(stats.totalTokens).toBe(1950);
      expect(stats.cachedTokens).toBe(600);
      expect(stats.cacheHitRatio).toBeCloseTo(0.308, 3);
      expect(stats.estimatedSavedUsd).toBeCloseTo(0.0015, 6);
    });

    it('should demonstrate cost savings calculation', () => {
      // Scenario: Large system prompt cached across multiple requests
      const systemPromptTokens = 2048;
      const requests = 100;

      const savings = estimateCacheSavings(
        systemPromptTokens,
        requests,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(savings.potentialSavedTokens).toBe(2048 * 99); // 202,752 tokens
      expect(savings.potentialSavedUsd).toBeCloseTo(0.608256, 6); // ~$0.61 saved
      expect(savings.cacheEffective).toBe(true);
      expect(savings.recommendation).toContain('Caching recommended');
    });

    it('should track session-level metrics', () => {
      const collector = new CacheMetricsCollector('openai', 'gpt-4o');

      // Simulate multiple API calls in a session
      const calls = [
        { total_tokens: 1500, prompt_tokens_details: { cached_tokens: 300 } },
        { total_tokens: 1200, prompt_tokens_details: { cached_tokens: 600 } },
        { total_tokens: 1800, prompt_tokens_details: { cached_tokens: 450 } },
      ];

      calls.forEach((usage) => collector.addMetrics(usage));

      const session = collector.getAggregatedStats();

      expect(session.totalTokens).toBe(4500);
      expect(session.cachedTokens).toBe(1350);
      expect(session.cacheHitRatio).toBe(0.3);
      expect(session.estimatedSavedUsd).toBeCloseTo(0.003375, 6);

      // Format for display
      const report = formatCacheStats(session);
      expect(report).toContain('Total Tokens: 4,500');
      expect(report).toContain('Cached: 1,350 (30.0%)');
    });
  });
});
