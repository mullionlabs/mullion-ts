/**
 * Minimal in-memory trace collector for Mullion operations.
 *
 * This module provides a lightweight trace collection system that stores
 * spans in memory for later export to OpenTelemetry-compatible backends.
 *
 * @remarks
 * **Zero overhead by default:**
 * - Tracing is disabled until an exporter is attached
 * - No performance impact when tracing is not enabled
 * - Spans are stored in memory only when actively collecting
 *
 * **Design philosophy:**
 * - Minimal: Only essential functionality, no complex features
 * - In-memory: Fast collection, delegate persistence to exporters
 * - OTel-compatible: Exports standard OpenTelemetry spans
 *
 * @module trace/collector
 */

import type {
  MullionSpan,
  SpanContext,
  StartSpanOptions,
  EndSpanOptions,
  MullionAttributes,
} from './types.js';

/**
 * Exporter interface for sending collected spans to external systems.
 *
 * Exporters implement this interface to integrate with various
 * observability platforms (Datadog, Jaeger, Honeycomb, etc.).
 *
 * @example
 * ```typescript
 * class ConsoleExporter implements SpanExporter {
 *   export(spans: MullionSpan[]): Promise<void> {
 *     console.log('Exporting spans:', spans);
 *     return Promise.resolve();
 *   }
 *
 *   shutdown(): Promise<void> {
 *     console.log('Exporter shutdown');
 *     return Promise.resolve();
 *   }
 * }
 * ```
 */
export interface SpanExporter {
  /**
   * Export a batch of completed spans.
   *
   * Called when spans are ready to be sent to the backend.
   * Should handle batching, retries, and error handling internally.
   *
   * @param spans - Array of completed spans to export
   * @returns Promise that resolves when export completes
   */
  export(spans: readonly MullionSpan[]): Promise<void>;

  /**
   * Shutdown the exporter and flush any pending spans.
   *
   * Called when the application is shutting down or the exporter
   * is being replaced. Should ensure all buffered spans are sent.
   *
   * @returns Promise that resolves when shutdown completes
   */
  shutdown(): Promise<void>;
}

/**
 * Configuration options for the TraceCollector.
 */
export interface TraceCollectorOptions {
  /**
   * Exporter to send completed spans to.
   *
   * If not provided, tracing is effectively disabled (zero overhead).
   */
  readonly exporter?: SpanExporter;

  /**
   * Maximum number of spans to buffer before forcing export.
   *
   * Prevents unbounded memory growth. When limit is reached,
   * oldest spans are exported and cleared.
   *
   * @default 1000
   */
  readonly maxSpans?: number;

  /**
   * Whether to automatically export spans when they're completed.
   *
   * - `true`: Export each span immediately (good for debugging)
   * - `false`: Buffer spans until manually flushed or limit reached
   *
   * @default false
   */
  readonly autoExport?: boolean;
}

/**
 * Active span tracking for updating attributes before completion.
 *
 * Internally tracks spans that haven't been ended yet, allowing
 * attributes to be added during the span's lifetime.
 */
interface ActiveSpan {
  /**
   * Span context for identification.
   */
  readonly context: SpanContext;

  /**
   * Span name (operation identifier).
   */
  readonly name: string;

  /**
   * Span kind (client, internal, etc.).
   */
  readonly kind: MullionSpan['kind'];

  /**
   * Accumulated attributes for this span.
   */
  attributes: Partial<MullionAttributes>;
}

/**
 * Lightweight in-memory trace collector for Mullion operations.
 *
 * Collects spans during execution and exports them to configured backends.
 * Designed for zero overhead when tracing is disabled.
 *
 * @remarks
 * **Usage pattern:**
 * ```typescript
 * // Create collector with exporter
 * const collector = new TraceCollector({
 *   exporter: new OTelExporter(),
 *   maxSpans: 1000,
 * });
 *
 * // Start a span
 * const ctx = collector.startSpan({
 *   name: 'mullion.infer',
 *   kind: 'client',
 *   attributes: {
 *     'mullion.scope.id': 'admin',
 *     'mullion.operation': 'infer',
 *   },
 * });
 *
 * try {
 *   // Perform operation...
 *   await doInference();
 *
 *   // End span successfully
 *   await collector.endSpan(ctx, {
 *     status: 'ok',
 *     attributes: {
 *       'mullion.confidence': 0.95,
 *       'gen_ai.usage.input_tokens': 1500,
 *     },
 *   });
 * } catch (error) {
 *   // End span with error
 *   await collector.endSpan(ctx, {
 *     status: 'error',
 *     statusMessage: error.message,
 *   });
 * }
 *
 * // Flush remaining spans
 * await collector.flush();
 * ```
 *
 * @example
 * ```typescript
 * // Zero overhead when no exporter configured
 * const collector = new TraceCollector(); // No exporter
 * const ctx = collector.startSpan({ name: 'test' }); // No-op
 * await collector.endSpan(ctx); // No-op
 * ```
 */
export class TraceCollector {
  /**
   * Completed spans waiting to be exported.
   */
  private completedSpans: MullionSpan[] = [];

  /**
   * Active spans that haven't been ended yet.
   *
   * Maps spanId -> ActiveSpan for quick lookup.
   */
  private activeSpans = new Map<string, ActiveSpan>();

  /**
   * Configured exporter for sending spans to backends.
   */
  private exporter?: SpanExporter;

  /**
   * Maximum number of spans to buffer before forcing export.
   */
  private maxSpans: number;

  /**
   * Whether to automatically export spans when completed.
   */
  private autoExport: boolean;

  /**
   * Whether the collector has been shut down.
   */
  private isShutdown = false;

  /**
   * Creates a new trace collector.
   *
   * @param options - Configuration options
   */
  constructor(options: TraceCollectorOptions = {}) {
    this.exporter = options.exporter;
    this.maxSpans = options.maxSpans ?? 1000;
    this.autoExport = options.autoExport ?? false;
  }

  /**
   * Start a new span and return its context.
   *
   * Creates a span with the given name and attributes, generates unique IDs,
   * and begins tracking it until endSpan is called.
   *
   * @param options - Span configuration
   * @returns Span context for use with endSpan
   *
   * @example
   * ```typescript
   * const ctx = collector.startSpan({
   *   name: 'mullion.infer',
   *   kind: 'client',
   *   attributes: {
   *     'mullion.scope.id': 'admin',
   *     'mullion.operation': 'infer',
   *   },
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Create child span
   * const childCtx = collector.startSpan({
   *   name: 'mullion.bridge',
   *   kind: 'internal',
   *   parentSpanId: parentCtx.spanId,
   *   traceId: parentCtx.traceId,
   *   attributes: {
   *     'mullion.scope.id': 'customer',
   *     'mullion.operation': 'bridge',
   *   },
   * });
   * ```
   */
  startSpan(options: StartSpanOptions): SpanContext {
    // Zero overhead when no exporter configured
    if (!this.exporter || this.isShutdown) {
      return this.createNoOpContext(options);
    }

    const {
      name,
      attributes = {},
      kind = 'internal',
      parentSpanId,
      traceId,
    } = options;

    // Generate IDs
    const spanId = generateSpanId();
    const finalTraceId =
      (traceId ?? parentSpanId)
        ? this.getTraceIdFromParent(parentSpanId)
        : generateTraceId();
    const startTime = getTimestampMicros();

    // Create span context
    const context: SpanContext = {
      traceId: finalTraceId,
      spanId,
      parentSpanId,
      startTime,
    };

    // Track as active span
    this.activeSpans.set(spanId, {
      context,
      name,
      kind,
      attributes: { ...attributes },
    });

    return context;
  }

  /**
   * End a span and finalize its data.
   *
   * Marks the span as completed, adds final attributes, and optionally
   * exports it immediately if auto-export is enabled.
   *
   * @param context - Span context from startSpan
   * @param options - Final span configuration
   * @returns Promise that resolves when span is processed
   *
   * @example
   * ```typescript
   * // Successful completion
   * await collector.endSpan(ctx, {
   *   status: 'ok',
   *   attributes: {
   *     'mullion.confidence': 0.95,
   *     'gen_ai.usage.input_tokens': 1500,
   *   },
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Error completion
   * await collector.endSpan(ctx, {
   *   status: 'error',
   *   statusMessage: 'API rate limit exceeded',
   * });
   * ```
   */
  async endSpan(
    context: SpanContext,
    options: EndSpanOptions = {}
  ): Promise<void> {
    // Zero overhead when no exporter configured
    if (!this.exporter || this.isShutdown) {
      return;
    }

    const activeSpan = this.activeSpans.get(context.spanId);
    if (!activeSpan) {
      // Span not found - may have been a no-op span or already ended
      return;
    }

    const { status = 'ok', statusMessage, attributes = {} } = options;
    const endTime = getTimestampMicros();

    // Merge final attributes
    const finalAttributes = {
      ...activeSpan.attributes,
      ...attributes,
    };

    // Create completed span
    const completedSpan: MullionSpan = {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      name: activeSpan.name,
      startTime: context.startTime,
      endTime,
      status,
      statusMessage,
      kind: activeSpan.kind,
      attributes: finalAttributes,
    };

    // Remove from active spans
    this.activeSpans.delete(context.spanId);

    // Add to completed spans
    this.completedSpans.push(completedSpan);

    // Auto-export if enabled
    if (this.autoExport) {
      await this.flush();
    } else if (this.completedSpans.length > this.maxSpans) {
      // Force export when buffer exceeds limit
      await this.flush();
    }
  }

  /**
   * Get all completed spans.
   *
   * Returns a copy of the completed spans array. Does not clear the buffer.
   *
   * @returns Array of completed spans
   *
   * @example
   * ```typescript
   * const spans = collector.getSpans();
   * console.log(`Collected ${spans.length} spans`);
   * ```
   */
  getSpans(): readonly MullionSpan[] {
    return [...this.completedSpans];
  }

  /**
   * Get all active spans (not yet ended).
   *
   * Useful for debugging or understanding current execution state.
   *
   * @returns Array of active span contexts
   *
   * @example
   * ```typescript
   * const active = collector.getActiveSpans();
   * console.log(`${active.length} spans still in progress`);
   * ```
   */
  getActiveSpans(): readonly SpanContext[] {
    return Array.from(this.activeSpans.values()).map((span) => span.context);
  }

  /**
   * Export all completed spans and clear the buffer.
   *
   * Sends spans to the configured exporter and removes them from memory.
   * Called automatically when buffer is full or when auto-export is enabled.
   *
   * @returns Promise that resolves when export completes
   *
   * @example
   * ```typescript
   * // Manually flush spans
   * await collector.flush();
   * ```
   */
  async flush(): Promise<void> {
    if (!this.exporter || this.completedSpans.length === 0) {
      return;
    }

    const spansToExport = [...this.completedSpans];
    this.completedSpans = [];

    try {
      await this.exporter.export(spansToExport);
    } catch (error) {
      // Log error but don't throw - tracing shouldn't break the application
      console.error('Failed to export spans:', error);
      // Re-add spans to buffer for retry
      this.completedSpans.unshift(...spansToExport);
    }
  }

  /**
   * Clear all spans without exporting.
   *
   * Discards both completed and active spans. Useful for testing
   * or when resetting the collector state.
   *
   * @example
   * ```typescript
   * // Clear all collected data
   * collector.clear();
   * ```
   */
  clear(): void {
    this.completedSpans = [];
    this.activeSpans.clear();
  }

  /**
   * Shutdown the collector and export remaining spans.
   *
   * Flushes any buffered spans and shuts down the exporter.
   * After shutdown, no new spans will be collected (zero overhead).
   *
   * @returns Promise that resolves when shutdown completes
   *
   * @example
   * ```typescript
   * // Graceful shutdown
   * await collector.shutdown();
   * ```
   */
  async shutdown(): Promise<void> {
    if (this.isShutdown) {
      return;
    }

    this.isShutdown = true;

    // Flush remaining spans
    await this.flush();

    // Shutdown exporter
    if (this.exporter) {
      await this.exporter.shutdown();
    }

    // Clear all data
    this.clear();
  }

  /**
   * Check if the collector is enabled (has an exporter).
   *
   * @returns True if tracing is enabled, false otherwise
   *
   * @example
   * ```typescript
   * if (collector.isEnabled()) {
   *   // Perform additional trace-related work
   * }
   * ```
   */
  isEnabled(): boolean {
    return !this.isShutdown && this.exporter !== undefined;
  }

  /**
   * Set a new exporter, replacing the current one.
   *
   * Flushes pending spans with the old exporter before switching.
   *
   * @param exporter - New exporter to use
   * @returns Promise that resolves when switch completes
   *
   * @example
   * ```typescript
   * // Switch to a different exporter
   * await collector.setExporter(new DatadogExporter());
   * ```
   */
  async setExporter(exporter: SpanExporter | undefined): Promise<void> {
    // Flush with old exporter
    await this.flush();

    // Shutdown old exporter
    if (this.exporter) {
      await this.exporter.shutdown();
    }

    // Set new exporter
    this.exporter = exporter;
    this.isShutdown = false;
  }

  /**
   * Get the traceId from a parent span context.
   *
   * Looks up the active parent span to inherit its traceId.
   * If parent not found, generates a new traceId.
   *
   * @param parentSpanId - Parent span ID to look up
   * @returns Trace ID from parent or new trace ID
   * @internal
   */
  private getTraceIdFromParent(parentSpanId?: string): string {
    if (!parentSpanId) {
      return generateTraceId();
    }

    const parentSpan = this.activeSpans.get(parentSpanId);
    return parentSpan?.context.traceId ?? generateTraceId();
  }

  /**
   * Create a no-op span context when tracing is disabled.
   *
   * @param options - Span options (used for trace/parent IDs if provided)
   * @returns Minimal span context
   * @internal
   */
  private createNoOpContext(options: StartSpanOptions): SpanContext {
    return {
      traceId: options.traceId ?? generateTraceId(),
      spanId: generateSpanId(),
      parentSpanId: options.parentSpanId,
      startTime: getTimestampMicros(),
    };
  }
}

/**
 * Generate a unique trace ID (128-bit, hex string).
 *
 * Format: 32-character lowercase hex string
 *
 * @returns Trace ID
 * @internal
 *
 * @example
 * '4bf92f3577b34da6a3ce929d0e0e4736'
 */
function generateTraceId(): string {
  // Generate 16 random bytes (128 bits)
  const bytes: string[] = [];
  for (let i = 0; i < 16; i++) {
    bytes.push(
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, '0')
    );
  }
  return bytes.join('');
}

/**
 * Generate a unique span ID (64-bit, hex string).
 *
 * Format: 16-character lowercase hex string
 *
 * @returns Span ID
 * @internal
 *
 * @example
 * '00f067aa0ba902b7'
 */
function generateSpanId(): string {
  // Generate 8 random bytes (64 bits)
  const bytes: string[] = [];
  for (let i = 0; i < 8; i++) {
    bytes.push(
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, '0')
    );
  }
  return bytes.join('');
}

/**
 * Get current timestamp in microseconds (OTel format).
 *
 * @returns UNIX timestamp in microseconds
 * @internal
 *
 * @example
 * 1704067200000000
 */
function getTimestampMicros(): number {
  return Date.now() * 1000;
}

/**
 * Global singleton trace collector instance.
 *
 * Provides a default collector for use across the application.
 * Can be configured via setGlobalTraceCollector().
 */
let globalCollector: TraceCollector | undefined;

/**
 * Get the global trace collector instance.
 *
 * Creates a default (disabled) collector if none exists.
 *
 * @returns Global trace collector
 *
 * @example
 * ```typescript
 * const collector = getGlobalTraceCollector();
 * const ctx = collector.startSpan({ name: 'test' });
 * ```
 */
export function getGlobalTraceCollector(): TraceCollector {
  globalCollector ??= new TraceCollector();
  return globalCollector;
}

/**
 * Set the global trace collector instance.
 *
 * Replaces the current global collector with a new one.
 * Useful for configuring tracing at application startup.
 *
 * @param collector - New global collector
 *
 * @example
 * ```typescript
 * // Configure tracing at startup
 * const collector = new TraceCollector({
 *   exporter: new OTelExporter(),
 * });
 * setGlobalTraceCollector(collector);
 * ```
 */
export function setGlobalTraceCollector(collector: TraceCollector): void {
  globalCollector = collector;
}

/**
 * Clear the global trace collector.
 *
 * Resets the global collector to undefined. Next call to
 * getGlobalTraceCollector() will create a new default collector.
 *
 * @example
 * ```typescript
 * // Reset global collector (useful for testing)
 * clearGlobalTraceCollector();
 * ```
 */
export function clearGlobalTraceCollector(): void {
  globalCollector = undefined;
}
