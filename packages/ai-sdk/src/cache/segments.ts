/**
 * Cache segments API - First-class primitive for cache management
 *
 * This module provides the CacheSegmentManager class and related utilities
 * for managing cache segments as specified in Task 7.3. It includes
 * validation, token estimation, and safe-by-default policies.
 */

import type {CacheCapabilities, Provider} from './capabilities.js';
import {getCacheCapabilities} from './capabilities.js';
import type {CacheConfig, CacheScope, CacheTTL} from './types.js';
import {validateMinTokens, validateBreakpointLimit} from './types.js';

/**
 * Options for creating a cache segment.
 */
export interface SegmentOptions {
  /** Security scope for this cache segment (overrides default) */
  readonly scope?: CacheScope;

  /** Time-to-live for this cache entry (overrides default) */
  readonly ttl?: CacheTTL;

  /** Minimum token count to trigger caching (overrides default) */
  readonly minTokens?: number;

  /** Whether to force caching even if below provider minimum */
  readonly force?: boolean;
}

/**
 * Metadata about a cache segment.
 */
export interface CacheSegment {
  /** Unique cache key for this segment */
  readonly key: string;

  /** String content being cached */
  readonly content: string;

  /** Estimated token count for this content */
  readonly tokenCount: number;

  /** Time-to-live for this cache entry */
  readonly ttl: CacheTTL;

  /** Security scope for this segment */
  readonly scope: CacheScope;

  /** Timestamp when segment was created */
  readonly createdAt: number;
}

/**
 * Validation result for cache operations.
 */
export interface ValidationResult {
  /** Whether the operation is valid */
  readonly valid: boolean;

  /** List of validation errors (blocking) */
  readonly errors: string[];

  /** List of warnings (non-blocking) */
  readonly warnings: string[];
}

/**
 * Cache segment manager for managing cache segments within a context.
 *
 * This class provides the core cache segment functionality as specified
 * in Task 7.3, with validation, token estimation, and safety features.
 */
export class CacheSegmentManager {
  private readonly provider: Provider;
  private readonly model: string;
  private readonly capabilities: CacheCapabilities;
  private readonly segments: CacheSegment[] = [];
  private readonly defaultConfig: CacheConfig;

  /**
   * Create a new cache segment manager.
   *
   * @param provider - LLM provider
   * @param model - Model name
   * @param config - Default cache configuration
   */
  constructor(provider: Provider, model: string, config: CacheConfig) {
    this.provider = provider;
    this.model = model;
    this.capabilities = getCacheCapabilities(provider, model);
    this.defaultConfig = config;
  }

  /**
   * Create an explicit cache segment for arbitrary content.
   *
   * @param key - Unique cache key for this segment
   * @param content - Content to cache (will be stringified if object)
   * @param options - Cache segment options
   * @throws Error if validation fails and force is not enabled
   */
  segment(
    key: string,
    content: string | object,
    options: SegmentOptions = {},
  ): void {
    const contentString =
      typeof content === 'string' ? content : JSON.stringify(content);
    const tokenCount = this.estimateTokens(contentString);

    // Apply defaults from configuration
    const scope =
      options.scope ?? this.defaultConfig.scope ?? 'developer-content';
    const ttl = options.ttl ?? this.defaultConfig.ttl ?? '5m';
    const minTokens = options.minTokens ?? this.capabilities.minTokens;

    // Validate segment
    const validation = this.validateSegment(
      key,
      contentString,
      scope,
      ttl,
      tokenCount,
      minTokens,
      options.force,
    );
    if (!validation.valid && !options.force) {
      throw new Error(
        `Cache segment validation failed: ${validation.errors.join(', ')}`,
      );
    }

    // Create segment
    const segment: CacheSegment = {
      key,
      content: contentString,
      tokenCount,
      ttl,
      scope,
      createdAt: Date.now(),
    };

    this.segments.push(segment);
  }

  /**
   * Cache a system prompt with optimized defaults.
   *
   * Convenience method for system prompts which use 'system-only' scope
   * and default to longer TTL ('24h' equivalent, but we only support '1h').
   *
   * @param systemPrompt - The system prompt content
   * @param options - Optional overrides for system prompt caching
   */
  system(systemPrompt: string, options: SegmentOptions = {}): void {
    this.segment(`system-${Date.now()}`, systemPrompt, {
      scope: 'system-only',
      ttl: '1h', // Longer TTL for system content
      ...options,
    });
  }

  /**
   * Get all segments in this manager.
   *
   * @returns Array of all cache segments
   */
  getSegments(): readonly CacheSegment[] {
    return [...this.segments];
  }

  /**
   * Clear all segments from this manager.
   */
  clear(): void {
    this.segments.length = 0;
  }

  /**
   * Validate the current segments against the current model.
   *
   * @returns Validation result
   */
  validate(): ValidationResult {
    return this.validateForModel(this.model);
  }

  /**
   * Validate the current segments against the target model.
   *
   * @param model - Target model to validate against
   * @returns Validation result
   */
  validateForModel(model: string): ValidationResult {
    const capabilities = getCacheCapabilities(this.provider, model);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if caching is supported
    if (!capabilities.supported) {
      errors.push(`Caching is not supported for model '${model}'`);
      return {valid: false, errors, warnings};
    }

    // Validate segment count against breakpoint limit
    const breakpointValidation = validateBreakpointLimit(
      this.segments.length,
      this.provider,
      model,
    );
    errors.push(...breakpointValidation.errors);
    warnings.push(...breakpointValidation.warnings);

    // Validate each segment
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];

      // Validate token count
      const tokenValidation = validateMinTokens(
        segment.tokenCount,
        this.provider,
        model,
      );
      warnings.push(...tokenValidation.warnings);

      // Validate TTL support
      if (segment.ttl && !capabilities.supportsTtl) {
        warnings.push(
          `Segment ${i} (${segment.key}) specifies TTL '${segment.ttl}' but model '${model}' does not support TTL`,
        );
      }

      // Validate specific TTL value
      if (
        capabilities.supportsTtl &&
        !capabilities.supportedTtl.includes(segment.ttl)
      ) {
        errors.push(
          `Segment ${i} (${segment.key}) uses unsupported TTL '${segment.ttl}'. Supported: ${capabilities.supportedTtl.join(', ')}`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Estimate token count for content using simple heuristic.
   *
   * Uses ~4 characters per token approximation which works reasonably
   * well for English text and JSON structures.
   *
   * @param content - Content to estimate
   * @returns Estimated token count
   */
  estimateTokens(content: string): number {
    // Simple heuristic: ~4 characters per token for English text
    return Math.ceil(content.length / 4);
  }

  /**
   * Check if content should be cached based on configuration and constraints.
   *
   * @param content - Content to check
   * @param options - Cache options
   * @returns Whether content should be cached
   */
  shouldCache(content: string, options: SegmentOptions = {}): boolean {
    if (!this.capabilities.supported || !this.defaultConfig.enabled) {
      return false;
    }

    const tokenCount = this.estimateTokens(content);
    const minTokens = options.minTokens ?? this.capabilities.minTokens;

    // Allow caching if forced or meets token threshold
    return options.force === true || tokenCount >= minTokens;
  }

  /**
   * Get total estimated tokens across all segments.
   *
   * @returns Total token count
   */
  getTotalTokens(): number {
    return this.segments.reduce(
      (total, segment) => total + segment.tokenCount,
      0,
    );
  }

  /**
   * Get segments filtered by scope.
   *
   * @param scope - Scope to filter by
   * @returns Segments with the specified scope
   */
  getSegmentsByScope(scope: CacheScope): readonly CacheSegment[] {
    return this.segments.filter((segment) => segment.scope === scope);
  }

  /**
   * Get segments filtered by TTL.
   *
   * @param ttl - TTL to filter by
   * @returns Segments with the specified TTL
   */
  getSegmentsByTtl(ttl: CacheTTL): readonly CacheSegment[] {
    return this.segments.filter((segment) => segment.ttl === ttl);
  }

  /**
   * Validate a single segment before creation.
   *
   * @param key - Segment key
   * @param content - Segment content
   * @param scope - Security scope
   * @param ttl - Time-to-live
   * @param tokenCount - Estimated tokens
   * @param minTokens - Minimum token threshold
   * @param force - Whether to force caching
   * @returns Validation result
   */
  private validateSegment(
    key: string,
    content: string,
    scope: CacheScope,
    ttl: CacheTTL,
    tokenCount: number,
    minTokens: number,
    force?: boolean,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if caching is supported
    if (!this.capabilities.supported) {
      errors.push('Caching is not supported for this provider/model');
    }

    // Check for duplicate keys
    if (this.segments.some((segment) => segment.key === key)) {
      errors.push(`Cache key '${key}' already exists`);
    }

    // Check breakpoint limit against configuration
    const maxBreakpoints = Math.min(
      this.defaultConfig.breakpoints ?? this.capabilities.maxBreakpoints,
      this.capabilities.maxBreakpoints,
    );
    if (this.segments.length >= maxBreakpoints) {
      errors.push(
        `Cannot add segment: would exceed maximum breakpoints (${maxBreakpoints})`,
      );
    }

    // Check TTL support
    if (!this.capabilities.supportsTtl && ttl) {
      warnings.push(`TTL '${ttl}' specified but provider does not support TTL`);
    }

    // Validate specific TTL value
    if (
      this.capabilities.supportsTtl &&
      !this.capabilities.supportedTtl.includes(ttl)
    ) {
      errors.push(
        `Unsupported TTL '${ttl}'. Supported values: ${this.capabilities.supportedTtl.join(', ')}`,
      );
    }

    // Check token threshold
    if (tokenCount < minTokens && !force) {
      warnings.push(
        `Content has ${tokenCount} tokens, below minimum of ${minTokens}. Consider using force: true`,
      );
    }

    // Validate content
    if (content.length === 0) {
      warnings.push('Cache segment has empty content');
    }

    // Validate scope security
    if (
      scope === 'allow-user-content' &&
      this.defaultConfig.scope !== 'allow-user-content'
    ) {
      warnings.push(
        'Using allow-user-content scope when context default is more restrictive. Ensure this is intentional.',
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Factory function to create a cache segment manager.
 *
 * @param provider - LLM provider
 * @param model - Model name
 * @param config - Cache configuration
 * @returns New cache segment manager instance
 */
export function createCacheSegmentManager(
  provider: Provider,
  model: string,
  config: CacheConfig,
): CacheSegmentManager {
  return new CacheSegmentManager(provider, model, config);
}
