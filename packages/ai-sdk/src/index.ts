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
export type {CacheCapabilities, Provider} from './cache/capabilities.js';

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
} from './cache/types.js';
export type {
  CacheConfig,
  CacheScope,
  CacheTTL,
  AnthropicProviderOptions,
  OpenAIProviderOptions,
  GoogleProviderOptions,
  GeminiCacheConfig,
  ProviderOptions,
  AnthropicCacheAdapter,
  OpenAICacheAdapter,
  GeminiCacheAdapter,
  ValidationResult,
} from './cache/types.js';

// Cache segments API for first-class caching
export {createCacheSegmentManager} from './cache/segments.js';
export type {
  CacheSegmentManager,
  CacheSegment,
  SegmentOptions,
} from './cache/segments.js';

// Cache metrics for performance tracking and cost analysis
export {
  parseAnthropicMetrics,
  parseOpenAIMetrics,
  parseGoogleMetrics,
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
  GoogleCacheMetrics,
} from './cache/metrics.js';

// Gemini dynamic model discovery (models.list)
export {
  listGeminiModels,
  listGeminiModelsCached,
  clearGeminiModelsCache,
  normalizeGeminiModelName,
  supportsGenerateContent,
} from './providers/gemini-models.js';
export type {
  GeminiModel,
  ListGeminiModelsOptions,
  ListGeminiModelsCachedOptions,
} from './providers/gemini-models.js';

// Runtime model catalog (pricing + capabilities)
export {
  loadModelCatalog,
  setModelCatalogOverrides,
  clearModelCatalogOverrides,
  getModelCatalogOverrides,
  ModelCatalogError,
  ModelCatalogValidationError,
  ModelCatalogLoadError,
} from './catalog/model-catalog.js';
export type {
  CatalogProvider,
  CatalogPricingEntry,
  CatalogCapabilityEntry,
  CatalogPricingProvider,
  CatalogCapabilityProvider,
  ModelCatalog,
  LoadModelCatalogOptions,
  LoadModelCatalogResult,
} from './catalog/model-catalog.js';

// Cache warmup for fork optimization
export {
  explicitWarmup,
  firstBranchWarmup,
  createWarmupExecutor,
  setupWarmupExecutor,
  estimateWarmupCost,
  shouldWarmup,
} from './cache/warmup.js';
export type {WarmupConfig, FirstBranchWarmupResult} from './cache/warmup.js';

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

// Cost estimation and tracking
export {estimateTokens, estimateTokensForSegments} from './cost/tokens.js';
export type {TokenEstimate} from './cost/tokens.js';

export {
  getPricing,
  getAllPricing,
  getPricingByProvider,
  calculateCacheWritePricing,
  exportPricingAsJSON,
  importPricingFromJSON,
  PRICING_DATA,
} from './cost/pricing.js';
export type {ModelPricing} from './cost/pricing.js';

export {
  calculateCost,
  estimateCost,
  calculateBatchCost,
  formatCostBreakdown,
  compareCosts,
} from './cost/calculator.js';
export type {CostBreakdown, TokenUsage} from './cost/calculator.js';

// Re-export core types for convenience
export type {Context, Owned, Schema, InferOptions} from '@mullion/core';
