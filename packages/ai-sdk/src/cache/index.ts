/**
 * Cache module for Mullion AI SDK
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
  createGeminiAdapter,
  createDefaultCacheConfig,
  createUserContentConfig,
  createDeveloperContentConfig,
  type CacheConfig,
  type CacheTTL,
  type CacheScope,
  type AnthropicProviderOptions,
  type OpenAIProviderOptions,
  type GoogleProviderOptions,
  type GeminiCacheConfig,
  type ProviderOptions,
  type AnthropicCacheAdapter,
  type OpenAICacheAdapter,
  type GeminiCacheAdapter,
  type ValidationResult,
} from './types.js';

// Cache segments API
export {
  createCacheSegmentManager,
  CacheSegmentManager,
  type CacheSegment,
  type SegmentOptions,
  type ValidationResult as SegmentValidationResult,
} from './segments.js';

// Cache metrics
export {
  parseAnthropicMetrics,
  parseOpenAIMetrics,
  parseGoogleMetrics,
  parseCacheMetrics,
  aggregateCacheMetrics,
  estimateCacheSavings,
  formatCacheStats,
  CacheMetricsCollector,
  type CacheStats,
  type AnthropicCacheMetrics,
  type OpenAICacheMetrics,
  type GoogleCacheMetrics,
} from './metrics.js';

// Cache warmup for fork optimization
export {
  explicitWarmup,
  firstBranchWarmup,
  createWarmupExecutor,
  setupWarmupExecutor,
  estimateWarmupCost,
  shouldWarmup,
  type WarmupConfig,
  type FirstBranchWarmupResult,
} from './warmup.js';

// Schema conflict detection for fork optimization
export {
  computeSchemaSignature,
  detectSchemaConflict,
  handleSchemaConflict,
  areSchemasCompatible,
  describeSchemasDifference,
  type SchemaInfo,
  type DetectSchemaConflictOptions,
  type DetailedSchemaConflictResult,
} from './schema-conflict.js';
