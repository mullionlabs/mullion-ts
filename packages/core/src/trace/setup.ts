/**
 * One-liner setup helpers for Mullion tracing.
 *
 * This module provides convenient functions to quickly configure tracing
 * for common observability backends without manually wiring up collectors
 * and exporters.
 *
 * @remarks
 * **Design philosophy:**
 * - One-liner setup for common use cases
 * - Sensible defaults with opt-in customization
 * - Automatic global collector configuration
 * - Works with any OTLP-compatible backend
 *
 * @example
 * ```typescript
 * // Quick setup for local Jaeger
 * setupMullionTracing({
 *   endpoint: 'http://localhost:4318/v1/traces',
 * });
 *
 * // Now tracing is enabled globally
 * const ctx = getGlobalTraceCollector().startSpan({ name: 'test' });
 * ```
 *
 * @module trace/setup
 */

import {
  TraceCollector,
  setGlobalTraceCollector,
  type SpanExporter,
} from './collector.js';
import {OTLPHttpExporter} from './exporters/otlp-http.js';

/**
 * Configuration options for setupMullionTracing.
 */
export interface SetupTracingOptions {
  /**
   * OTLP endpoint URL.
   *
   * If provided, creates an OTLPHttpExporter automatically.
   * Standard path is `/v1/traces`.
   *
   * @example
   * - 'http://localhost:4318/v1/traces' (Jaeger local)
   * - 'https://api.honeycomb.io/v1/traces' (Honeycomb)
   * - 'https://otlp.nr-data.net:4318/v1/traces' (New Relic)
   */
  readonly endpoint?: string;

  /**
   * Service name to include in traces.
   *
   * Appears as `service.name` in resource attributes.
   *
   * @default 'mullion'
   */
  readonly serviceName?: string;

  /**
   * Additional HTTP headers for authentication.
   *
   * Common headers:
   * - `Authorization`: Bearer token
   * - `x-honeycomb-team`: Honeycomb API key
   * - `api-key`: New Relic license key
   *
   * @example
   * ```typescript
   * {
   *   'Authorization': 'Bearer your-token',
   *   'x-honeycomb-team': 'your-api-key',
   * }
   * ```
   */
  readonly headers?: Record<string, string>;

  /**
   * Custom exporter instead of OTLP HTTP.
   *
   * Use this for non-OTLP backends or custom export logic.
   * If provided, `endpoint` and `headers` are ignored.
   *
   * @example
   * ```typescript
   * setupMullionTracing({
   *   exporter: new CustomExporter(),
   * });
   * ```
   */
  readonly exporter?: SpanExporter;

  /**
   * Maximum number of spans to buffer before forcing export.
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

  /**
   * Timeout for HTTP requests in milliseconds.
   *
   * Only used when creating OTLP exporter (when `endpoint` is provided).
   *
   * @default 10000 (10 seconds)
   */
  readonly timeout?: number;
}

/**
 * Setup Mullion tracing with a single function call.
 *
 * Configures a global trace collector with the specified exporter and options.
 * All Mullion operations will automatically collect traces after this is called.
 *
 * @param options - Tracing configuration
 * @returns The configured TraceCollector instance
 *
 * @example
 * ```typescript
 * // Local Jaeger
 * setupMullionTracing({
 *   endpoint: 'http://localhost:4318/v1/traces',
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Honeycomb
 * setupMullionTracing({
 *   endpoint: 'https://api.honeycomb.io/v1/traces',
 *   headers: {
 *     'x-honeycomb-team': process.env.HONEYCOMB_API_KEY,
 *   },
 *   serviceName: 'my-app',
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Datadog
 * setupMullionTracing({
 *   endpoint: 'https://http-intake.logs.datadoghq.com/api/v2/logs',
 *   headers: {
 *     'DD-API-KEY': process.env.DATADOG_API_KEY,
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // New Relic
 * setupMullionTracing({
 *   endpoint: 'https://otlp.nr-data.net:4318/v1/traces',
 *   headers: {
 *     'api-key': process.env.NEW_RELIC_LICENSE_KEY,
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Custom exporter
 * setupMullionTracing({
 *   exporter: new MyCustomExporter(),
 *   maxSpans: 500,
 *   autoExport: true,
 * });
 * ```
 */
export function setupMullionTracing(
  options: SetupTracingOptions = {},
): TraceCollector {
  const {
    endpoint,
    serviceName = 'mullion',
    headers,
    exporter: customExporter,
    maxSpans = 1000,
    autoExport = false,
    timeout = 10000,
  } = options;

  // Create or use provided exporter
  let exporter: SpanExporter | undefined;

  if (customExporter) {
    exporter = customExporter;
  } else if (endpoint) {
    exporter = new OTLPHttpExporter({
      url: endpoint,
      serviceName,
      headers,
      timeout,
    });
  }

  // Create collector with exporter
  const collector = new TraceCollector({
    exporter,
    maxSpans,
    autoExport,
  });

  // Set as global collector
  setGlobalTraceCollector(collector);

  return collector;
}

/**
 * Backend-specific setup presets for common observability platforms.
 *
 * Provides one-liner setup for popular backends with correct endpoints
 * and authentication patterns.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const TracingPresets = {
  /**
   * Setup tracing for local Jaeger instance.
   *
   * Connects to Jaeger running on localhost:4318.
   * Start Jaeger with: `docker run -d -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one:latest`
   * View traces at: http://localhost:16686
   *
   * @param options - Optional configuration overrides
   * @returns Configured TraceCollector
   *
   * @example
   * ```typescript
   * TracingPresets.jaeger();
   * ```
   */
  jaeger: (options?: Partial<SetupTracingOptions>): TraceCollector => {
    return setupMullionTracing({
      endpoint: 'http://localhost:4318/v1/traces',
      serviceName: 'mullion',
      ...options,
    });
  },

  /**
   * Setup tracing for Honeycomb.
   *
   * Requires Honeycomb API key from: https://ui.honeycomb.io/account
   *
   * @param apiKey - Honeycomb team API key
   * @param options - Optional configuration overrides
   * @returns Configured TraceCollector
   *
   * @example
   * ```typescript
   * TracingPresets.honeycomb(process.env.HONEYCOMB_API_KEY!);
   * ```
   */
  honeycomb: (
    apiKey: string,
    options?: Partial<SetupTracingOptions>,
  ): TraceCollector => {
    return setupMullionTracing({
      endpoint: 'https://api.honeycomb.io/v1/traces',
      headers: {
        'x-honeycomb-team': apiKey,
      },
      serviceName: 'mullion',
      ...options,
    });
  },

  /**
   * Setup tracing for Datadog.
   *
   * Requires Datadog API key from: https://app.datadoghq.com/organization-settings/api-keys
   *
   * @param apiKey - Datadog API key
   * @param options - Optional configuration overrides
   * @returns Configured TraceCollector
   *
   * @example
   * ```typescript
   * TracingPresets.datadog(process.env.DATADOG_API_KEY!);
   * ```
   */
  datadog: (
    apiKey: string,
    options?: Partial<SetupTracingOptions>,
  ): TraceCollector => {
    return setupMullionTracing({
      endpoint: 'https://http-intake.logs.datadoghq.com/api/v2/logs',
      headers: {
        'DD-API-KEY': apiKey,
      },
      serviceName: 'mullion',
      ...options,
    });
  },

  /**
   * Setup tracing for New Relic.
   *
   * Requires New Relic license key from: https://one.newrelic.com/admin-portal/api-keys/home
   *
   * @param licenseKey - New Relic license key
   * @param options - Optional configuration overrides
   * @returns Configured TraceCollector
   *
   * @example
   * ```typescript
   * TracingPresets.newRelic(process.env.NEW_RELIC_LICENSE_KEY!);
   * ```
   */
  newRelic: (
    licenseKey: string,
    options?: Partial<SetupTracingOptions>,
  ): TraceCollector => {
    return setupMullionTracing({
      endpoint: 'https://otlp.nr-data.net:4318/v1/traces',
      headers: {
        'api-key': licenseKey,
      },
      serviceName: 'mullion',
      ...options,
    });
  },

  /**
   * Setup tracing for Grafana Cloud (Tempo).
   *
   * Requires Grafana Cloud API key from: https://grafana.com/docs/grafana-cloud/account-management/authentication-and-permissions/create-api-key/
   *
   * @param instanceId - Grafana Cloud instance ID (e.g., 'tempo-prod-01-eu-west-0')
   * @param apiKey - Grafana Cloud API key
   * @param options - Optional configuration overrides
   * @returns Configured TraceCollector
   *
   * @example
   * ```typescript
   * TracingPresets.grafana(
   *   'tempo-prod-01-eu-west-0',
   *   process.env.GRAFANA_API_KEY!
   * );
   * ```
   */
  grafana: (
    instanceId: string,
    apiKey: string,
    options?: Partial<SetupTracingOptions>,
  ): TraceCollector => {
    return setupMullionTracing({
      endpoint: `https://${instanceId}.grafana.net/otlp/v1/traces`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      serviceName: 'mullion',
      ...options,
    });
  },

  /**
   * Setup tracing for custom OTLP endpoint.
   *
   * Use this for any OTLP-compatible backend not covered by other presets.
   *
   * @param endpoint - OTLP endpoint URL
   * @param options - Optional configuration overrides
   * @returns Configured TraceCollector
   *
   * @example
   * ```typescript
   * TracingPresets.custom('https://my-otel-collector.com/v1/traces');
   * ```
   */
  custom: (
    endpoint: string,
    options?: Partial<SetupTracingOptions>,
  ): TraceCollector => {
    return setupMullionTracing({
      endpoint,
      serviceName: 'mullion',
      ...options,
    });
  },
};

/**
 * Disable Mullion tracing.
 *
 * Shuts down the global trace collector and stops collecting traces.
 * Flushes any pending spans before shutting down.
 *
 * @returns Promise that resolves when shutdown completes
 *
 * @example
 * ```typescript
 * // At application shutdown
 * await disableMullionTracing();
 * ```
 */
export async function disableMullionTracing(): Promise<void> {
  const {getGlobalTraceCollector} = await import('./collector.js');
  const collector = getGlobalTraceCollector();

  if (collector.isEnabled()) {
    await collector.shutdown();
  }
}
