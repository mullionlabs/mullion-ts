/**
 * Trace types for OpenTelemetry-compatible observability.
 *
 * This module defines the type system for Mullion's tracing capabilities,
 * following OpenTelemetry semantic conventions while adding Mullion-specific
 * attributes for context safety, confidence tracking, and cost monitoring.
 *
 * @remarks
 * **Philosophy:**
 * - NOT building: our own UI, dashboards, trace storage
 * - Building: OTel-compatible exporters that integrate with existing platforms
 * - Zero overhead by default - tracing disabled until exporter attached
 *
 * **Design goals:**
 * - Follow OpenTelemetry Semantic Conventions for GenAI
 * - Preserve Mullion's unique value: scope safety, confidence, cost
 * - Integrate seamlessly with Datadog, Jaeger, Honeycomb, etc.
 *
 * @see {@link https://opentelemetry.io/docs/specs/semconv/gen-ai/}
 *
 * @module trace/types
 */

/**
 * Mullion-specific operation types tracked in spans.
 *
 * Each operation type represents a distinct Mullion concept that
 * provides observability into context safety and LLM workflows.
 *
 * @example
 * ```typescript
 * // infer: LLM inference within a scope
 * const result = await ctx.infer(schema, prompt);
 * // Creates span with operation: 'infer'
 *
 * // bridge: Cross-scope value transfer
 * const bridged = ctx.bridge(adminValue);
 * // Creates span with operation: 'bridge'
 *
 * // fork: Parallel execution with cache optimization
 * const results = await fork(ctx, options);
 * // Creates span with operation: 'fork'
 *
 * // merge: Result aggregation with consensus
 * const merged = merge(results, strategy);
 * // Creates span with operation: 'merge'
 * ```
 */
export type MullionOperation = 'infer' | 'bridge' | 'fork' | 'merge';

/**
 * Mullion-specific attributes for OpenTelemetry spans.
 *
 * These attributes capture the unique value Mullion provides:
 * - Scope safety and provenance tracking
 * - Confidence levels for LLM outputs
 * - Cache performance metrics
 * - Cost tracking and optimization
 *
 * All attributes use the `mullion.*` namespace to avoid conflicts
 * with standard OTel attributes.
 *
 * @remarks
 * Follows OpenTelemetry attribute naming conventions:
 * - Use dots for namespacing: `mullion.scope.id`
 * - Use underscores within names: `cache_hit_rate`
 * - Keep names concise but descriptive
 *
 * @example
 * ```typescript
 * const attributes: MullionAttributes = {
 *   'mullion.scope.id': 'admin',
 *   'mullion.scope.name': 'admin-review',
 *   'mullion.operation': 'infer',
 *   'mullion.confidence': 0.95,
 *   'mullion.cache.hit_rate': 0.8,
 *   'mullion.cache.saved_tokens': 5000,
 *   'mullion.cost.usd': 0.0234,
 * };
 * ```
 */
export interface MullionAttributes {
  /**
   * Unique scope identifier (compile-time type).
   *
   * @example 'admin', 'customer', 'public'
   */
  'mullion.scope.id': string;

  /**
   * Human-readable scope name.
   *
   * @example 'admin-review', 'customer-support', 'public-api'
   */
  'mullion.scope.name': string;

  /**
   * Mullion operation type.
   *
   * One of: 'infer', 'bridge', 'fork', 'merge'
   */
  'mullion.operation': MullionOperation;

  /**
   * Confidence score for the operation result (0-1).
   *
   * Only present for operations that produce Owned values with confidence.
   *
   * @example
   * - `1.0` = Highest confidence
   * - `0.5` = Medium confidence
   * - `0.0` = Lowest confidence
   */
  'mullion.confidence'?: number;

  /**
   * Source scope ID for bridge operations.
   *
   * Only present when `mullion.operation` is 'bridge'.
   * Indicates which scope the value originated from.
   *
   * @example 'admin' when bridging admin data to customer scope
   */
  'mullion.bridge.source'?: string;

  /**
   * Target scope ID for bridge operations.
   *
   * Only present when `mullion.operation` is 'bridge'.
   * Indicates which scope the value is being transferred to.
   *
   * @example 'customer' when bridging admin data to customer scope
   */
  'mullion.bridge.target'?: string;

  /**
   * Fork execution strategy.
   *
   * Only present when `mullion.operation` is 'fork'.
   * One of: 'fast-parallel', 'cache-optimized'
   */
  'mullion.fork.strategy'?: string;

  /**
   * Number of branches in fork operation.
   *
   * Only present when `mullion.operation` is 'fork'.
   */
  'mullion.fork.branch_count'?: number;

  /**
   * Warmup strategy used for cache optimization.
   *
   * Only present when `mullion.operation` is 'fork' and
   * `mullion.fork.strategy` is 'cache-optimized'.
   *
   * One of: 'explicit', 'first-branch', 'none'
   */
  'mullion.fork.warmup_strategy'?: string;

  /**
   * Consensus level achieved in merge operation (0-1).
   *
   * Only present when `mullion.operation` is 'merge'.
   * Indicates agreement level across merged results.
   *
   * @example
   * - `1.0` = Full consensus (all branches agree)
   * - `0.66` = 2 out of 3 branches agree
   * - `0.0` = No consensus
   */
  'mullion.merge.consensus_level'?: number;

  /**
   * Merge strategy used.
   *
   * Only present when `mullion.operation` is 'merge'.
   *
   * @example 'weightedVote', 'weightedAverage', 'fieldwise'
   */
  'mullion.merge.strategy'?: string;

  /**
   * Cache hit rate for this operation (0-1).
   *
   * Ratio of cached tokens to total input tokens.
   * Present when cache was used.
   *
   * @example
   * - `1.0` = All input tokens from cache
   * - `0.5` = Half input tokens from cache
   * - `0.0` = No cache hits
   */
  'mullion.cache.hit_rate'?: number;

  /**
   * Number of tokens saved through caching.
   *
   * Represents tokens that didn't need reprocessing.
   * Present when cache hits occurred.
   */
  'mullion.cache.saved_tokens'?: number;

  /**
   * Number of tokens written to cache in this operation.
   *
   * Present when new cache entries were created.
   */
  'mullion.cache.created_tokens'?: number;

  /**
   * Cost of this operation in USD.
   *
   * Calculated based on token usage and provider pricing.
   * Includes both input and output token costs.
   *
   * @example 0.0234 = $0.0234 (roughly 2.3 cents)
   */
  'mullion.cost.usd'?: number;

  /**
   * Cost savings from caching in USD.
   *
   * Amount saved by reusing cached tokens instead of reprocessing.
   * Present when cache hits occurred.
   *
   * @example 0.0120 = $0.012 saved from cache
   */
  'mullion.cost.saved_usd'?: number;

  /**
   * GenAI system (LLM provider).
   *
   * Following OpenTelemetry Semantic Conventions for GenAI.
   *
   * @example 'anthropic', 'openai', 'google'
   */
  'gen_ai.system': string;

  /**
   * Model identifier used for this operation.
   *
   * Following OpenTelemetry Semantic Conventions for GenAI.
   *
   * @example
   * - 'claude-3-5-sonnet-20241022'
   * - 'gpt-4-turbo-2024-04-09'
   * - 'gemini-1.5-pro'
   */
  'gen_ai.request.model': string;

  /**
   * Number of input tokens consumed.
   *
   * Following OpenTelemetry Semantic Conventions for GenAI.
   */
  'gen_ai.usage.input_tokens': number;

  /**
   * Number of output tokens generated.
   *
   * Following OpenTelemetry Semantic Conventions for GenAI.
   */
  'gen_ai.usage.output_tokens': number;

  /**
   * Finish reason from the LLM.
   *
   * Following OpenTelemetry Semantic Conventions for GenAI.
   *
   * @example 'stop', 'length', 'content_filter', 'tool_calls'
   */
  'gen_ai.response.finish_reasons'?: readonly string[];
}

/**
 * Span status following OpenTelemetry conventions.
 *
 * Indicates whether the span completed successfully or encountered an error.
 *
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#set-status}
 */
export type SpanStatus =
  /**
   * Operation completed successfully.
   */
  | 'ok'
  /**
   * Operation encountered an error.
   */
  | 'error'
  /**
   * Status not set (ongoing or unspecified).
   */
  | 'unset';

/**
 * Span kind following OpenTelemetry conventions.
 *
 * Indicates the role of this span in the trace (client, server, internal, etc.).
 *
 * @remarks
 * For Mullion operations:
 * - `infer` operations: typically 'client' (calling external LLM)
 * - `bridge`, `fork`, `merge`: typically 'internal' (library operations)
 *
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#spankind}
 */
export type SpanKind =
  | 'internal'
  | 'server'
  | 'client'
  | 'producer'
  | 'consumer';

/**
 * OpenTelemetry-compatible span representing a Mullion operation.
 *
 * Follows the OpenTelemetry trace data model while including Mullion-specific
 * attributes for scope safety, confidence tracking, and cost monitoring.
 *
 * @remarks
 * **Standard OTel fields:**
 * - traceId: Groups related operations
 * - spanId: Unique identifier for this operation
 * - parentSpanId: Links to parent operation (hierarchy)
 * - name: Human-readable operation name
 * - startTime/endTime: Duration tracking (UNIX microseconds)
 * - status: Success/error indication
 * - kind: Role in the trace (client/internal/etc)
 *
 * **Mullion-specific fields:**
 * - attributes: All Mullion metrics and metadata
 *
 * @example
 * ```typescript
 * const span: MullionSpan = {
 *   traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
 *   spanId: '00f067aa0ba902b7',
 *   parentSpanId: '0000000000000001',
 *   name: 'mullion.infer',
 *   startTime: 1704067200000000, // microseconds
 *   endTime: 1704067201500000,
 *   status: 'ok',
 *   kind: 'client',
 *   attributes: {
 *     'mullion.scope.id': 'admin',
 *     'mullion.scope.name': 'admin-review',
 *     'mullion.operation': 'infer',
 *     'mullion.confidence': 0.95,
 *     'gen_ai.system': 'anthropic',
 *     'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
 *     'gen_ai.usage.input_tokens': 1500,
 *     'gen_ai.usage.output_tokens': 300,
 *   },
 * };
 * ```
 *
 * @see {@link https://opentelemetry.io/docs/specs/otel/trace/api/#span}
 */
export interface MullionSpan {
  /**
   * Trace identifier (128-bit, hex string).
   *
   * Groups all spans in a single request/operation flow.
   * Spans with the same traceId are part of the same trace.
   *
   * Format: 32-character lowercase hex string
   * @example '4bf92f3577b34da6a3ce929d0e0e4736'
   */
  readonly traceId: string;

  /**
   * Span identifier (64-bit, hex string).
   *
   * Unique identifier for this specific span within the trace.
   *
   * Format: 16-character lowercase hex string
   * @example '00f067aa0ba902b7'
   */
  readonly spanId: string;

  /**
   * Parent span identifier (64-bit, hex string).
   *
   * Links this span to its parent, creating the trace hierarchy.
   * Undefined for root spans.
   *
   * Format: 16-character lowercase hex string
   * @example '0000000000000001'
   */
  readonly parentSpanId?: string;

  /**
   * Human-readable span name.
   *
   * Should follow the pattern: `mullion.{operation}`
   *
   * @example
   * - 'mullion.infer'
   * - 'mullion.bridge'
   * - 'mullion.fork'
   * - 'mullion.merge'
   */
  readonly name: string;

  /**
   * Span start time in UNIX epoch microseconds.
   *
   * Use `Date.now() * 1000` to convert milliseconds to microseconds.
   *
   * @example 1704067200000000
   */
  readonly startTime: number;

  /**
   * Span end time in UNIX epoch microseconds.
   *
   * Use `Date.now() * 1000` to convert milliseconds to microseconds.
   *
   * @example 1704067201500000
   */
  readonly endTime: number;

  /**
   * Span status indicating success or failure.
   *
   * - 'ok': Operation completed successfully
   * - 'error': Operation encountered an error
   * - 'unset': Status not set (ongoing or unspecified)
   */
  readonly status: SpanStatus;

  /**
   * Error message if status is 'error'.
   *
   * Contains the error description for failed operations.
   */
  readonly statusMessage?: string;

  /**
   * Span kind indicating the role of this span in the trace.
   *
   * - 'internal': Internal library operation (bridge, merge)
   * - 'client': Outgoing request to external service (LLM infer)
   * - 'server': Incoming request handler
   * - 'producer': Message producer
   * - 'consumer': Message consumer
   */
  readonly kind: SpanKind;

  /**
   * Mullion-specific attributes plus GenAI semantic conventions.
   *
   * Contains all metadata for the operation:
   * - Scope and provenance tracking
   * - Confidence levels
   * - Cache performance
   * - Cost metrics
   * - LLM provider and model info
   * - Token usage
   *
   * Partial because not all attributes apply to all operations.
   */
  readonly attributes: Partial<MullionAttributes>;
}

/**
 * Active span context used during span creation and propagation.
 *
 * Tracks the current span being recorded and provides methods to end it.
 * Used internally by the trace collector.
 *
 * @remarks
 * This is a lightweight context object that doesn't store the full span.
 * The actual span data is managed by the TraceCollector.
 *
 * @example
 * ```typescript
 * // Start a new span
 * const spanCtx = collector.startSpan('mullion.infer', {
 *   'mullion.scope.id': 'admin',
 *   'mullion.operation': 'infer',
 *   'gen_ai.system': 'anthropic',
 * });
 *
 * try {
 *   // Perform operation...
 *   await doInference();
 *
 *   // End span successfully
 *   collector.endSpan(spanCtx);
 * } catch (error) {
 *   // End span with error
 *   collector.endSpan(spanCtx, error);
 * }
 * ```
 */
export interface SpanContext {
  /**
   * Trace identifier for this span.
   */
  readonly traceId: string;

  /**
   * Unique identifier for this span.
   */
  readonly spanId: string;

  /**
   * Parent span identifier if this is a child span.
   */
  readonly parentSpanId?: string;

  /**
   * Start time of the span in microseconds.
   */
  readonly startTime: number;
}

/**
 * Options for starting a new span.
 *
 * Provides control over span naming, attributes, kind, and parent context.
 *
 * @example
 * ```typescript
 * const options: StartSpanOptions = {
 *   name: 'mullion.infer',
 *   kind: 'client',
 *   parentSpanId: parentCtx.spanId,
 *   attributes: {
 *     'mullion.scope.id': 'admin',
 *     'mullion.operation': 'infer',
 *     'gen_ai.system': 'anthropic',
 *   },
 * };
 * ```
 */
export interface StartSpanOptions {
  /**
   * Human-readable span name.
   *
   * Should follow the pattern: `mullion.{operation}`
   */
  readonly name: string;

  /**
   * Initial span attributes.
   *
   * Additional attributes can be added before ending the span.
   */
  readonly attributes?: Partial<MullionAttributes>;

  /**
   * Span kind indicating the role of this span.
   *
   * @default 'internal'
   */
  readonly kind?: SpanKind;

  /**
   * Parent span identifier to create a child span.
   *
   * If not provided, creates a root span with a new traceId.
   */
  readonly parentSpanId?: string;

  /**
   * Trace ID to use for this span.
   *
   * If not provided, generates a new traceId (for root spans)
   * or inherits from parent context.
   */
  readonly traceId?: string;
}

/**
 * Options for ending a span.
 *
 * Allows setting final status, adding attributes, and recording errors.
 *
 * @example
 * ```typescript
 * // Successful completion
 * collector.endSpan(spanCtx, {
 *   status: 'ok',
 *   attributes: {
 *     'mullion.confidence': 0.95,
 *     'gen_ai.usage.input_tokens': 1500,
 *   },
 * });
 *
 * // Error completion
 * collector.endSpan(spanCtx, {
 *   status: 'error',
 *   statusMessage: 'API rate limit exceeded',
 * });
 * ```
 */
export interface EndSpanOptions {
  /**
   * Final status of the span.
   *
   * @default 'ok'
   */
  readonly status?: SpanStatus;

  /**
   * Error message if status is 'error'.
   */
  readonly statusMessage?: string;

  /**
   * Additional attributes to add before ending.
   *
   * Merged with attributes provided at span start.
   */
  readonly attributes?: Partial<MullionAttributes>;
}

/**
 * Type guard to check if a value is a valid MullionSpan.
 *
 * Performs runtime validation of span structure and required fields.
 *
 * @param value - The value to check
 * @returns True if the value is a valid MullionSpan, false otherwise
 *
 * @example
 * ```typescript
 * function processSpan(data: unknown) {
 *   if (isMullionSpan(data)) {
 *     // TypeScript knows data is MullionSpan
 *     console.log(`Span ${data.spanId} in trace ${data.traceId}`);
 *     console.log(`Operation: ${data.attributes['mullion.operation']}`);
 *   }
 * }
 * ```
 */
export function isMullionSpan(value: unknown): value is MullionSpan {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const span = value as Record<string, unknown>;

  return (
    typeof span.traceId === 'string' &&
    typeof span.spanId === 'string' &&
    typeof span.name === 'string' &&
    typeof span.startTime === 'number' &&
    typeof span.endTime === 'number' &&
    (span.status === 'ok' ||
      span.status === 'error' ||
      span.status === 'unset') &&
    (span.kind === 'internal' ||
      span.kind === 'client' ||
      span.kind === 'server' ||
      span.kind === 'producer' ||
      span.kind === 'consumer') &&
    typeof span.attributes === 'object' &&
    span.attributes !== null
  );
}

/**
 * Type guard to check if a value is a valid SpanContext.
 *
 * @param value - The value to check
 * @returns True if the value is a valid SpanContext, false otherwise
 *
 * @example
 * ```typescript
 * function withSpan(ctx: unknown) {
 *   if (isSpanContext(ctx)) {
 *     console.log(`Active span: ${ctx.spanId}`);
 *   }
 * }
 * ```
 */
export function isSpanContext(value: unknown): value is SpanContext {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const ctx = value as Record<string, unknown>;

  return (
    typeof ctx.traceId === 'string' &&
    typeof ctx.spanId === 'string' &&
    typeof ctx.startTime === 'number'
  );
}
