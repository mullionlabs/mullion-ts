/**
 * Cache module for ScopeStack AI SDK
 *
 * This module provides comprehensive caching capabilities for LLM interactions,
 * including provider-aware optimization, cost tracking, and safe-by-default policies.
 */

// Provider capabilities
export {
  getCacheCapabilities,
  supportsCacheFeature,
  getEffectiveBreakpointLimit,
  isValidTtl,
  getRecommendedCacheStrategy,
  type CacheCapabilities,
  type Provider,
} from './capabilities.js';

// Cache configuration types and utilities
export {
  validateTtlOrdering,
  validateBreakpointLimit,
  validateMinTokens,
  createAnthropicAdapter,
  createOpenAIAdapter,
  createDefaultCacheConfig,
  createUserContentConfig,
  createDeveloperContentConfig,
  type CacheConfig,
  type CacheTTL,
  type CacheScope,
  type AnthropicProviderOptions,
  type OpenAIProviderOptions,
  type ProviderOptions,
  type AnthropicCacheAdapter,
  type OpenAICacheAdapter,
  type ValidationResult,
} from './types.js';

// TODO: Add other cache modules as they are implemented
// export { ... } from './segments.js';
// export { ... } from './metrics.js';
