/**
 * Cache segments API for first-class caching support in ScopeStack
 *
 * This module provides a high-level API for managing cache segments
 * within ScopeStack contexts, with safety and validation built-in.
 */

import type { CacheConfig, CacheScope, CacheTTL } from './cache-config.js';
import type { CacheCapabilities, Provider } from './cache-capabilities.js';
import { getCacheCapabilities } from './cache-capabilities.js';
import { validateCacheConfig } from './cache-config.js';
import type { CacheStats } from './cache-metrics.js';
import { CacheMetricsCollector } from './cache-metrics.js';

/**
 * Options for creating a cache segment.
 */
export interface CacheSegmentOptions {
  /** Security scope for this cache segment */
  readonly scope?: CacheScope;

  /** Time-to-live for this cache entry (if supported by provider) */
  readonly ttl?: CacheTTL;

  /** Minimum token count to trigger caching */
  readonly minTokens?: number;

  /** Whether to force caching even if below provider minimum */
  readonly force?: boolean;

  /** Estimated token count for validation (optional) */
  readonly estimatedTokens?: number;
}

/**
 * Metadata about a cache segment.
 */
export interface CacheSegmentMetadata {
  /** Unique identifier for this segment */
  readonly id: string;

  /** Cache key for this segment */
  readonly key: string;

  /** Security scope */
  readonly scope: CacheScope;

  /** TTL if specified */
  readonly ttl?: CacheTTL;

  /** Estimated or actual token count */
  readonly tokenCount?: number;

  /** Whether this segment was forced despite low token count */
  readonly forced: boolean;

  /** Timestamp when segment was created */
  readonly createdAt: Date;

  /** Provider-specific cache metadata */
  readonly providerMetadata?: Record<string, unknown>;
}

/**
 * Context metadata for tracking cache segments.
 */
export interface CacheContextMetadata {
  /** All cache segments in this context */
  readonly segments: readonly CacheSegmentMetadata[];

  /** Active cache configuration */
  readonly config: CacheConfig;

  /** Provider capabilities */
  readonly capabilities: CacheCapabilities;

  /** Total estimated tokens across all segments */
  readonly totalEstimatedTokens: number;
}

/**
 * Cache segments API attached to ScopeStack contexts.
 *
 * Provides high-level methods for managing cache segments with
 * built-in validation and safety features.
 */
export interface CacheSegmentsAPI {
  /**
   * Create an explicit cache segment for arbitrary content.
   *
   * This method allows caching any content with explicit control over
   * security scope, TTL, and validation. Use this for custom caching
   * scenarios where the helper methods don't fit.
   *
   * @param key - Unique cache key for this segment
   * @param content - Content to cache (string or object)
   * @param options - Cache segment options
   * @returns Metadata about the created cache segment
   *
   * @example
   * ```typescript
   * // Cache a processed document with developer scope
   * const segment = await ctx.cache.segment('processed-doc-v1', document, {
   *   scope: 'developer-content',
   *   ttl: '1h',
   *   estimatedTokens: 2048,
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Cache user content with explicit opt-in
   * const segment = await ctx.cache.segment('user-query', userInput, {
   *   scope: 'allow-user-content',
   *   ttl: '5m',
   *   estimatedTokens: 512,
   * });
   * ```
   */
  segment(
    key: string,
    content: string | object,
    options?: CacheSegmentOptions
  ): Promise<CacheSegmentMetadata>;

  /**
   * Cache a system prompt with optimized defaults.
   *
   * Convenience method for caching system prompts, which are typically
   * stable, developer-controlled content that benefits from long TTLs.
   *
   * @param systemPrompt - The system prompt content
   * @param options - Optional override for system prompt caching
   * @returns Metadata about the cached system prompt
   *
   * @example
   * ```typescript
   * // Cache a system prompt with long TTL
   * const segment = await ctx.cache.system(`
   *   You are a helpful assistant specialized in data analysis.
   *   Always provide detailed explanations for your reasoning.
   * `);
   * ```
   *
   * @example
   * ```typescript
   * // Cache system prompt with custom options
   * const segment = await ctx.cache.system(systemPrompt, {
   *   ttl: '24h',
   *   key: 'data-analyst-v2',
   * });
   * ```
   */
  system(
    systemPrompt: string,
    options?: Omit<CacheSegmentOptions, 'scope'> & { key?: string }
  ): Promise<CacheSegmentMetadata>;

  /**
   * Get metadata about all cache segments in this context.
   *
   * Returns comprehensive information about cache usage, token counts,
   * and provider-specific details for debugging and optimization.
   *
   * @returns Complete cache context metadata
   */
  getMetadata(): CacheContextMetadata;

  /**
   * Estimate token count for content.
   *
   * Provides a rough estimate of token count for validation purposes.
   * Uses a simple heuristic: ~4 characters per token for English text.
   *
   * @param content - Content to estimate tokens for
   * @returns Estimated token count
   */
  estimateTokens(content: string | object): number;

  /**
   * Check if caching is beneficial for given content.
   *
   * Validates content against provider minimum token thresholds
   * and current cache configuration limits.
   *
   * @param content - Content to check
   * @param options - Cache options to validate
   * @returns Validation result with recommendation
   */
  shouldCache(
    content: string | object,
    options?: CacheSegmentOptions
  ): {
    readonly shouldCache: boolean;
    readonly reason: string;
    readonly estimatedTokens: number;
    readonly meetsMinimum: boolean;
    readonly withinLimits: boolean;
  };

  /**
   * Get cache performance metrics for this context.
   *
   * Returns aggregated cache statistics from all API calls made
   * within this context, including token savings and cost estimates.
   *
   * @returns Current cache performance statistics
   *
   * @example
   * ```typescript
   * // After some API calls with caching enabled
   * const stats = ctx.cache.getCacheStats();
   *
   * console.log(`Total tokens: ${stats.totalTokens}`);
   * console.log(`Cache hit ratio: ${(stats.cacheHitRatio * 100).toFixed(1)}%`);
   * console.log(`Estimated savings: $${stats.estimatedSavedUsd.toFixed(4)}`);
   * ```
   */
  getCacheStats(): CacheStats;

  /**
   * Internal method to record metrics from API responses.
   *
   * @internal
   */
  _recordMetrics?(usage: Record<string, unknown>): void;
}

/**
 * Create a cache segments API for a specific context.
 *
 * Internal factory function used by the ScopeStack client to create
 * the cache API with proper configuration and validation.
 *
 * @param provider - LLM provider name
 * @param model - Model identifier
 * @param config - Cache configuration
 * @returns Cache segments API instance
 */
export function createCacheSegmentsAPI(
  provider: Provider,
  model: string,
  config: CacheConfig
): CacheSegmentsAPI {
  const capabilities = getCacheCapabilities(provider, model);
  const segments: CacheSegmentMetadata[] = [];
  const metricsCollector = new CacheMetricsCollector(provider, model);
  let segmentCounter = 0;

  // Validate the configuration against provider capabilities
  const validation = validateCacheConfig(config, provider, model);
  if (!validation.valid) {
    throw new Error(
      `Invalid cache configuration for ${provider}/${model}: ${validation.errors.join(', ')}`
    );
  }

  return {
    async segment(
      key: string,
      content: string | object,
      options: CacheSegmentOptions = {}
    ): Promise<CacheSegmentMetadata> {
      // Use config defaults or provided options
      const scope = options.scope ?? config.defaultScope;
      const ttl = options.ttl ?? config.defaultTtl;
      const estimatedTokens =
        options.estimatedTokens ?? estimateTokensInternal(content);
      const minTokens = options.minTokens ?? capabilities.minTokens;
      const force = options.force ?? false;

      // Validate scope security
      if (
        scope === 'allow-user-content' &&
        config.defaultScope !== 'allow-user-content'
      ) {
        throw new Error(
          'Cannot use allow-user-content scope when context defaultScope is more restrictive'
        );
      }

      // Validate token threshold
      if (estimatedTokens < minTokens && !force) {
        throw new Error(
          `Content too short for caching (${estimatedTokens} tokens < ${minTokens} minimum). ` +
            'Use force: true to override or increase content length.'
        );
      }

      // Validate segment limit
      if (segments.length >= config.maxBreakpoints) {
        throw new Error(
          `Cannot create more cache segments (${segments.length} >= ${config.maxBreakpoints} limit)`
        );
      }

      // Validate TTL support
      if (ttl !== 'session' && !capabilities.supportsTtl) {
        throw new Error(
          `Provider '${provider}' does not support TTL, but segment specifies '${ttl}'`
        );
      }

      // Create segment metadata
      const segmentId = `${key}-${++segmentCounter}`;
      const metadata: CacheSegmentMetadata = {
        id: segmentId,
        key,
        scope,
        ttl: ttl !== 'session' ? ttl : undefined,
        tokenCount: estimatedTokens,
        forced: force,
        createdAt: new Date(),
        providerMetadata: {
          provider,
          model,
          capabilities,
        },
      };

      segments.push(metadata);

      return await Promise.resolve(metadata);
    },

    async system(
      systemPrompt: string,
      options: Omit<CacheSegmentOptions, 'scope'> & { key?: string } = {}
    ): Promise<CacheSegmentMetadata> {
      const key = options.key ?? `system-prompt-${Date.now()}`;

      return this.segment(key, systemPrompt, {
        ...options,
        scope: 'system-only', // Always use system-only scope for system prompts
        ttl: options.ttl ?? '24h', // Default to long TTL for system prompts
      });
    },

    getMetadata(): CacheContextMetadata {
      return {
        segments,
        config,
        capabilities,
        totalEstimatedTokens: segments.reduce(
          (total, segment) => total + (segment.tokenCount ?? 0),
          0
        ),
      };
    },

    estimateTokens(content: string | object): number {
      return estimateTokensInternal(content);
    },

    shouldCache(
      content: string | object,
      options: CacheSegmentOptions = {}
    ): {
      readonly shouldCache: boolean;
      readonly reason: string;
      readonly estimatedTokens: number;
      readonly meetsMinimum: boolean;
      readonly withinLimits: boolean;
    } {
      const estimatedTokens =
        options.estimatedTokens ?? estimateTokensInternal(content);
      const minTokens = options.minTokens ?? capabilities.minTokens;
      const force = options.force ?? false;

      const meetsMinimum = estimatedTokens >= minTokens || force;
      const withinLimits = segments.length < config.maxBreakpoints;

      let shouldCache = meetsMinimum && withinLimits;
      let reason: string;

      if (!meetsMinimum) {
        reason = `Content too short (${estimatedTokens} < ${minTokens} tokens)`;
      } else if (!withinLimits) {
        reason = `Segment limit reached (${segments.length} >= ${config.maxBreakpoints})`;
      } else {
        reason = 'Content suitable for caching';
      }

      // Additional provider-specific checks
      const scope = options.scope ?? config.defaultScope;
      if (
        scope === 'allow-user-content' &&
        config.defaultScope !== 'allow-user-content'
      ) {
        shouldCache = false;
        reason = 'User content scope not allowed with current config';
      }

      if (
        options.ttl &&
        options.ttl !== 'session' &&
        !capabilities.supportsTtl
      ) {
        shouldCache = false;
        reason = `Provider '${provider}' does not support TTL`;
      }

      return {
        shouldCache,
        reason,
        estimatedTokens,
        meetsMinimum,
        withinLimits,
      };
    },

    getCacheStats(): CacheStats {
      return metricsCollector.getAggregatedStats();
    },

    // Internal method to record metrics from API calls
    _recordMetrics(usage: Record<string, unknown>): void {
      if (config.collectMetrics) {
        metricsCollector.addMetrics(usage);
      }
    },
  };
}

/**
 * Internal helper to estimate token count from content.
 *
 * Uses a simple heuristic: ~4 characters per token for English text.
 * This is approximate but sufficient for validation purposes.
 *
 * @param content - Content to estimate
 * @returns Estimated token count
 */
function estimateTokensInternal(content: string | object): number {
  const text = typeof content === 'string' ? content : JSON.stringify(content);

  // Simple heuristic: ~4 characters per token
  // This matches OpenAI's rough estimate for English text
  return Math.ceil(text.length / 4);
}
