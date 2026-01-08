// @mullion/ai-sdk - Vercel AI SDK integration for Mullion

export {
  createMullionClient,
  extractConfidenceFromFinishReason,
} from './client.js';
export type {
  MullionClient,
  MullionClientOptions,
  MullionContext,
  MullionInferOptions,
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

// Cache warmup for fork optimization
export {
  explicitWarmup,
  firstBranchWarmup,
  createWarmupExecutor,
  setupWarmupExecutor,
  estimateWarmupCost,
  shouldWarmup,
} from './cache/warmup.js';
export type { WarmupConfig, FirstBranchWarmupResult } from './cache/warmup.js';

// Schema conflict detection for fork optimization
export {
  computeSchemaSignature,
  detectSchemaConflict,
  handleSchemaConflict,
  areSchemasCompatible,
  describeSchemasDifference,
} from './cache/schema-conflict.js';
export type {
  SchemaInfo,
  DetectSchemaConflictOptions,
  DetailedSchemaConflictResult,
} from './cache/schema-conflict.js';

// Re-export core types for convenience
export type { Context, Owned, Schema, InferOptions } from '@mullion/core';
