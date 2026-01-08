/**
 * Trace exporters for sending Mullion spans to observability backends.
 *
 * @module trace/exporters
 */

// OTLP HTTP exporter (zero dependencies)
export type { OTLPHttpExporterOptions } from './otlp-http.js';
export { OTLPHttpExporter, OTLPExporters } from './otlp-http.js';
