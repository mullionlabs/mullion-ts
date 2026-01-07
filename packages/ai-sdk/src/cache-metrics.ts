/**
 * Cache metrics collection and analysis for ScopeStack
 *
 * This module provides provider-agnostic cache metrics collection,
 * parsing provider-specific response formats, and calculating
 * cost savings from cache utilization.
 */

import type { Provider } from './cache-capabilities.js';
import { getCacheCapabilities } from './cache-capabilities.js';

/**
 * Provider-agnostic cache statistics.
 *
 * Normalized metrics that work across different LLM providers,
 * allowing consistent tracking and reporting regardless of the
 * underlying provider implementation.
 */
export interface CacheStats {
  /** Total tokens used in the request */
  readonly totalTokens: number;

  /** Number of tokens that were served from cache */
  readonly cachedTokens: number;

  /** Number of tokens that were processed fresh (not cached) */
  readonly freshTokens: number;

  /** Number of tokens saved by using cache */
  readonly savedTokens: number;

  /** Estimated cost savings in USD from cache usage */
  readonly estimatedSavedUsd: number;

  /** Cache hit ratio (0-1, where 1 = 100% cache hit) */
  readonly cacheHitRatio: number;

  /** Provider-specific raw metrics for debugging */
  readonly rawMetrics: Record<string, unknown>;

  /** Timestamp when metrics were collected */
  readonly collectedAt: Date;

  /** Provider that generated these metrics */
  readonly provider: Provider;

  /** Model that was used */
  readonly model: string;
}

/**
 * Anthropic-specific cache metrics from their API response.
 */
export interface AnthropicCacheMetrics {
  /** Total input tokens in the request */
  readonly input_tokens: number;

  /** Total output tokens generated */
  readonly output_tokens: number;

  /** Input tokens that triggered cache creation */
  readonly cache_creation_input_tokens?: number;

  /** Input tokens that were served from cache */
  readonly cache_read_input_tokens?: number;

  /** Additional usage metadata */
  readonly [key: string]: unknown;
}

/**
 * OpenAI-specific cache metrics from their API response.
 */
export interface OpenAICacheMetrics {
  /** Total prompt tokens in the request */
  readonly prompt_tokens: number;

  /** Total completion tokens generated */
  readonly completion_tokens: number;

  /** Total tokens used */
  readonly total_tokens: number;

  /** Detailed prompt token breakdown */
  readonly prompt_tokens_details?: {
    /** Tokens served from cache */
    readonly cached_tokens?: number;
    /** Audio tokens (if applicable) */
    readonly audio_tokens?: number;
  };

  /** Additional usage metadata */
  readonly [key: string]: unknown;
}

/**
 * Token pricing information for cost calculations.
 *
 * Prices in USD per 1M tokens (typical industry standard).
 * Updated as of January 2025 - should be reviewed regularly.
 */
const TOKEN_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic Claude models (per 1M tokens)
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

  // OpenAI models (per 1M tokens)
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },

  // Default fallback pricing (conservative estimate)
  default: { input: 5.0, output: 15.0 },
} as const;

/**
 * Parse Anthropic cache metrics from API response.
 *
 * Extracts cache-specific metrics from Anthropic's usage object,
 * handling the cache_creation_input_tokens and cache_read_input_tokens fields.
 *
 * @param usage - Anthropic usage object from API response
 * @param provider - Provider identifier
 * @param model - Model identifier
 * @returns Normalized cache statistics
 */
export function parseAnthropicMetrics(
  usage: AnthropicCacheMetrics,
  provider: Provider = 'anthropic',
  model: string
): CacheStats {
  const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;

  // For Anthropic, cached tokens are those served from cache
  const cachedTokens = cacheReadTokens;
  const freshTokens = totalTokens - cachedTokens;
  const savedTokens = cachedTokens; // These would have been processed fresh otherwise

  const pricing = TOKEN_PRICING[model] || TOKEN_PRICING.default;
  // Cache savings primarily apply to input tokens (where most cache benefit occurs)
  const estimatedSavedUsd = (savedTokens / 1_000_000) * pricing.input;

  const cacheHitRatio = totalTokens > 0 ? cachedTokens / totalTokens : 0;

  return {
    totalTokens,
    cachedTokens,
    freshTokens,
    savedTokens,
    estimatedSavedUsd,
    cacheHitRatio,
    rawMetrics: {
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_creation_input_tokens: cacheCreationTokens,
      cache_read_input_tokens: cacheReadTokens,
    },
    collectedAt: new Date(),
    provider,
    model,
  };
}

/**
 * Parse OpenAI cache metrics from API response.
 *
 * Extracts cache-specific metrics from OpenAI's usage object,
 * handling the prompt_tokens_details.cached_tokens field.
 *
 * @param usage - OpenAI usage object from API response
 * @param provider - Provider identifier
 * @param model - Model identifier
 * @returns Normalized cache statistics
 */
export function parseOpenAIMetrics(
  usage: OpenAICacheMetrics,
  provider: Provider = 'openai',
  model: string
): CacheStats {
  const totalTokens = usage.total_tokens || 0;
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const freshTokens = totalTokens - cachedTokens;
  const savedTokens = cachedTokens; // These would have been processed fresh otherwise

  const pricing = TOKEN_PRICING[model] || TOKEN_PRICING.default;
  // Cache savings primarily apply to input/prompt tokens
  const estimatedSavedUsd = (savedTokens / 1_000_000) * pricing.input;

  const cacheHitRatio = totalTokens > 0 ? cachedTokens / totalTokens : 0;

  return {
    totalTokens,
    cachedTokens,
    freshTokens,
    savedTokens,
    estimatedSavedUsd,
    cacheHitRatio,
    rawMetrics: {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: totalTokens,
      prompt_tokens_details: usage.prompt_tokens_details,
    },
    collectedAt: new Date(),
    provider,
    model,
  };
}

/**
 * Generic cache metrics parser that routes to provider-specific parsers.
 *
 * Automatically detects the provider and model from the usage object
 * structure and routes to the appropriate parsing function.
 *
 * @param usage - Raw usage metrics from any provider
 * @param provider - LLM provider identifier
 * @param model - Model identifier
 * @returns Normalized cache statistics
 */
export function parseCacheMetrics(
  usage: Record<string, unknown>,
  provider: Provider,
  model: string
): CacheStats {
  switch (provider) {
    case 'anthropic':
      return parseAnthropicMetrics(
        usage as AnthropicCacheMetrics,
        provider,
        model
      );

    case 'openai':
      return parseOpenAIMetrics(usage as OpenAICacheMetrics, provider, model);

    case 'google':
    case 'other':
    default:
      // For unknown providers, return minimal stats
      return {
        totalTokens: 0,
        cachedTokens: 0,
        freshTokens: 0,
        savedTokens: 0,
        estimatedSavedUsd: 0,
        cacheHitRatio: 0,
        rawMetrics: usage,
        collectedAt: new Date(),
        provider,
        model,
      };
  }
}

/**
 * Aggregate multiple cache metrics into cumulative statistics.
 *
 * Combines metrics from multiple API calls to provide session-level
 * or period-level aggregate cache performance statistics.
 *
 * @param metrics - Array of individual cache statistics
 * @returns Aggregated cache statistics
 */
export function aggregateCacheMetrics(metrics: CacheStats[]): CacheStats {
  if (metrics.length === 0) {
    return {
      totalTokens: 0,
      cachedTokens: 0,
      freshTokens: 0,
      savedTokens: 0,
      estimatedSavedUsd: 0,
      cacheHitRatio: 0,
      rawMetrics: {},
      collectedAt: new Date(),
      provider: 'other',
      model: 'aggregated',
    };
  }

  const totalTokens = metrics.reduce((sum, m) => sum + m.totalTokens, 0);
  const cachedTokens = metrics.reduce((sum, m) => sum + m.cachedTokens, 0);
  const freshTokens = metrics.reduce((sum, m) => sum + m.freshTokens, 0);
  const savedTokens = metrics.reduce((sum, m) => sum + m.savedTokens, 0);
  const estimatedSavedUsd = metrics.reduce(
    (sum, m) => sum + m.estimatedSavedUsd,
    0
  );

  const cacheHitRatio = totalTokens > 0 ? cachedTokens / totalTokens : 0;

  // Use the provider/model from the first metric (assuming homogeneous)
  const firstMetric = metrics[0];

  return {
    totalTokens,
    cachedTokens,
    freshTokens,
    savedTokens,
    estimatedSavedUsd,
    cacheHitRatio,
    rawMetrics: {
      aggregatedFrom: metrics.length,
      individualMetrics: metrics.map((m) => m.rawMetrics),
    },
    collectedAt: new Date(),
    provider: firstMetric.provider,
    model: firstMetric.model,
  };
}

/**
 * Calculate potential cache savings for a given request.
 *
 * Estimates how much could be saved if caching were optimally configured
 * for the given content length and provider/model combination.
 *
 * @param contentTokens - Number of tokens in the content to cache
 * @param requestCount - Expected number of requests that would benefit
 * @param provider - LLM provider
 * @param model - Model identifier
 * @returns Estimated savings information
 */
export function estimateCacheSavings(
  contentTokens: number,
  requestCount: number,
  provider: Provider,
  model: string
): {
  readonly potentialSavedTokens: number;
  readonly potentialSavedUsd: number;
  readonly cacheEffective: boolean;
  readonly recommendation: string;
} {
  const capabilities = getCacheCapabilities(provider, model);
  const pricing = TOKEN_PRICING[model] || TOKEN_PRICING.default;

  // Only the first request pays for cache creation, subsequent requests save tokens
  const potentialSavedTokens = contentTokens * Math.max(0, requestCount - 1);
  const potentialSavedUsd = (potentialSavedTokens / 1_000_000) * pricing.input;

  const cacheEffective =
    contentTokens >= capabilities.minTokens && requestCount > 1;

  let recommendation: string;
  if (contentTokens < capabilities.minTokens) {
    recommendation = `Content too short for effective caching (${contentTokens} < ${capabilities.minTokens} min tokens)`;
  } else if (requestCount <= 1) {
    recommendation = 'Caching not beneficial for single-use content';
  } else if (potentialSavedUsd < 0.01) {
    recommendation = 'Cache savings minimal (< $0.01)';
  } else {
    recommendation = `Caching recommended: save ~${requestCount - 1}x ${contentTokens} tokens (~$${potentialSavedUsd.toFixed(4)})`;
  }

  return {
    potentialSavedTokens,
    potentialSavedUsd,
    cacheEffective,
    recommendation,
  };
}

/**
 * Format cache statistics for human-readable display.
 *
 * Creates a formatted string representation of cache metrics
 * suitable for logging, debugging, or user interfaces.
 *
 * @param stats - Cache statistics to format
 * @returns Formatted string representation
 */
export function formatCacheStats(stats: CacheStats): string {
  const hitRatioPercent = (stats.cacheHitRatio * 100).toFixed(1);
  const savedUsdFormatted = stats.estimatedSavedUsd.toFixed(4);

  return [
    `Cache Stats (${stats.provider}/${stats.model}):`,
    `  Total Tokens: ${stats.totalTokens.toLocaleString()}`,
    `  Cached: ${stats.cachedTokens.toLocaleString()} (${hitRatioPercent}%)`,
    `  Fresh: ${stats.freshTokens.toLocaleString()}`,
    `  Saved: ${stats.savedTokens.toLocaleString()} tokens (~$${savedUsdFormatted})`,
    `  Collected: ${stats.collectedAt.toISOString()}`,
  ].join('\n');
}

/**
 * Session-level cache metrics collector.
 *
 * Tracks cache metrics across multiple requests in a session,
 * providing cumulative statistics and insights.
 */
export class CacheMetricsCollector {
  private metrics: CacheStats[] = [];
  private readonly provider: Provider;
  private readonly model: string;

  constructor(provider: Provider, model: string) {
    this.provider = provider;
    this.model = model;
  }

  /**
   * Add metrics from a single API call.
   *
   * @param usage - Raw usage metrics from provider
   */
  addMetrics(usage: Record<string, unknown>): void {
    const stats = parseCacheMetrics(usage, this.provider, this.model);
    this.metrics.push(stats);
  }

  /**
   * Get aggregated metrics for all collected data.
   *
   * @returns Cumulative cache statistics
   */
  getAggregatedStats(): CacheStats {
    return aggregateCacheMetrics(this.metrics);
  }

  /**
   * Get individual metrics for each API call.
   *
   * @returns Array of individual cache statistics
   */
  getIndividualStats(): readonly CacheStats[] {
    return [...this.metrics];
  }

  /**
   * Clear all collected metrics.
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get metrics count.
   *
   * @returns Number of API calls tracked
   */
  getCallCount(): number {
    return this.metrics.length;
  }
}
