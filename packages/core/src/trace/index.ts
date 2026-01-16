/**
 * Trace module for OpenTelemetry-compatible observability.
 *
 * Provides types and utilities for exporting Mullion-specific trace data
 * to existing observability platforms (Datadog, Jaeger, Honeycomb, etc.).
 *
 * @module trace
 */

// Core trace types
export type {
  MullionOperation,
  MullionAttributes,
  SpanStatus,
  SpanKind,
  MullionSpan,
  SpanContext,
  StartSpanOptions,
  EndSpanOptions,
} from './types.js';

export {isMullionSpan, isSpanContext} from './types.js';

// Trace collector for in-memory span management
export type {SpanExporter, TraceCollectorOptions} from './collector.js';
export {
  TraceCollector,
  getGlobalTraceCollector,
  setGlobalTraceCollector,
  clearGlobalTraceCollector,
} from './collector.js';

// Trace exporters for observability backends
export type {OTLPHttpExporterOptions} from './exporters/index.js';
export {OTLPHttpExporter, OTLPExporters} from './exporters/index.js';

// One-liner setup helpers for quick configuration
export type {SetupTracingOptions} from './setup.js';
export {
  setupMullionTracing,
  TracingPresets,
  disableMullionTracing,
} from './setup.js';
