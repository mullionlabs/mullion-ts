/**
 * Provider capability matrix for cache optimization
 *
 * This module provides information about caching capabilities of different
 * LLM providers and models, enabling ScopeStack to optimize cache usage
 * based on provider-specific constraints and features.
 */

/**
 * Cache capabilities for a specific provider/model combination.
 *
 * This interface describes what caching features are supported
 * and what constraints exist for a given model.
 */
export interface CacheCapabilities {
  /** Minimum number of tokens required for cache to be effective */
  readonly minTokens: number;

  /** Maximum number of cache breakpoints supported */
  readonly maxBreakpoints: number;

  /** Whether the provider supports TTL (time-to-live) for cache entries */
  readonly supportsTtl: boolean;

  /** Whether the provider supports caching tool/function calls */
  readonly supportsToolCaching: boolean;
}

/**
 * Supported LLM providers for cache optimization.
 */
export type Provider = 'anthropic' | 'openai' | 'google' | 'other';

/**
 * Anthropic model names with their cache characteristics.
 */
const ANTHROPIC_MODELS = {
  // Claude 3.5 Sonnet
  'claude-3-5-sonnet-20241022': {
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportsToolCaching: false,
  },
  'claude-3-5-sonnet-20240620': {
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportsToolCaching: false,
  },

  // Claude 3.5 Haiku
  'claude-3-5-haiku-20241022': {
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportsToolCaching: false,
  },

  // Claude 3 Opus
  'claude-3-opus-20240229': {
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportsToolCaching: false,
  },

  // Claude 3 Sonnet
  'claude-3-sonnet-20240229': {
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportsToolCaching: false,
  },

  // Claude 3 Haiku
  'claude-3-haiku-20240307': {
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportsToolCaching: false,
  },
} as const;

/**
 * OpenAI model names with their cache characteristics.
 * OpenAI uses automatic caching without explicit breakpoints.
 */
const OPENAI_MODELS = {
  // GPT-4 models
  'gpt-4o': {
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportsToolCaching: true,
  },
  'gpt-4o-mini': {
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportsToolCaching: true,
  },
  'gpt-4-turbo': {
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportsToolCaching: true,
  },
  'gpt-4': {
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportsToolCaching: false,
  },

  // GPT-3.5 models
  'gpt-3.5-turbo': {
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportsToolCaching: false,
  },
} as const;

/**
 * Default cache capabilities for unknown or unsupported models.
 */
const DEFAULT_CAPABILITIES: CacheCapabilities = {
  minTokens: 2048, // Conservative default
  maxBreakpoints: 1, // Safe minimum
  supportsTtl: false,
  supportsToolCaching: false,
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
 * import { getCacheCapabilities } from '@scopestack/ai-sdk';
 *
 * // Anthropic Claude
 * const claudeCaps = getCacheCapabilities('anthropic', 'claude-3-5-sonnet-20241022');
 * console.log(claudeCaps);
 * // { minTokens: 1024, maxBreakpoints: 4, supportsTtl: true, supportsToolCaching: false }
 *
 * // OpenAI GPT-4
 * const gptCaps = getCacheCapabilities('openai', 'gpt-4o');
 * console.log(gptCaps);
 * // { minTokens: 1024, maxBreakpoints: Infinity, supportsTtl: false, supportsToolCaching: true }
 * ```
 *
 * @example
 * ```typescript
 * // Use capabilities to optimize cache strategy
 * const caps = getCacheCapabilities('anthropic', 'claude-3-5-sonnet-20241022');
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
  model: string
): CacheCapabilities {
  switch (provider) {
    case 'anthropic': {
      const anthropicModel = model as keyof typeof ANTHROPIC_MODELS;
      const modelConfig = ANTHROPIC_MODELS[anthropicModel];

      if (modelConfig) {
        return modelConfig;
      }

      // Fallback for unknown Anthropic models - use Claude 3.5 Sonnet defaults
      return {
        minTokens: 1024,
        maxBreakpoints: 4,
        supportsTtl: true,
        supportsToolCaching: false,
      };
    }

    case 'openai': {
      const openaiModel = model as keyof typeof OPENAI_MODELS;
      const modelConfig = OPENAI_MODELS[openaiModel];

      if (modelConfig) {
        return modelConfig;
      }

      // Fallback for unknown OpenAI models - assume modern capabilities
      return {
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportsToolCaching: true,
      };
    }

    case 'google':
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
 * ```
 */
export function supportsCacheFeature(
  provider: Provider,
  model: string,
  feature: 'ttl' | 'toolCaching'
): boolean {
  const caps = getCacheCapabilities(provider, model);

  switch (feature) {
    case 'ttl':
      return caps.supportsTtl;
    case 'toolCaching':
      return caps.supportsToolCaching;
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
  maxPractical = 10
): number {
  const caps = getCacheCapabilities(provider, model);
  return caps.maxBreakpoints === Infinity ? maxPractical : caps.maxBreakpoints;
}
