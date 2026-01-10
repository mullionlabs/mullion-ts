/**
 * OTLP HTTP exporter for sending Mullion spans to OpenTelemetry backends.
 *
 * This module provides a zero-dependency exporter that sends spans directly
 * to any OTLP-compatible endpoint using standard HTTP/JSON protocol.
 *
 * @remarks
 * **Zero dependencies philosophy:**
 * - No @opentelemetry/* packages required
 * - Direct HTTP POST to OTLP endpoints
 * - Works with: Datadog, Jaeger, Honeycomb, Grafana Tempo, etc.
 *
 * **OTLP Protocol:**
 * - Uses OTLP/HTTP JSON encoding
 * - Standard endpoint: `/v1/traces`
 * - Content-Type: `application/json`
 *
 * @see {@link https://opentelemetry.io/docs/specs/otlp/}
 *
 * @module trace/exporters/otlp-http
 */

import type { SpanExporter } from '../collector.js';
import type { MullionSpan } from '../types.js';

/**
 * Configuration options for OTLP HTTP exporter.
 */
export interface OTLPHttpExporterOptions {
  /**
   * OTLP endpoint URL.
   *
   * Should point to the OTLP receiver endpoint.
   * Standard path is `/v1/traces`.
   *
   * @example
   * - 'http://localhost:4318/v1/traces' (Jaeger local)
   * - 'https://api.honeycomb.io/v1/traces' (Honeycomb)
   * - 'https://otlp.nr-data.net:4318/v1/traces' (New Relic)
   */
  readonly url: string;

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
   * Timeout for HTTP requests in milliseconds.
   *
   * @default 10000 (10 seconds)
   */
  readonly timeout?: number;

  /**
   * Service name to include in resource attributes.
   *
   * @default 'mullion'
   */
  readonly serviceName?: string;

  /**
   * Whether to log export errors to console.
   *
   * @default true
   */
  readonly logErrors?: boolean;
}

/**
 * OTLP resource span structure.
 *
 * Represents a single span in OTLP JSON format.
 *
 * @internal
 */
interface OTLPSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: number;
  readonly startTimeUnixNano: string;
  readonly endTimeUnixNano: string;
  readonly attributes: {
    key: string;
    value: {
      stringValue?: string;
      intValue?: number;
      doubleValue?: number;
      boolValue?: boolean;
    };
  }[];
  readonly status: {
    readonly code: number;
    readonly message?: string;
  };
}

/**
 * OTLP export request structure.
 *
 * @internal
 */
interface OTLPExportRequest {
  readonly resourceSpans: readonly {
    readonly resource: {
      readonly attributes: readonly {
        key: string;
        value: { stringValue: string };
      }[];
    };
    readonly scopeSpans: readonly {
      readonly scope: {
        readonly name: string;
        readonly version: string;
      };
      readonly spans: readonly OTLPSpan[];
    }[];
  }[];
}

/**
 * OTLP HTTP exporter for sending Mullion spans to OpenTelemetry backends.
 *
 * Implements the SpanExporter interface and sends spans using the OTLP/HTTP
 * JSON protocol. Works with any OTLP-compatible backend without requiring
 * OpenTelemetry SDK dependencies.
 *
 * @example
 * ```typescript
 * // Send to local Jaeger
 * const exporter = new OTLPHttpExporter({
 *   url: 'http://localhost:4318/v1/traces',
 * });
 *
 * const collector = new TraceCollector({ exporter });
 * ```
 *
 * @example
 * ```typescript
 * // Send to Honeycomb
 * const exporter = new OTLPHttpExporter({
 *   url: 'https://api.honeycomb.io/v1/traces',
 *   headers: {
 *     'x-honeycomb-team': 'your-api-key',
 *   },
 *   serviceName: 'my-app',
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Send to Datadog
 * const exporter = new OTLPHttpExporter({
 *   url: 'https://http-intake.logs.datadoghq.com/api/v2/logs',
 *   headers: {
 *     'DD-API-KEY': 'your-api-key',
 *   },
 * });
 * ```
 */
export class OTLPHttpExporter implements SpanExporter {
  private readonly url: string;
  private readonly headers: Record<string, string>;
  private readonly timeout: number;
  private readonly serviceName: string;
  private readonly logErrors: boolean;
  private isShutdown = false;

  /**
   * Creates a new OTLP HTTP exporter.
   *
   * @param options - Exporter configuration
   */
  constructor(options: OTLPHttpExporterOptions) {
    this.url = options.url;
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    this.timeout = options.timeout ?? 10000;
    this.serviceName = options.serviceName ?? 'mullion';
    this.logErrors = options.logErrors ?? true;
  }

  /**
   * Export spans to the OTLP endpoint.
   *
   * Converts Mullion spans to OTLP format and sends via HTTP POST.
   *
   * @param spans - Spans to export
   * @returns Promise that resolves when export completes
   */
  async export(spans: readonly MullionSpan[]): Promise<void> {
    if (this.isShutdown) {
      throw new Error('Exporter has been shut down');
    }

    if (spans.length === 0) {
      return;
    }

    try {
      const request = this.createOTLPRequest(spans);
      await this.sendRequest(request);
    } catch (error) {
      if (this.logErrors) {
        console.error('Failed to export spans to OTLP endpoint:', error);
      }
      throw error;
    }
  }

  /**
   * Shutdown the exporter.
   *
   * Marks the exporter as shutdown, preventing future exports.
   *
   * @returns Promise that resolves when shutdown completes
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async shutdown(): Promise<void> {
    this.isShutdown = true;
  }

  /**
   * Create an OTLP export request from Mullion spans.
   *
   * @param spans - Mullion spans to convert
   * @returns OTLP request payload
   * @internal
   */
  private createOTLPRequest(spans: readonly MullionSpan[]): OTLPExportRequest {
    const otlpSpans = spans.map((span) => this.toOTLPSpan(span));

    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              {
                key: 'service.name',
                value: { stringValue: this.serviceName },
              },
            ],
          },
          scopeSpans: [
            {
              scope: {
                name: '@mullion/core',
                version: '0.1.0',
              },
              spans: otlpSpans,
            },
          ],
        },
      ],
    };
  }

  /**
   * Convert a Mullion span to OTLP format.
   *
   * @param span - Mullion span to convert
   * @returns OTLP span
   * @internal
   */
  private toOTLPSpan(span: MullionSpan): OTLPSpan {
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      kind: this.mapSpanKind(span.kind),
      startTimeUnixNano: this.toNanoTimestamp(span.startTime),
      endTimeUnixNano: this.toNanoTimestamp(span.endTime),
      attributes: this.mapAttributes(span.attributes),
      status: {
        code: this.mapStatus(span.status),
        message: span.statusMessage,
      },
    };
  }

  /**
   * Map Mullion span kind to OTLP span kind number.
   *
   * @param kind - Mullion span kind
   * @returns OTLP span kind number
   * @internal
   */
  private mapSpanKind(kind: MullionSpan['kind']): number {
    const mapping = {
      internal: 1,
      server: 2,
      client: 3,
      producer: 4,
      consumer: 5,
    };
    return mapping[kind];
  }

  /**
   * Map Mullion span status to OTLP status code.
   *
   * @param status - Mullion span status
   * @returns OTLP status code
   * @internal
   */
  private mapStatus(status: MullionSpan['status']): number {
    const mapping = {
      unset: 0,
      ok: 1,
      error: 2,
    };
    return mapping[status];
  }

  /**
   * Convert microsecond timestamp to nanosecond string.
   *
   * OTLP uses nanosecond precision timestamps as strings.
   *
   * @param micros - Timestamp in microseconds
   * @returns Timestamp in nanoseconds as string
   * @internal
   */
  private toNanoTimestamp(micros: number): string {
    return String(micros * 1000);
  }

  /**
   * Map Mullion attributes to OTLP attribute format.
   *
   * @param attributes - Mullion span attributes
   * @returns OTLP attributes array
   * @internal
   */
  private mapAttributes(attributes: MullionSpan['attributes']): {
    key: string;
    value: {
      stringValue?: string;
      intValue?: number;
      doubleValue?: number;
      boolValue?: boolean;
    };
  }[] {
    return Object.entries(attributes)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return { key, value: { stringValue: value } };
        } else if (typeof value === 'number') {
          return Number.isInteger(value)
            ? { key, value: { intValue: value } }
            : { key, value: { doubleValue: value } };
        } else if (typeof value === 'boolean') {
          return { key, value: { boolValue: value } };
        } else if (Array.isArray(value)) {
          // OTLP supports array values, but for simplicity, convert to JSON string
          return { key, value: { stringValue: JSON.stringify(value) } };
        } else {
          return { key, value: { stringValue: String(value) } };
        }
      });
  }

  /**
   * Send OTLP request to the backend.
   *
   * @param request - OTLP export request
   * @returns Promise that resolves when request completes
   * @internal
   */
  private async sendRequest(request: OTLPExportRequest): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `OTLP export failed: ${response.status} ${response.statusText}`
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Create an OTLP HTTP exporter with common presets.
 *
 * Provides convenient factory functions for popular observability backends.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OTLPExporters = {
  /**
   * Create exporter for local Jaeger instance.
   *
   * @param options - Optional configuration overrides
   * @returns OTLP HTTP exporter configured for Jaeger
   *
   * @example
   * ```typescript
   * const exporter = OTLPExporters.jaeger();
   * const collector = new TraceCollector({ exporter });
   * ```
   */
  jaeger: (options?: Partial<OTLPHttpExporterOptions>): OTLPHttpExporter => {
    return new OTLPHttpExporter({
      url: 'http://localhost:4318/v1/traces',
      ...options,
    });
  },

  /**
   * Create exporter for Honeycomb.
   *
   * @param apiKey - Honeycomb API key
   * @param options - Optional configuration overrides
   * @returns OTLP HTTP exporter configured for Honeycomb
   *
   * @example
   * ```typescript
   * const exporter = OTLPExporters.honeycomb('your-api-key');
   * ```
   */
  honeycomb: (
    apiKey: string,
    options?: Partial<OTLPHttpExporterOptions>
  ): OTLPHttpExporter => {
    return new OTLPHttpExporter({
      url: 'https://api.honeycomb.io/v1/traces',
      headers: {
        'x-honeycomb-team': apiKey,
      },
      ...options,
    });
  },

  /**
   * Create exporter for custom OTLP endpoint.
   *
   * @param url - OTLP endpoint URL
   * @param options - Optional configuration overrides
   * @returns OTLP HTTP exporter
   *
   * @example
   * ```typescript
   * const exporter = OTLPExporters.custom('https://my-otel-collector.com/v1/traces');
   * ```
   */
  custom: (
    url: string,
    options?: Partial<OTLPHttpExporterOptions>
  ): OTLPHttpExporter => {
    return new OTLPHttpExporter({
      url,
      ...options,
    });
  },
};
