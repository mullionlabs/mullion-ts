// @scopestack/ai-sdk - Vercel AI SDK integration for ScopeStack

export {
  createScopeStackClient,
  extractConfidenceFromFinishReason,
} from './client.js';
export type {
  ScopeStackClient,
  ScopeStackClientOptions,
  ScopeStackContext,
  ScopeStackInferOptions,
  CacheOptions,
} from './client.js';

// Cache capabilities for provider optimization
export {
  getCacheCapabilities,
  supportsCacheFeature,
  getEffectiveBreakpointLimit,
  isValidTtl,
  getRecommendedCacheStrategy,
} from './cache/capabilities.js';
export type { CacheCapabilities, Provider } from './cache/capabilities.js';

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
} from './cache/types.js';
export type {
  CacheConfig,
  CacheScope,
  CacheTTL,
  AnthropicProviderOptions,
  OpenAIProviderOptions,
  ProviderOptions,
  AnthropicCacheAdapter,
  OpenAICacheAdapter,
  ValidationResult,
} from './cache/types.js';

// Cache segments API for first-class caching
export { createCacheSegmentManager } from './cache/segments.js';
export type {
  CacheSegmentManager,
  CacheSegment,
  SegmentOptions,
} from './cache/segments.js';

// Cache metrics for performance tracking and cost analysis
export {
  parseAnthropicMetrics,
  parseOpenAIMetrics,
  parseCacheMetrics,
  aggregateCacheMetrics,
  estimateCacheSavings,
  formatCacheStats,
  CacheMetricsCollector,
} from './cache/metrics.js';
export type {
  CacheStats,
  AnthropicCacheMetrics,
  OpenAICacheMetrics,
} from './cache/metrics.js';

// Re-export core types for convenience
export type { Context, Owned, Schema, InferOptions } from '@scopestack/core';
