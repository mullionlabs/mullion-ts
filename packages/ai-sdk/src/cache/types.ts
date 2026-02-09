/**
 * Provider-agnostic cache configuration types for Mullion
 *
 * This module defines the new cache configuration system with cleaner
 * abstractions and provider-specific adapters as specified in Task 7.2.
 */

import type {Provider} from './capabilities.js';
import {getCacheCapabilities} from './capabilities.js';

/**
 * Time-to-live durations for cache entries.
 *
 * Simplified to only include supported TTL values based on provider research.
 */
export type CacheTTL = '5m' | '1h';

/**
 * Security scope levels for cache content.
 *
 * Defines what types of content are safe to cache based on
 * data sensitivity and privacy requirements.
 */
export type CacheScope =
  | 'system-only' // Only cache system prompts and templates
  | 'developer-content' // Cache developer-controlled content (default)
  | 'allow-user-content'; // Cache user-provided content (explicit opt-in)

/**
 * Provider-agnostic cache configuration.
 *
 * This is the main interface used by developers. It gets transformed
 * into provider-specific options by adapters.
 */
export interface CacheConfig {
  /** Whether caching is enabled */
  readonly enabled: boolean;

  /** Security scope for cache operations (default: 'developer-content') */
  readonly scope?: CacheScope;

  /** Time-to-live for cache entries (default: '5m') */
  readonly ttl?: CacheTTL;

  /** Number of cache breakpoints to use (1-4, default: 1) */
  readonly breakpoints?: number;
}

/**
 * Anthropic provider-specific cache options.
 *
 * Maps to Anthropic's cache_control API format.
 */
export interface AnthropicProviderOptions {
  /** Cache control directives for the request */
  readonly cache?: {
    readonly type: 'ephemeral';
    readonly ttl?: CacheTTL;
  };

  /** Number of cache breakpoints to use */
  readonly breakpoints: number;
}

/**
 * OpenAI provider-specific cache options.
 *
 * OpenAI uses automatic caching, so this mainly contains metadata.
 */
export interface OpenAIProviderOptions {
  /** Whether automatic caching is enabled */
  readonly autoCaching: boolean;

  /** Tool/function call caching settings */
  readonly toolCaching?: {
    readonly enabled: boolean;
  };
}

/**
 * Google provider-specific cache options.
 *
 * Gemini prompt caching requires a pre-created cached content resource.
 */
export interface GoogleProviderOptions {
  /** Cached content resource name (for example: cachedContents/abc123) */
  readonly cachedContent?: string;
}

/**
 * Gemini cache config extension with cached content handle.
 */
export interface GeminiCacheConfig extends CacheConfig {
  /** Cached content resource name created via Gemini API */
  readonly cachedContent?: string;
}

/**
 * Union type for all provider-specific options.
 */
export type ProviderOptions =
  | AnthropicProviderOptions
  | OpenAIProviderOptions
  | GoogleProviderOptions;

/**
 * Anthropic cache adapter that converts abstract config to provider options.
 */
export interface AnthropicCacheAdapter {
  /**
   * Convert abstract CacheConfig to Anthropic-specific provider options.
   *
   * @param config - Abstract cache configuration
   * @returns Anthropic provider options
   */
  toProviderOptions(config: CacheConfig): AnthropicProviderOptions;
}

/**
 * OpenAI cache adapter that converts abstract config to provider options.
 */
export interface OpenAICacheAdapter {
  /**
   * Convert abstract CacheConfig to OpenAI-specific provider options.
   *
   * @param config - Abstract cache configuration
   * @returns OpenAI provider options
   */
  toProviderOptions(config: CacheConfig): OpenAIProviderOptions;
}

/**
 * Gemini cache adapter that converts abstract config to Google options.
 */
export interface GeminiCacheAdapter {
  /**
   * Convert abstract cache config to Google-specific provider options.
   *
   * @param config - Cache configuration with optional cachedContent handle
   * @returns Google provider options
   */
  toProviderOptions(config: GeminiCacheConfig): GoogleProviderOptions;
}

/**
 * Validation result for cache configuration.
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  readonly valid: boolean;

  /** List of validation errors */
  readonly errors: string[];

  /** List of warnings (non-blocking issues) */
  readonly warnings: string[];
}

/**
 * Validate TTL ordering constraint.
 *
 * For providers like Anthropic, longer TTLs must come before shorter TTLs
 * in the same request to ensure proper cache hierarchy.
 *
 * @param segments - Array of cache segments with TTL values
 * @returns Validation result
 */
export function validateTtlOrdering(
  segments: {ttl?: CacheTTL}[],
): ValidationResult {
  const errors: string[] = [];

  // TTL hierarchy (longer to shorter)
  const ttlOrder: Record<CacheTTL, number> = {
    '1h': 3600,
    '5m': 300,
  };

  let previousTtlValue = Infinity;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.ttl) {
      const currentTtlValue = ttlOrder[segment.ttl];

      if (currentTtlValue > previousTtlValue) {
        errors.push(
          `Segment ${i} TTL '${segment.ttl}' is longer than previous segment. ` +
            'TTL values must be ordered from longest to shortest in the same request.',
        );
      }

      previousTtlValue = currentTtlValue;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validate breakpoint limit against provider capabilities.
 *
 * @param count - Number of breakpoints requested
 * @param provider - Target provider
 * @param model - Target model
 * @returns Validation result
 */
export function validateBreakpointLimit(
  count: number,
  provider: Provider,
  model: string,
): ValidationResult {
  const capabilities = getCacheCapabilities(provider, model);
  const errors: string[] = [];

  if (count > capabilities.maxBreakpoints) {
    errors.push(
      `Requested ${count} breakpoints exceeds provider limit of ${capabilities.maxBreakpoints}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validate minimum token threshold against provider requirements.
 *
 * @param tokens - Estimated token count for content
 * @param provider - Target provider
 * @param model - Target model
 * @returns Validation result
 */
export function validateMinTokens(
  tokens: number,
  provider: Provider,
  model: string,
): ValidationResult {
  const capabilities = getCacheCapabilities(provider, model);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (tokens < capabilities.minTokens) {
    warnings.push(
      `Content has ${tokens} tokens, below provider minimum of ${capabilities.minTokens} for effective caching`,
    );
  }

  return {
    valid: true, // This is a warning, not an error
    errors,
    warnings,
  };
}

/**
 * Create an Anthropic cache adapter with model-specific capabilities.
 *
 * @param model - Anthropic model name
 * @returns Configured adapter instance
 */
export function createAnthropicAdapter(model: string): AnthropicCacheAdapter {
  const capabilities = getCacheCapabilities('anthropic', model);

  return {
    toProviderOptions(config: CacheConfig): AnthropicProviderOptions {
      // Default values
      const ttl = config.ttl ?? '5m';
      const breakpoints = Math.min(
        Math.max(config.breakpoints ?? 1, 0), // Ensure non-negative
        capabilities.maxBreakpoints,
      );

      // Only include cache control if caching is enabled and supported
      const cache =
        config.enabled && capabilities.supported
          ? {
              type: 'ephemeral' as const,
              ttl: capabilities.supportsTtl ? ttl : undefined,
            }
          : undefined;

      return {
        cache,
        breakpoints,
      };
    },
  };
}

/**
 * Create an OpenAI cache adapter with model-specific capabilities.
 *
 * @param model - OpenAI model name
 * @returns Configured adapter instance
 */
export function createOpenAIAdapter(model: string): OpenAICacheAdapter {
  const capabilities = getCacheCapabilities('openai', model);

  return {
    toProviderOptions(config: CacheConfig): OpenAIProviderOptions {
      return {
        autoCaching: config.enabled && capabilities.supported,
        toolCaching: capabilities.supportsToolCaching
          ? {enabled: config.enabled}
          : undefined,
      };
    },
  };
}

/**
 * Create a Gemini cache adapter with model-specific capabilities.
 *
 * Gemini caching is explicit and requires a pre-created cached content
 * resource id. When unavailable, adapter returns an empty options object.
 *
 * @param model - Gemini model name
 * @returns Configured adapter instance
 */
export function createGeminiAdapter(model: string): GeminiCacheAdapter {
  const capabilities = getCacheCapabilities('google', model);

  return {
    toProviderOptions(config: GeminiCacheConfig): GoogleProviderOptions {
      if (!config.enabled || !capabilities.supported) {
        return {};
      }

      const cachedContent = config.cachedContent?.trim();
      if (!cachedContent) {
        // Graceful fallback: request proceeds without Gemini cache handle.
        return {};
      }

      return {cachedContent};
    },
  };
}

/**
 * Default cache configuration factory.
 *
 * @param overrides - Partial config to override defaults
 * @returns Complete cache configuration with defaults
 */
export function createDefaultCacheConfig(
  overrides: Partial<CacheConfig> = {},
): CacheConfig {
  return {
    enabled: true,
    scope: 'developer-content',
    ttl: '5m',
    breakpoints: 1,
    ...overrides,
  };
}

/**
 * User content cache configuration factory.
 *
 * Safe-by-default configuration for user-provided content.
 *
 * @param overrides - Partial config to override defaults
 * @returns Cache configuration safe for user content
 */
export function createUserContentConfig(
  overrides: Partial<CacheConfig> = {},
): CacheConfig {
  return createDefaultCacheConfig({
    scope: 'allow-user-content',
    ttl: '5m', // Shorter TTL for user data
    breakpoints: 1, // Conservative breakpoint usage
    ...overrides,
  });
}

/**
 * Developer content cache configuration factory.
 *
 * Optimized configuration for developer-controlled content.
 *
 * @param overrides - Partial config to override defaults
 * @returns Cache configuration optimized for developer content
 */
export function createDeveloperContentConfig(
  overrides: Partial<CacheConfig> = {},
): CacheConfig {
  return createDefaultCacheConfig({
    scope: 'developer-content',
    ttl: '1h', // Longer TTL for stable content
    breakpoints: 4, // More aggressive breakpoint usage
    ...overrides,
  });
}
