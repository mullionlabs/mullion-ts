/**
 * Provider capability matrix for cache optimization
 *
 * This module provides information about caching capabilities of different
 * LLM providers and models, enabling Mullion to optimize cache usage
 * based on provider-specific constraints and features.
 *
 * IMPORTANT: These constraints are based on real provider limitations discovered during research.
 * Ignoring them will result in "cache exists but doesn't work" scenarios.
 */

/**
 * Cache capabilities for a specific provider/model combination.
 *
 * This interface describes what caching features are supported
 * and what constraints exist for a given model.
 */
export interface CacheCapabilities {
  /** Whether caching is supported at all for this provider/model */
  readonly supported: boolean;

  /** Minimum number of tokens required for cache to be effective */
  readonly minTokens: number;

  /** Maximum number of cache breakpoints supported */
  readonly maxBreakpoints: number;

  /** Whether the provider supports TTL (time-to-live) for cache entries */
  readonly supportsTtl: boolean;

  /** Specific TTL values supported by this provider/model */
  readonly supportedTtl: readonly ('5m' | '1h')[];

  /** Whether the provider supports caching tool/function calls */
  readonly supportsToolCaching: boolean;

  /** Whether caching is automatic (like OpenAI) vs explicit (like Anthropic) */
  readonly isAutomatic: boolean;
}

/**
 * Supported LLM providers for cache optimization.
 */
export type Provider = 'anthropic' | 'openai' | 'google' | 'other';

/**
 * Anthropic model names with their cache characteristics.
 *
 * Model-specific thresholds based on provider documentation:
 * - Claude Opus 4.5, Haiku 4.5: 4096 tokens
 * - Claude Haiku 3/3.5: 2048 tokens
 * - Claude Sonnet, Opus (others): 1024 tokens
 */
const ANTHROPIC_MODELS = {
  // Claude 4.5 models (future-proofing)
  'claude-opus-4-5': {
    supported: true,
    minTokens: 4096,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-4-5-haiku': {
    supported: true,
    minTokens: 4096,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },

  // Claude 3.5 models
  'claude-3-5-sonnet-20241022': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-3-5-sonnet-20240620': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-3-5-haiku-20241022': {
    supported: true,
    minTokens: 2048, // Haiku 3.5 uses higher threshold
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },

  // Claude 3 models
  'claude-3-opus-20240229': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-3-sonnet-20240229': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-3-haiku-20240307': {
    supported: true,
    minTokens: 2048, // Haiku 3 uses higher threshold
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
} as const;

/**
 * OpenAI model names with their cache characteristics.
 *
 * OpenAI uses automatic caching without explicit breakpoints.
 * Minimum 1024 tokens, 128 token increments for optimal caching.
 */
const OPENAI_MODELS = {
  // GPT-4o models
  'gpt-4o': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-4o-mini': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },

  // GPT-4 Turbo
  'gpt-4-turbo': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-4-turbo-preview': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },

  // GPT-4 Classic
  'gpt-4': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: false,
    isAutomatic: true,
  },

  // GPT-3.5 models
  'gpt-3.5-turbo': {
    supported: false, // GPT-3.5 doesn't have caching
    minTokens: 1024,
    maxBreakpoints: 0,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
} as const;

/**
 * Default cache capabilities for unknown or unsupported models.
 */
const DEFAULT_CAPABILITIES: CacheCapabilities = {
  supported: false,
  minTokens: 2048, // Conservative default
  maxBreakpoints: 1, // Safe minimum
  supportsTtl: false,
  supportedTtl: [],
  supportsToolCaching: false,
  isAutomatic: false,
} as const;

/**
 * Get cache capabilities for a specific provider and model combination.
 *
 * This function returns the caching capabilities and constraints for the
 * given provider/model pair. This information can be used to optimize
 * cache usage and avoid hitting provider-specific limitations.
 *
 * @param provider - The LLM provider ('anthropic', 'openai', etc.)
 * @param model - The specific model name/identifier
 * @returns Cache capabilities object with constraints and feature flags
 *
 * @example
 * ```typescript
 * import { getCacheCapabilities } from '@mullion/ai-sdk';
 *
 * // Anthropic Claude
 * const claudeCaps = getCacheCapabilities('anthropic', 'claude-3-5-sonnet-20241022');
 * console.log(claudeCaps);
 * // {
 * //   supported: true,
 * //   minTokens: 1024,
 * //   maxBreakpoints: 4,
 * //   supportsTtl: true,
 * //   supportedTtl: ['5m', '1h'],
 * //   supportsToolCaching: false,
 * //   isAutomatic: false
 * // }
 *
 * // OpenAI GPT-4
 * const gptCaps = getCacheCapabilities('openai', 'gpt-4o');
 * console.log(gptCaps);
 * // {
 * //   supported: true,
 * //   minTokens: 1024,
 * //   maxBreakpoints: Infinity,
 * //   supportsTtl: false,
 * //   supportedTtl: [],
 * //   supportsToolCaching: true,
 * //   isAutomatic: true
 * // }
 * ```
 *
 * @example
 * ```typescript
 * // Use capabilities to optimize cache strategy
 * const caps = getCacheCapabilities('anthropic', 'claude-3-5-sonnet-20241022');
 *
 * if (!caps.supported) {
 *   console.log('Caching not supported for this model');
 *   return;
 * }
 *
 * if (systemPrompt.length < caps.minTokens) {
 *   console.log('System prompt too short for caching');
 * }
 *
 * if (cacheBreakpoints.length > caps.maxBreakpoints) {
 *   throw new Error(`Too many breakpoints: max ${caps.maxBreakpoints}`);
 * }
 * ```
 */
export function getCacheCapabilities(
  provider: Provider,
  model: string,
): CacheCapabilities {
  switch (provider) {
    case 'anthropic': {
      const anthropicModel = model as keyof typeof ANTHROPIC_MODELS;
      const modelConfig = ANTHROPIC_MODELS[anthropicModel];

      if (modelConfig) {
        return modelConfig;
      }

      // Fallback for unknown Anthropic models
      // Use Claude 3.5 Sonnet defaults (most common case)
      return {
        supported: true,
        minTokens: 1024,
        maxBreakpoints: 4,
        supportsTtl: true,
        supportedTtl: ['5m', '1h'],
        supportsToolCaching: false,
        isAutomatic: false,
      };
    }

    case 'openai': {
      const openaiModel = model as keyof typeof OPENAI_MODELS;
      const modelConfig = OPENAI_MODELS[openaiModel];

      if (modelConfig) {
        return modelConfig;
      }

      // Fallback for unknown OpenAI models
      // Assume modern GPT-4 capabilities by default
      return {
        supported: true,
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportedTtl: [],
        supportsToolCaching: true,
        isAutomatic: true,
      };
    }

    case 'google':
      // Google Gemini has caching but different API
      return {
        supported: false, // Not implemented yet
        minTokens: 2048,
        maxBreakpoints: 1,
        supportsTtl: true,
        supportedTtl: ['5m', '1h'],
        supportsToolCaching: false,
        isAutomatic: false,
      };

    case 'other':
    default:
      // Return conservative defaults for unsupported providers
      return DEFAULT_CAPABILITIES;
  }
}

/**
 * Check if a specific caching feature is supported by a provider/model.
 *
 * Convenience function to quickly check for specific cache capabilities
 * without needing to destructure the full capabilities object.
 *
 * @param provider - The LLM provider
 * @param model - The specific model name
 * @param feature - The cache feature to check
 * @returns True if the feature is supported
 *
 * @example
 * ```typescript
 * if (supportsCacheFeature('anthropic', 'claude-3-5-sonnet-20241022', 'ttl')) {
 *   // Can use TTL-based caching
 *   ctx.cache.system(prompt, { ttl: '1h' });
 * }
 *
 * if (supportsCacheFeature('openai', 'gpt-4o', 'automatic')) {
 *   // OpenAI handles caching automatically
 *   console.log('Automatic caching enabled');
 * }
 * ```
 */
export function supportsCacheFeature(
  provider: Provider,
  model: string,
  feature: 'ttl' | 'toolCaching' | 'automatic',
): boolean {
  const caps = getCacheCapabilities(provider, model);

  switch (feature) {
    case 'ttl':
      return caps.supportsTtl;
    case 'toolCaching':
      return caps.supportsToolCaching;
    case 'automatic':
      return caps.isAutomatic;
    default:
      return false;
  }
}

/**
 * Get the effective cache breakpoint limit for a provider/model.
 *
 * Returns a practical limit for cache breakpoints, converting Infinity
 * to a reasonable maximum for providers that support automatic caching.
 *
 * @param provider - The LLM provider
 * @param model - The specific model name
 * @param maxPractical - Maximum practical breakpoints (default: 10)
 * @returns Effective breakpoint limit
 *
 * @example
 * ```typescript
 * const limit = getEffectiveBreakpointLimit('openai', 'gpt-4o');
 * console.log(limit); // 10 (practical limit instead of Infinity)
 *
 * const anthropicLimit = getEffectiveBreakpointLimit('anthropic', 'claude-3-5-sonnet-20241022');
 * console.log(anthropicLimit); // 4 (actual provider limit)
 * ```
 */
export function getEffectiveBreakpointLimit(
  provider: Provider,
  model: string,
  maxPractical = 10,
): number {
  const caps = getCacheCapabilities(provider, model);
  return caps.maxBreakpoints === Infinity ? maxPractical : caps.maxBreakpoints;
}

/**
 * Validate if a TTL value is supported by a provider/model.
 *
 * @param provider - The LLM provider
 * @param model - The specific model name
 * @param ttl - The TTL value to validate
 * @returns True if the TTL is supported
 *
 * @example
 * ```typescript
 * if (isValidTtl('anthropic', 'claude-3-5-sonnet-20241022', '1h')) {
 *   // Can use 1 hour TTL
 * }
 *
 * if (!isValidTtl('openai', 'gpt-4o', '5m')) {
 *   // OpenAI doesn't support explicit TTL
 * }
 * ```
 */
export function isValidTtl(
  provider: Provider,
  model: string,
  ttl: '5m' | '1h',
): boolean {
  const caps = getCacheCapabilities(provider, model);
  return caps.supportsTtl && caps.supportedTtl.includes(ttl);
}

/**
 * Get the recommended cache strategy for a provider/model combination.
 *
 * @param provider - The LLM provider
 * @param model - The specific model name
 * @returns Recommended caching strategy description
 *
 * @example
 * ```typescript
 * const strategy = getRecommendedCacheStrategy('anthropic', 'claude-3-5-sonnet-20241022');
 * // "explicit-segments" - Use explicit cache segments with TTL
 *
 * const openaiStrategy = getRecommendedCacheStrategy('openai', 'gpt-4o');
 * // "automatic-optimization" - OpenAI handles caching automatically
 * ```
 */
export function getRecommendedCacheStrategy(
  provider: Provider,
  model: string,
): 'explicit-segments' | 'automatic-optimization' | 'disabled' {
  const caps = getCacheCapabilities(provider, model);

  if (!caps.supported) {
    return 'disabled';
  }

  if (caps.isAutomatic) {
    return 'automatic-optimization';
  }

  return 'explicit-segments';
}
