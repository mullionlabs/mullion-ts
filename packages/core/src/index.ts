// @mullion/core - Type-safe LLM context management

// Brand types for nominal typing
export type {Brand, ScopeId} from './brand.js';

// Owned type for LLM-generated values with provenance tracking
export type {Owned, CreateOwnedOptions} from './owned.js';
export {createOwned, isOwned, ownedSchema} from './owned.js';

// Sink-safe helpers for logs, traces, and caches
export type {
  LogSafe,
  Redacted,
  SummarizeOptions,
  RedactOptions,
} from './sink-safe.js';
export {redact, summarize, assertSafeFor} from './sink-safe.js';

// Scoped cache helpers
export type {
  CacheKey,
  ScopedCache,
  ScopedCacheOptions,
} from './scoped-cache.js';
export {
  createCacheKey,
  createScopedCache,
  assertOwnedScope,
} from './scoped-cache.js';

// SemanticValue type for LLM-generated values with alternatives and reasoning
export type {
  SemanticValue,
  Alternative,
  CreateSemanticValueOptions,
} from './semantic-value.js';
export {
  createSemanticValue,
  isSemanticValue,
  semanticValueSchema,
  alternativeSchema,
} from './semantic-value.js';

// Context type for scoped LLM execution
export type {Context, Schema, ContextOptions, InferOptions} from './context.js';

// Scope function for creating scoped execution contexts
export {scope} from './scope.js';

// Bridge utilities for transferring values across scope boundaries
export type {BridgeMultipleOptions, BridgeMetadata} from './bridge.js';
export {
  bridge,
  bridgeSemantic,
  bridgeMultiple,
  getProvenance,
  isBridged,
  bridgeWithMetadata,
} from './bridge.js';

// Fork types and utilities for parallel execution with cache optimization
export type {
  ForkStrategy,
  WarmupStrategy,
  SchemaConflictBehavior,
  ForkBranch,
  ForkOptions,
  ForkCacheStats,
  ForkResult,
  SchemaConflictResult,
  WarmupResult,
  WarmupExecutor,
} from './fork/index.js';
export {
  fork,
  registerWarmupExecutor,
  getWarmupExecutor,
  clearWarmupExecutor,
} from './fork/index.js';

// Merge types and utilities for aggregating parallel inference results
export type {
  ConflictResolution,
  MergeConflict,
  MergeProvenance,
  MergeResult,
  MergeStrategy,
  WeightedVoteOptions,
  WeightedAverageOptions,
  WeightedAverageResult,
  FieldwiseOptions,
  ConcatOptions,
  CustomMergeFn,
  CustomOptions,
  ConsensusFailureBehavior,
  RequireConsensusOptions,
} from './merge/index.js';
export {
  merge,
  mergeResults,
  categorical,
  continuous,
  object,
  array,
  custom,
  weightedVote,
  weightedAverage,
  fieldwise,
  concat,
  requireConsensus,
} from './merge/index.js';

// Trace types for OpenTelemetry-compatible observability
export type {
  MullionOperation,
  MullionAttributes,
  SpanStatus,
  SpanKind,
  MullionSpan,
  SpanContext,
  StartSpanOptions,
  EndSpanOptions,
  SpanLike,
  LogSafeAttributes,
  SpanExporter,
  TraceCollectorOptions,
  OTLPHttpExporterOptions,
  SetupTracingOptions,
} from './trace/index.js';
export {
  isMullionSpan,
  isSpanContext,
  TraceCollector,
  getGlobalTraceCollector,
  setGlobalTraceCollector,
  clearGlobalTraceCollector,
  OTLPHttpExporter,
  OTLPExporters,
  setupMullionTracing,
  TracingPresets,
  disableMullionTracing,
  safeSetAttribute,
  safeAddEvent,
} from './trace/index.js';
