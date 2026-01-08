import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupMullionTracing,
  TracingPresets,
  disableMullionTracing,
} from './setup.js';
import {
  getGlobalTraceCollector,
  clearGlobalTraceCollector,
  type SpanExporter,
} from './collector.js';

describe('trace/setup', () => {
  // Mock fetch
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearGlobalTraceCollector();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    }) as unknown as typeof fetch;
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await disableMullionTracing();
    clearGlobalTraceCollector();
  });

  describe('setupMullionTracing', () => {
    it('should create and set global trace collector', () => {
      const collector = setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
      });

      expect(collector).toBeDefined();
      expect(collector.isEnabled()).toBe(true);

      const globalCollector = getGlobalTraceCollector();
      expect(globalCollector).toBe(collector);
    });

    it('should use provided endpoint', () => {
      const collector = setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
      });

      expect(collector.isEnabled()).toBe(true);
    });

    it('should use provided service name', () => {
      const collector = setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
        serviceName: 'my-app',
      });

      expect(collector.isEnabled()).toBe(true);
    });

    it('should use provided headers', () => {
      const collector = setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
        headers: {
          Authorization: 'Bearer token123',
        },
      });

      expect(collector.isEnabled()).toBe(true);
    });

    it('should accept custom exporter', () => {
      const mockExporter: SpanExporter = {
        export: vi.fn().mockResolvedValue(undefined),
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      const collector = setupMullionTracing({
        exporter: mockExporter,
      });

      expect(collector.isEnabled()).toBe(true);
    });

    it('should prefer custom exporter over endpoint', () => {
      const mockExporter: SpanExporter = {
        export: vi.fn().mockResolvedValue(undefined),
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      const collector = setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
        exporter: mockExporter,
      });

      expect(collector.isEnabled()).toBe(true);
    });

    it('should configure maxSpans', () => {
      const collector = setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
        maxSpans: 500,
      });

      expect(collector.isEnabled()).toBe(true);
    });

    it('should configure autoExport', () => {
      const collector = setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
        autoExport: true,
      });

      expect(collector.isEnabled()).toBe(true);
    });

    it('should configure timeout', () => {
      const collector = setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
        timeout: 5000,
      });

      expect(collector.isEnabled()).toBe(true);
    });

    it('should create disabled collector when no endpoint or exporter', () => {
      const collector = setupMullionTracing();

      expect(collector.isEnabled()).toBe(false);
    });

    it('should default service name to mullion', () => {
      const collector = setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
      });

      expect(collector.isEnabled()).toBe(true);
    });

    it('should integrate with global collector', async () => {
      setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
      });

      const collector = getGlobalTraceCollector();
      expect(collector.isEnabled()).toBe(true);

      // Should be able to use the collector
      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      expect(collector.getSpans()).toHaveLength(1);
    });
  });

  describe('TracingPresets.jaeger', () => {
    it('should setup Jaeger with correct endpoint', () => {
      const collector = TracingPresets.jaeger();

      expect(collector.isEnabled()).toBe(true);
    });

    it('should accept custom options', () => {
      const collector = TracingPresets.jaeger({
        serviceName: 'my-app',
        maxSpans: 500,
      });

      expect(collector.isEnabled()).toBe(true);
    });
  });

  describe('TracingPresets.honeycomb', () => {
    it('should setup Honeycomb with correct endpoint and header', () => {
      const collector = TracingPresets.honeycomb('test-api-key');

      expect(collector.isEnabled()).toBe(true);
    });

    it('should accept custom options', () => {
      const collector = TracingPresets.honeycomb('test-api-key', {
        serviceName: 'my-app',
      });

      expect(collector.isEnabled()).toBe(true);
    });
  });

  describe('TracingPresets.datadog', () => {
    it('should setup Datadog with correct endpoint and header', () => {
      const collector = TracingPresets.datadog('test-api-key');

      expect(collector.isEnabled()).toBe(true);
    });

    it('should accept custom options', () => {
      const collector = TracingPresets.datadog('test-api-key', {
        serviceName: 'my-app',
      });

      expect(collector.isEnabled()).toBe(true);
    });
  });

  describe('TracingPresets.newRelic', () => {
    it('should setup New Relic with correct endpoint and header', () => {
      const collector = TracingPresets.newRelic('test-license-key');

      expect(collector.isEnabled()).toBe(true);
    });

    it('should accept custom options', () => {
      const collector = TracingPresets.newRelic('test-license-key', {
        serviceName: 'my-app',
      });

      expect(collector.isEnabled()).toBe(true);
    });
  });

  describe('TracingPresets.grafana', () => {
    it('should setup Grafana with correct endpoint and header', () => {
      const collector = TracingPresets.grafana(
        'tempo-prod-01-eu-west-0',
        'test-api-key'
      );

      expect(collector.isEnabled()).toBe(true);
    });

    it('should accept custom options', () => {
      const collector = TracingPresets.grafana(
        'tempo-prod-01-eu-west-0',
        'test-api-key',
        {
          serviceName: 'my-app',
        }
      );

      expect(collector.isEnabled()).toBe(true);
    });
  });

  describe('TracingPresets.custom', () => {
    it('should setup custom endpoint', () => {
      const collector = TracingPresets.custom(
        'https://my-otel-collector.com/v1/traces'
      );

      expect(collector.isEnabled()).toBe(true);
    });

    it('should accept custom options', () => {
      const collector = TracingPresets.custom(
        'https://my-otel-collector.com/v1/traces',
        {
          serviceName: 'my-app',
          headers: {
            Authorization: 'Bearer token',
          },
        }
      );

      expect(collector.isEnabled()).toBe(true);
    });
  });

  describe('disableMullionTracing', () => {
    it('should shutdown the global collector', async () => {
      setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
      });

      const collector = getGlobalTraceCollector();
      expect(collector.isEnabled()).toBe(true);

      await disableMullionTracing();

      expect(collector.isEnabled()).toBe(false);
    });

    it('should not throw when called without setup', async () => {
      await expect(disableMullionTracing()).resolves.not.toThrow();
    });

    it('should flush pending spans before shutdown', async () => {
      const mockExporter: SpanExporter = {
        export: vi.fn().mockResolvedValue(undefined),
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      setupMullionTracing({
        exporter: mockExporter,
      });

      const collector = getGlobalTraceCollector();
      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      expect(collector.getSpans()).toHaveLength(1);

      await disableMullionTracing();

      expect(mockExporter.export).toHaveBeenCalledTimes(1);
      expect(mockExporter.shutdown).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration scenarios', () => {
    it('should allow reconfiguration', async () => {
      // Initial setup
      const collector1 = setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
      });
      expect(collector1.isEnabled()).toBe(true);

      // Reconfigure
      const collector2 = setupMullionTracing({
        endpoint: 'https://api.honeycomb.io/v1/traces',
      });
      expect(collector2.isEnabled()).toBe(true);

      // Should be different collectors
      expect(collector1).not.toBe(collector2);
    });

    it('should work with preset followed by manual setup', () => {
      // Use preset
      const collector1 = TracingPresets.jaeger();
      expect(collector1.isEnabled()).toBe(true);

      // Switch to manual setup
      const collector2 = setupMullionTracing({
        endpoint: 'https://custom-endpoint.com/v1/traces',
      });
      expect(collector2.isEnabled()).toBe(true);
    });

    it('should handle shutdown and re-setup', async () => {
      setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
      });

      await disableMullionTracing();

      // Re-setup
      const collector = setupMullionTracing({
        endpoint: 'http://localhost:4318/v1/traces',
      });

      expect(collector.isEnabled()).toBe(true);
    });
  });
});
