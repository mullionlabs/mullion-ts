// @scopestack/ai-sdk - Vercel AI SDK integration for ScopeStack

export {
  createScopeStackClient,
  extractConfidenceFromFinishReason,
} from './client.js';
export type {
  ScopeStackClient,
  ScopeStackClientOptions,
  ScopeStackContext,
} from './client.js';

// Cache capabilities for provider optimization
export {
  getCacheCapabilities,
  supportsCacheFeature,
  getEffectiveBreakpointLimit,
} from './cache-capabilities.js';
export type { CacheCapabilities, Provider } from './cache-capabilities.js';

// Cache configuration types and utilities
export {
  validateCacheConfig,
  createCacheConfig,
  createUserContentCacheConfig,
  createDeveloperCacheConfig,
  adaptToAnthropicCache,
  adaptToOpenAICache,
} from './cache-config.js';
export type {
  CacheConfig,
  CacheScope,
  CacheTTL,
  CacheSegmentConfig,
  AnthropicCacheConfig,
  OpenAICacheConfig,
} from './cache-config.js';

// Cache segments API for first-class caching
export { createCacheSegmentsAPI } from './cache-segments.js';
export type {
  CacheSegmentsAPI,
  CacheSegmentOptions,
  CacheSegmentMetadata,
  CacheContextMetadata,
} from './cache-segments.js';

// Cache metrics for performance tracking and cost analysis
export {
  parseAnthropicMetrics,
  parseOpenAIMetrics,
  parseCacheMetrics,
  aggregateCacheMetrics,
  estimateCacheSavings,
  formatCacheStats,
  CacheMetricsCollector,
} from './cache-metrics.js';
export type {
  CacheStats,
  AnthropicCacheMetrics,
  OpenAICacheMetrics,
} from './cache-metrics.js';

// Re-export core types for convenience
export type { Context, Owned, Schema, InferOptions } from '@scopestack/core';
