/**
 * Cache metrics collection and analysis for ScopeStack
 *
 * This module provides provider-agnostic cache metrics collection,
 * parsing provider-specific response formats, and calculating
 * cost savings from cache utilization.
 */

import type { Provider } from './capabilities.js';
import { getCacheCapabilities } from './capabilities.js';

import type { CacheTTL } from './types.js';

/**
 * Provider-agnostic cache statistics.
 *
 * Normalized metrics that work across different LLM providers,
 * following the Task 7.4 specification for consistent tracking
 * and reporting regardless of provider implementation.
 */
export interface CacheStats {
  /** Provider that generated these metrics */
  readonly provider: 'anthropic' | 'openai' | 'unknown';

  /** Number of tokens written to cache (cache creation cost) */
  readonly cacheWriteTokens: number;

  /** Number of tokens read from cache (cache hit benefit) */
  readonly cacheReadTokens: number;

  /** Total input tokens in the request */
  readonly inputTokens: number;

  /** Total output tokens generated */
  readonly outputTokens: number;

  // Derived metrics
  /** Total tokens saved by cache usage */
  readonly savedTokens: number;

  /** Cache hit rate (0-1, where 1 = 100% cache hit) */
  readonly cacheHitRate: number;

  /** Estimated cost savings in USD from cache usage */
  readonly estimatedSavingsUsd: number;

  // Debug information
  /** Time-to-live for cached content */
  readonly ttl?: CacheTTL;

  /** Number of cache breakpoints used in request */
  readonly breakpointsUsed?: number;

  /** Raw provider-specific metrics for debugging */
  readonly raw?: unknown;
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
  provider: 'anthropic' = 'anthropic',
  model: string
): CacheStats {
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;

  // Tokens saved = tokens that were read from cache instead of processed fresh
  const savedTokens = cacheReadTokens;

  const pricing = TOKEN_PRICING[model] || TOKEN_PRICING.default;
  // Cache savings primarily apply to input tokens (where most cache benefit occurs)
  const estimatedSavingsUsd = (savedTokens / 1_000_000) * pricing.input;

  // Cache hit rate based on input tokens (where caching applies)
  const cacheHitRate = inputTokens > 0 ? cacheReadTokens / inputTokens : 0;

  return {
    provider,
    cacheWriteTokens,
    cacheReadTokens,
    inputTokens,
    outputTokens,
    savedTokens,
    cacheHitRate,
    estimatedSavingsUsd,
    raw: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_creation_input_tokens: cacheWriteTokens,
      cache_read_input_tokens: cacheReadTokens,
    },
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
  provider: 'openai' = 'openai',
  model: string
): CacheStats {
  const inputTokens = usage.prompt_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;
  const cacheReadTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;

  // For OpenAI, cache writes are automatic - no explicit write cost
  const cacheWriteTokens = 0;

  // Tokens saved = tokens that were read from cache
  const savedTokens = cacheReadTokens;

  const pricing = TOKEN_PRICING[model] || TOKEN_PRICING.default;
  // Cache savings primarily apply to input/prompt tokens
  const estimatedSavingsUsd = (savedTokens / 1_000_000) * pricing.input;

  // Cache hit rate based on prompt tokens (where caching applies)
  const cacheHitRate = inputTokens > 0 ? cacheReadTokens / inputTokens : 0;

  return {
    provider,
    cacheWriteTokens,
    cacheReadTokens,
    inputTokens,
    outputTokens,
    savedTokens,
    cacheHitRate,
    estimatedSavingsUsd,
    raw: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: usage.total_tokens,
      prompt_tokens_details: usage.prompt_tokens_details,
    },
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
        'anthropic',
        model
      );

    case 'openai':
      return parseOpenAIMetrics(usage as OpenAICacheMetrics, 'openai', model);

    case 'google':
    case 'other':
    default:
      // For unknown providers, return minimal stats
      return {
        provider: 'unknown',
        cacheWriteTokens: 0,
        cacheReadTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        savedTokens: 0,
        cacheHitRate: 0,
        estimatedSavingsUsd: 0,
        raw: usage,
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
      provider: 'unknown',
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      savedTokens: 0,
      cacheHitRate: 0,
      estimatedSavingsUsd: 0,
      raw: { aggregatedFrom: 0 },
    };
  }

  const cacheWriteTokens = metrics.reduce(
    (sum, m) => sum + m.cacheWriteTokens,
    0
  );
  const cacheReadTokens = metrics.reduce(
    (sum, m) => sum + m.cacheReadTokens,
    0
  );
  const inputTokens = metrics.reduce((sum, m) => sum + m.inputTokens, 0);
  const outputTokens = metrics.reduce((sum, m) => sum + m.outputTokens, 0);
  const savedTokens = metrics.reduce((sum, m) => sum + m.savedTokens, 0);
  const estimatedSavingsUsd = metrics.reduce(
    (sum, m) => sum + m.estimatedSavingsUsd,
    0
  );

  const cacheHitRate = inputTokens > 0 ? cacheReadTokens / inputTokens : 0;

  // Use the provider from the first metric (assuming homogeneous)
  const firstMetric = metrics[0];

  return {
    provider: firstMetric.provider,
    cacheWriteTokens,
    cacheReadTokens,
    inputTokens,
    outputTokens,
    savedTokens,
    cacheHitRate,
    estimatedSavingsUsd,
    raw: {
      aggregatedFrom: metrics.length,
      individualMetrics: metrics.map((m) => m.raw),
    },
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
  const hitRatePercent = (stats.cacheHitRate * 100).toFixed(1);
  const savedUsdFormatted = stats.estimatedSavingsUsd.toFixed(4);
  const totalTokens = stats.inputTokens + stats.outputTokens;

  return [
    `Cache Stats (${stats.provider}):`,
    `  Input Tokens: ${stats.inputTokens.toLocaleString()}`,
    `  Output Tokens: ${stats.outputTokens.toLocaleString()}`,
    `  Total Tokens: ${totalTokens.toLocaleString()}`,
    `  Cache Read: ${stats.cacheReadTokens.toLocaleString()} (${hitRatePercent}%)`,
    `  Cache Write: ${stats.cacheWriteTokens.toLocaleString()}`,
    `  Saved: ${stats.savedTokens.toLocaleString()} tokens (~$${savedUsdFormatted})`,
    ...(stats.ttl ? [`  TTL: ${stats.ttl}`] : []),
    ...(stats.breakpointsUsed
      ? [`  Breakpoints: ${stats.breakpointsUsed}`]
      : []),
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
