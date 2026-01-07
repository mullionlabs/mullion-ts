/**
 * Provider-agnostic cache configuration types for ScopeStack
 *
 * This module defines abstract cache configuration types that can be
 * adapted to different LLM providers while maintaining type safety
 * and security boundaries.
 */

import type { CacheCapabilities, Provider } from './cache-capabilities.js';
import { getCacheCapabilities } from './cache-capabilities.js';

/**
 * Security scope levels for cache content.
 *
 * Defines what types of content are safe to cache based on
 * data sensitivity and privacy requirements.
 */
export type CacheScope =
  | 'system-only' // Only cache system prompts and templates
  | 'developer-content' // Cache developer-controlled content (prompts, schemas)
  | 'allow-user-content'; // Cache user-provided content (requires explicit opt-in)

/**
 * Time-to-live durations for cache entries.
 *
 * Providers may not support all TTL options. Use validation
 * to ensure compatibility with the target provider.
 */
export type CacheTTL = '5m' | '1h' | '24h' | 'session';

/**
 * Cache segment configuration.
 *
 * Defines how a specific piece of content should be cached,
 * including security scope, TTL, and provider hints.
 */
export interface CacheSegmentConfig {
  /** Security scope for this cache segment */
  readonly scope: CacheScope;

  /** Time-to-live for this cache entry (if supported by provider) */
  readonly ttl?: CacheTTL;

  /** Minimum token count to trigger caching */
  readonly minTokens?: number;

  /** Whether to force caching even if below provider minimum */
  readonly force?: boolean;

  /** Provider-specific cache key hint */
  readonly key?: string;
}

/**
 * Abstract cache configuration interface.
 *
 * Provider-agnostic configuration that gets transformed into
 * provider-specific cache directives by adapters.
 */
export interface CacheConfig {
  /** Security scope for all cache operations in this context */
  readonly defaultScope: CacheScope;

  /** Default TTL for cache entries */
  readonly defaultTtl: CacheTTL;

  /** Maximum number of cache breakpoints to use */
  readonly maxBreakpoints: number;

  /** Individual segment configurations */
  readonly segments: readonly CacheSegmentConfig[];

  /** Whether to enable cache metrics collection */
  readonly collectMetrics: boolean;
}

/**
 * Anthropic-specific cache configuration.
 *
 * Transformed from abstract CacheConfig to match Anthropic's
 * cache_control API format.
 */
export interface AnthropicCacheConfig {
  /** Cache control directives for prompt segments */
  readonly cacheControls: readonly {
    readonly type: 'ephemeral';
    readonly ttl?: '5m' | '1h';
  }[];

  /** Maximum cache breakpoints (limited to 4) */
  readonly maxBreakpoints: number;

  /** Whether metrics collection is enabled */
  readonly collectMetrics: boolean;
}

/**
 * OpenAI-specific cache configuration.
 *
 * OpenAI uses automatic caching, so this mainly controls
 * optimization hints and metrics collection.
 */
export interface OpenAICacheConfig {
  /** Whether to enable automatic caching optimization */
  readonly enableAutoCaching: boolean;

  /** Tool caching configuration */
  readonly toolCaching: {
    readonly enabled: boolean;
  };

  /** Whether metrics collection is enabled */
  readonly collectMetrics: boolean;
}

/**
 * TTL duration hierarchy for validation.
 *
 * Used to ensure TTL values are ordered correctly and
 * to convert between string and numeric representations.
 */
const TTL_HIERARCHY: Record<CacheTTL, number> = {
  '5m': 5 * 60, // 5 minutes
  '1h': 60 * 60, // 1 hour
  '24h': 24 * 60 * 60, // 24 hours
  session: Infinity, // Session-based (no expiry)
} as const;

/**
 * Validate cache configuration against provider capabilities.
 *
 * Ensures the configuration is compatible with the target provider's
 * constraints and capabilities.
 *
 * @param config - Abstract cache configuration
 * @param provider - Target LLM provider
 * @param model - Specific model name
 * @returns Validation result with errors if any
 */
export function validateCacheConfig(
  config: CacheConfig,
  provider: Provider,
  model: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const capabilities = getCacheCapabilities(provider, model);

  // Validate breakpoint limit
  if (config.maxBreakpoints > capabilities.maxBreakpoints) {
    errors.push(
      `Max breakpoints (${config.maxBreakpoints}) exceeds provider limit (${capabilities.maxBreakpoints})`
    );
  }

  // Validate TTL support
  if (config.defaultTtl !== 'session' && !capabilities.supportsTtl) {
    errors.push(
      `Provider '${provider}' does not support TTL, but defaultTtl is set to '${config.defaultTtl}'`
    );
  }

  // Validate segment TTLs
  for (const [index, segment] of config.segments.entries()) {
    if (segment.ttl && segment.ttl !== 'session' && !capabilities.supportsTtl) {
      errors.push(
        `Segment ${index} uses TTL '${segment.ttl}' but provider '${provider}' does not support TTL`
      );
    }

    // Validate TTL ordering (segments should not have longer TTL than default)
    if (
      segment.ttl &&
      TTL_HIERARCHY[segment.ttl] > TTL_HIERARCHY[config.defaultTtl]
    ) {
      errors.push(
        `Segment ${index} TTL '${segment.ttl}' is longer than default TTL '${config.defaultTtl}'`
      );
    }

    // Validate minimum tokens
    const minTokens = segment.minTokens ?? capabilities.minTokens;
    if (minTokens < capabilities.minTokens && !segment.force) {
      errors.push(
        `Segment ${index} minTokens (${minTokens}) is below provider minimum (${capabilities.minTokens}). Use force: true to override.`
      );
    }
  }

  // Validate scope security
  const hasUserContent = config.segments.some(
    (s) => s.scope === 'allow-user-content'
  );
  if (hasUserContent && config.defaultScope !== 'allow-user-content') {
    errors.push(
      'Cannot use allow-user-content scope in segments when defaultScope is more restrictive'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a provider-agnostic cache configuration.
 *
 * Factory function with sensible defaults that can be customized
 * for specific use cases.
 *
 * @param options - Partial configuration to override defaults
 * @returns Complete cache configuration
 */
export function createCacheConfig(
  options: Partial<CacheConfig> = {}
): CacheConfig {
  return {
    defaultScope: 'developer-content',
    defaultTtl: '1h',
    maxBreakpoints: 2,
    segments: [],
    collectMetrics: true,
    ...options,
  };
}

/**
 * Adapt abstract cache config to Anthropic-specific format.
 *
 * Transforms the provider-agnostic configuration into Anthropic's
 * cache_control API format with proper validation.
 *
 * @param config - Abstract cache configuration
 * @param capabilities - Anthropic model capabilities
 * @returns Anthropic-specific cache configuration
 */
export function adaptToAnthropicCache(
  config: CacheConfig,
  capabilities: CacheCapabilities
): AnthropicCacheConfig {
  // Limit breakpoints to Anthropic's maximum
  const maxBreakpoints = Math.min(
    config.maxBreakpoints,
    capabilities.maxBreakpoints
  );

  // Convert segments to cache controls
  const cacheControls = config.segments
    .slice(0, maxBreakpoints) // Respect breakpoint limit
    .map((segment) => ({
      type: 'ephemeral' as const,
      ttl:
        capabilities.supportsTtl && segment.ttl && segment.ttl !== 'session'
          ? (segment.ttl as '5m' | '1h')
          : undefined,
    }));

  return {
    cacheControls,
    maxBreakpoints,
    collectMetrics: config.collectMetrics,
  };
}

/**
 * Adapt abstract cache config to OpenAI-specific format.
 *
 * Transforms the provider-agnostic configuration into OpenAI's
 * automatic caching format with optimization hints.
 *
 * @param config - Abstract cache configuration
 * @param capabilities - OpenAI model capabilities
 * @returns OpenAI-specific cache configuration
 */
export function adaptToOpenAICache(
  config: CacheConfig,
  capabilities: CacheCapabilities
): OpenAICacheConfig {
  return {
    enableAutoCaching: true, // Always enable for OpenAI
    toolCaching: {
      enabled: capabilities.supportsToolCaching,
    },
    collectMetrics: config.collectMetrics,
  };
}

/**
 * Create a safe cache configuration for user content.
 *
 * Creates a configuration optimized for scenarios where user-provided
 * content needs to be cached with appropriate security constraints.
 *
 * @param options - Additional configuration options
 * @returns Cache configuration safe for user content
 */
export function createUserContentCacheConfig(
  options: Partial<CacheConfig> = {}
): CacheConfig {
  return createCacheConfig({
    defaultScope: 'allow-user-content',
    defaultTtl: '5m', // Shorter TTL for user content
    maxBreakpoints: 1, // Conservative breakpoint limit
    collectMetrics: false, // Disable metrics for privacy
    ...options,
  });
}

/**
 * Create a developer-only cache configuration.
 *
 * Creates a configuration optimized for developer-controlled content
 * like system prompts, schemas, and templates.
 *
 * @param options - Additional configuration options
 * @returns Cache configuration for developer content
 */
export function createDeveloperCacheConfig(
  options: Partial<CacheConfig> = {}
): CacheConfig {
  return createCacheConfig({
    defaultScope: 'developer-content',
    defaultTtl: '24h', // Longer TTL for stable content
    maxBreakpoints: 4, // Use more breakpoints
    collectMetrics: true, // Enable metrics
    ...options,
  });
}
