import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TraceCollector,
  getGlobalTraceCollector,
  setGlobalTraceCollector,
  clearGlobalTraceCollector,
  type SpanExporter,
} from './collector.js';
import type { MullionSpan } from './types.js';

describe('trace/collector', () => {
  describe('TraceCollector - Zero Overhead (No Exporter)', () => {
    let collector: TraceCollector;

    beforeEach(() => {
      collector = new TraceCollector();
    });

    it('should be disabled when no exporter configured', () => {
      expect(collector.isEnabled()).toBe(false);
    });

    it('should create no-op span context without exporter', () => {
      const ctx = collector.startSpan({
        name: 'mullion.infer',
        attributes: {
          'mullion.scope.id': 'admin',
          'mullion.scope.name': 'admin-review',
          'mullion.operation': 'infer',
          'gen_ai.system': 'anthropic',
          'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
          'gen_ai.usage.input_tokens': 1500,
          'gen_ai.usage.output_tokens': 300,
        },
      });

      expect(ctx.traceId).toBeDefined();
      expect(ctx.spanId).toBeDefined();
      expect(ctx.startTime).toBeGreaterThan(0);
    });

    it('should not collect spans without exporter', async () => {
      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      expect(collector.getSpans()).toHaveLength(0);
    });

    it('should not track active spans without exporter', () => {
      collector.startSpan({ name: 'test' });
      expect(collector.getActiveSpans()).toHaveLength(0);
    });
  });

  describe('TraceCollector - With Exporter', () => {
    let collector: TraceCollector;
    let mockExporter: SpanExporter;
    let exportedSpans: MullionSpan[];

    beforeEach(() => {
      exportedSpans = [];
      mockExporter = {
        export: vi.fn(async (spans) => {
          exportedSpans.push(...spans);
        }),
        shutdown: vi.fn(),
      };

      collector = new TraceCollector({ exporter: mockExporter });
    });

    it('should be enabled when exporter configured', () => {
      expect(collector.isEnabled()).toBe(true);
    });

    it('should start and end a span successfully', async () => {
      const ctx = collector.startSpan({
        name: 'mullion.infer',
        kind: 'client',
        attributes: {
          'mullion.scope.id': 'admin',
          'mullion.scope.name': 'admin-review',
          'mullion.operation': 'infer',
          'gen_ai.system': 'anthropic',
          'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
          'gen_ai.usage.input_tokens': 1500,
          'gen_ai.usage.output_tokens': 300,
        },
      });

      expect(ctx.traceId).toBeDefined();
      expect(ctx.spanId).toBeDefined();
      expect(ctx.startTime).toBeGreaterThan(0);

      await collector.endSpan(ctx, {
        status: 'ok',
        attributes: {
          'mullion.confidence': 0.95,
        },
      });

      const spans = collector.getSpans();
      expect(spans).toHaveLength(1);

      const span = spans[0];
      expect(span.traceId).toBe(ctx.traceId);
      expect(span.spanId).toBe(ctx.spanId);
      expect(span.name).toBe('mullion.infer');
      expect(span.kind).toBe('client');
      expect(span.status).toBe('ok');
      expect(span.startTime).toBe(ctx.startTime);
      expect(span.endTime).toBeGreaterThanOrEqual(span.startTime);
      expect(span.attributes['mullion.scope.id']).toBe('admin');
      expect(span.attributes['mullion.confidence']).toBe(0.95);
    });

    it('should track active spans', async () => {
      const ctx1 = collector.startSpan({ name: 'span1' });
      const ctx2 = collector.startSpan({ name: 'span2' });

      const activeSpans = collector.getActiveSpans();
      expect(activeSpans).toHaveLength(2);

      await collector.endSpan(ctx1);

      const activeAfterEnd = collector.getActiveSpans();
      expect(activeAfterEnd).toHaveLength(1);
      expect(activeAfterEnd[0]?.spanId).toBe(ctx2.spanId);

      await collector.endSpan(ctx2);

      expect(collector.getActiveSpans()).toHaveLength(0);
    });

    it('should handle error status with message', async () => {
      const ctx = collector.startSpan({
        name: 'mullion.infer',
        kind: 'client',
      });

      await collector.endSpan(ctx, {
        status: 'error',
        statusMessage: 'API rate limit exceeded',
      });

      const spans = collector.getSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0]?.status).toBe('error');
      expect(spans[0]?.statusMessage).toBe('API rate limit exceeded');
    });

    it('should merge attributes from start and end', async () => {
      const ctx = collector.startSpan({
        name: 'mullion.infer',
        attributes: {
          'mullion.scope.id': 'admin',
          'mullion.operation': 'infer',
          'gen_ai.system': 'anthropic',
          'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
          'gen_ai.usage.input_tokens': 1500,
          'gen_ai.usage.output_tokens': 300,
        },
      });

      await collector.endSpan(ctx, {
        attributes: {
          'mullion.confidence': 0.95,
          'mullion.cost.usd': 0.0234,
        },
      });

      const span = collector.getSpans()[0];
      expect(span?.attributes['mullion.scope.id']).toBe('admin');
      expect(span?.attributes['mullion.confidence']).toBe(0.95);
      expect(span?.attributes['mullion.cost.usd']).toBe(0.0234);
    });

    it('should create child spans with parent context', async () => {
      const parentCtx = collector.startSpan({
        name: 'mullion.fork',
        kind: 'internal',
      });

      const childCtx = collector.startSpan({
        name: 'mullion.infer',
        kind: 'client',
        parentSpanId: parentCtx.spanId,
        traceId: parentCtx.traceId,
      });

      expect(childCtx.traceId).toBe(parentCtx.traceId);
      expect(childCtx.parentSpanId).toBe(parentCtx.spanId);

      await collector.endSpan(childCtx);
      await collector.endSpan(parentCtx);

      const spans = collector.getSpans();
      expect(spans).toHaveLength(2);

      const childSpan = spans[0];
      const parentSpan = spans[1];

      expect(childSpan?.parentSpanId).toBe(parentSpan?.spanId);
      expect(childSpan?.traceId).toBe(parentSpan?.traceId);
    });

    it('should generate unique trace IDs for root spans', async () => {
      const ctx1 = collector.startSpan({ name: 'span1' });
      const ctx2 = collector.startSpan({ name: 'span2' });

      expect(ctx1.traceId).not.toBe(ctx2.traceId);

      await collector.endSpan(ctx1);
      await collector.endSpan(ctx2);
    });

    it('should generate unique span IDs', async () => {
      const ctx1 = collector.startSpan({ name: 'span1' });
      const ctx2 = collector.startSpan({ name: 'span2' });

      expect(ctx1.spanId).not.toBe(ctx2.spanId);

      await collector.endSpan(ctx1);
      await collector.endSpan(ctx2);
    });

    it('should default span kind to internal', async () => {
      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      const span = collector.getSpans()[0];
      expect(span?.kind).toBe('internal');
    });

    it('should default span status to ok', async () => {
      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      const span = collector.getSpans()[0];
      expect(span?.status).toBe('ok');
    });

    it('should handle different span kinds', async () => {
      const kinds: MullionSpan['kind'][] = [
        'internal',
        'client',
        'server',
        'producer',
        'consumer',
      ];

      for (const kind of kinds) {
        const ctx = collector.startSpan({ name: `test-${kind}`, kind });
        await collector.endSpan(ctx);
      }

      const spans = collector.getSpans();
      expect(spans).toHaveLength(5);

      kinds.forEach((kind, index) => {
        expect(spans[index]?.kind).toBe(kind);
      });
    });

    it('should clear all spans', async () => {
      const ctx1 = collector.startSpan({ name: 'span1' });
      const _ctx2 = collector.startSpan({ name: 'span2' });

      await collector.endSpan(ctx1);

      expect(collector.getSpans()).toHaveLength(1);
      expect(collector.getActiveSpans()).toHaveLength(1);

      collector.clear();

      expect(collector.getSpans()).toHaveLength(0);
      expect(collector.getActiveSpans()).toHaveLength(0);
    });

    it('should not fail when ending a non-existent span', async () => {
      const fakeCtx = {
        traceId: 'fake-trace',
        spanId: 'fake-span',
        startTime: Date.now() * 1000,
      };

      await expect(collector.endSpan(fakeCtx)).resolves.not.toThrow();
    });
  });

  describe('TraceCollector - Auto Export', () => {
    let collector: TraceCollector;
    let mockExporter: SpanExporter;
    let exportedSpans: MullionSpan[];

    beforeEach(() => {
      exportedSpans = [];
      mockExporter = {
        export: vi.fn(async (spans) => {
          exportedSpans.push(...spans);
        }),
        shutdown: vi.fn(),
      };

      collector = new TraceCollector({
        exporter: mockExporter,
        autoExport: true,
      });
    });

    it('should auto-export spans when enabled', async () => {
      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      expect(mockExporter.export).toHaveBeenCalledTimes(1);
      expect(exportedSpans).toHaveLength(1);
      expect(collector.getSpans()).toHaveLength(0); // Cleared after export
    });

    it('should export multiple spans individually with auto-export', async () => {
      const ctx1 = collector.startSpan({ name: 'span1' });
      await collector.endSpan(ctx1);

      const ctx2 = collector.startSpan({ name: 'span2' });
      await collector.endSpan(ctx2);

      expect(mockExporter.export).toHaveBeenCalledTimes(2);
      expect(exportedSpans).toHaveLength(2);
    });
  });

  describe('TraceCollector - Manual Flush', () => {
    let collector: TraceCollector;
    let mockExporter: SpanExporter;
    let exportedSpans: MullionSpan[];

    beforeEach(() => {
      exportedSpans = [];
      mockExporter = {
        export: vi.fn(async (spans) => {
          exportedSpans.push(...spans);
        }),
        shutdown: vi.fn(),
      };

      collector = new TraceCollector({
        exporter: mockExporter,
        autoExport: false,
      });
    });

    it('should buffer spans when auto-export disabled', async () => {
      const ctx1 = collector.startSpan({ name: 'span1' });
      await collector.endSpan(ctx1);

      const ctx2 = collector.startSpan({ name: 'span2' });
      await collector.endSpan(ctx2);

      expect(mockExporter.export).not.toHaveBeenCalled();
      expect(collector.getSpans()).toHaveLength(2);
    });

    it('should flush spans manually', async () => {
      const ctx1 = collector.startSpan({ name: 'span1' });
      await collector.endSpan(ctx1);

      const ctx2 = collector.startSpan({ name: 'span2' });
      await collector.endSpan(ctx2);

      await collector.flush();

      expect(mockExporter.export).toHaveBeenCalledTimes(1);
      expect(exportedSpans).toHaveLength(2);
      expect(collector.getSpans()).toHaveLength(0); // Cleared after export
    });

    it('should not fail when flushing with no spans', async () => {
      await expect(collector.flush()).resolves.not.toThrow();
      expect(mockExporter.export).not.toHaveBeenCalled();
    });
  });

  describe('TraceCollector - Max Spans Limit', () => {
    let collector: TraceCollector;
    let mockExporter: SpanExporter;
    let exportedSpans: MullionSpan[];

    beforeEach(() => {
      exportedSpans = [];
      mockExporter = {
        export: vi.fn(async (spans) => {
          exportedSpans.push(...spans);
        }),
        shutdown: vi.fn(),
      };

      collector = new TraceCollector({
        exporter: mockExporter,
        maxSpans: 5,
        autoExport: false,
      });
    });

    it('should auto-flush when buffer reaches max spans', async () => {
      // Create 5 spans (at limit)
      for (let i = 0; i < 5; i++) {
        const ctx = collector.startSpan({ name: `span${i}` });
        await collector.endSpan(ctx);
      }

      expect(mockExporter.export).not.toHaveBeenCalled();
      expect(collector.getSpans()).toHaveLength(5);

      // Create one more span (exceeds limit, triggers flush of all 6)
      const ctx = collector.startSpan({ name: 'span5' });
      await collector.endSpan(ctx);

      expect(mockExporter.export).toHaveBeenCalledTimes(1);
      expect(exportedSpans).toHaveLength(6); // All spans including the 6th
      expect(collector.getSpans()).toHaveLength(0); // Buffer cleared after flush
    });
  });

  describe('TraceCollector - Exporter Errors', () => {
    let collector: TraceCollector;
    let mockExporter: SpanExporter;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());

      mockExporter = {
        export: vi.fn(async () => {
          throw new Error('Export failed');
        }),
        shutdown: vi.fn(),
      };

      collector = new TraceCollector({
        exporter: mockExporter,
        autoExport: false,
      });
    });

    it('should handle exporter errors gracefully', async () => {
      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      await expect(collector.flush()).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should re-add spans to buffer on export failure', async () => {
      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      expect(collector.getSpans()).toHaveLength(1);

      await collector.flush();

      // Spans should still be in buffer after failed export
      expect(collector.getSpans()).toHaveLength(1);
    });
  });

  describe('TraceCollector - Shutdown', () => {
    let collector: TraceCollector;
    let mockExporter: SpanExporter;
    let exportedSpans: MullionSpan[];

    beforeEach(() => {
      exportedSpans = [];
      mockExporter = {
        export: vi.fn(async (spans) => {
          exportedSpans.push(...spans);
        }),
        shutdown: vi.fn(),
      };

      collector = new TraceCollector({
        exporter: mockExporter,
        autoExport: false,
      });
    });

    it('should flush and shutdown gracefully', async () => {
      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      await collector.shutdown();

      expect(mockExporter.export).toHaveBeenCalledTimes(1);
      expect(mockExporter.shutdown).toHaveBeenCalledTimes(1);
      expect(exportedSpans).toHaveLength(1);
      expect(collector.isEnabled()).toBe(false);
    });

    it('should not collect spans after shutdown', async () => {
      await collector.shutdown();

      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      expect(collector.getSpans()).toHaveLength(0);
    });

    it('should handle multiple shutdown calls', async () => {
      await collector.shutdown();
      await expect(collector.shutdown()).resolves.not.toThrow();

      expect(mockExporter.shutdown).toHaveBeenCalledTimes(1);
    });
  });

  describe('TraceCollector - Set Exporter', () => {
    let collector: TraceCollector;
    let mockExporter1: SpanExporter;
    let mockExporter2: SpanExporter;
    let exported1: MullionSpan[];
    let exported2: MullionSpan[];

    beforeEach(() => {
      exported1 = [];
      exported2 = [];

      mockExporter1 = {
        export: vi.fn(async (spans) => {
          exported1.push(...spans);
        }),
        shutdown: vi.fn(),
      };

      mockExporter2 = {
        export: vi.fn(async (spans) => {
          exported2.push(...spans);
        }),
        shutdown: vi.fn(),
      };

      collector = new TraceCollector({
        exporter: mockExporter1,
        autoExport: false,
      });
    });

    it('should switch exporters and flush pending spans', async () => {
      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      await collector.setExporter(mockExporter2);

      expect(mockExporter1.export).toHaveBeenCalledTimes(1);
      expect(mockExporter1.shutdown).toHaveBeenCalledTimes(1);
      expect(exported1).toHaveLength(1);

      const ctx2 = collector.startSpan({ name: 'test2' });
      await collector.endSpan(ctx2);
      await collector.flush();

      expect(mockExporter2.export).toHaveBeenCalledTimes(1);
      expect(exported2).toHaveLength(1);
    });

    it('should allow disabling tracing by setting undefined exporter', async () => {
      expect(collector.isEnabled()).toBe(true);

      await collector.setExporter(undefined);

      expect(collector.isEnabled()).toBe(false);

      const ctx = collector.startSpan({ name: 'test' });
      await collector.endSpan(ctx);

      expect(collector.getSpans()).toHaveLength(0);
    });
  });

  describe('Global Trace Collector', () => {
    beforeEach(() => {
      clearGlobalTraceCollector();
    });

    it('should create default collector when none exists', () => {
      const collector = getGlobalTraceCollector();
      expect(collector).toBeInstanceOf(TraceCollector);
      expect(collector.isEnabled()).toBe(false);
    });

    it('should return same instance on multiple calls', () => {
      const collector1 = getGlobalTraceCollector();
      const collector2 = getGlobalTraceCollector();
      expect(collector1).toBe(collector2);
    });

    it('should allow setting custom global collector', () => {
      const customCollector = new TraceCollector();
      setGlobalTraceCollector(customCollector);

      const retrieved = getGlobalTraceCollector();
      expect(retrieved).toBe(customCollector);
    });

    it('should allow clearing global collector', () => {
      const collector1 = getGlobalTraceCollector();
      clearGlobalTraceCollector();
      const collector2 = getGlobalTraceCollector();

      expect(collector1).not.toBe(collector2);
    });
  });
});
