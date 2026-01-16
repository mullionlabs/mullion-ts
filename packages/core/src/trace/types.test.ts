import {describe, it, expect} from 'vitest';
import {
  isMullionSpan,
  isSpanContext,
  type MullionSpan,
  type SpanContext,
  type MullionAttributes,
  type MullionOperation,
} from './types.js';

describe('trace/types', () => {
  describe('MullionOperation', () => {
    it('should accept valid operation types', () => {
      const operations: MullionOperation[] = [
        'infer',
        'bridge',
        'fork',
        'merge',
      ];

      operations.forEach((op) => {
        expect(['infer', 'bridge', 'fork', 'merge']).toContain(op);
      });
    });
  });

  describe('MullionAttributes', () => {
    it('should define required scope and operation attributes', () => {
      const attributes: MullionAttributes = {
        'mullion.scope.id': 'admin',
        'mullion.scope.name': 'admin-review',
        'mullion.operation': 'infer',
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
        'gen_ai.usage.input_tokens': 1500,
        'gen_ai.usage.output_tokens': 300,
      };

      expect(attributes['mullion.scope.id']).toBe('admin');
      expect(attributes['mullion.scope.name']).toBe('admin-review');
      expect(attributes['mullion.operation']).toBe('infer');
    });

    it('should support optional confidence attribute', () => {
      const attributes: Partial<MullionAttributes> = {
        'mullion.scope.id': 'admin',
        'mullion.scope.name': 'admin-review',
        'mullion.operation': 'infer',
        'mullion.confidence': 0.95,
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
        'gen_ai.usage.input_tokens': 1500,
        'gen_ai.usage.output_tokens': 300,
      };

      expect(attributes['mullion.confidence']).toBe(0.95);
    });

    it('should support bridge attributes', () => {
      const attributes: Partial<MullionAttributes> = {
        'mullion.scope.id': 'customer',
        'mullion.scope.name': 'customer-support',
        'mullion.operation': 'bridge',
        'mullion.bridge.source': 'admin',
        'mullion.bridge.target': 'customer',
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
        'gen_ai.usage.input_tokens': 0,
        'gen_ai.usage.output_tokens': 0,
      };

      expect(attributes['mullion.bridge.source']).toBe('admin');
      expect(attributes['mullion.bridge.target']).toBe('customer');
    });

    it('should support fork attributes', () => {
      const attributes: Partial<MullionAttributes> = {
        'mullion.scope.id': 'analysis',
        'mullion.scope.name': 'risk-analysis',
        'mullion.operation': 'fork',
        'mullion.fork.strategy': 'cache-optimized',
        'mullion.fork.branch_count': 3,
        'mullion.fork.warmup_strategy': 'explicit',
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
        'gen_ai.usage.input_tokens': 5000,
        'gen_ai.usage.output_tokens': 1000,
      };

      expect(attributes['mullion.fork.strategy']).toBe('cache-optimized');
      expect(attributes['mullion.fork.branch_count']).toBe(3);
      expect(attributes['mullion.fork.warmup_strategy']).toBe('explicit');
    });

    it('should support merge attributes', () => {
      const attributes: Partial<MullionAttributes> = {
        'mullion.scope.id': 'analysis',
        'mullion.scope.name': 'risk-analysis',
        'mullion.operation': 'merge',
        'mullion.merge.strategy': 'weightedVote',
        'mullion.merge.consensus_level': 0.66,
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
        'gen_ai.usage.input_tokens': 0,
        'gen_ai.usage.output_tokens': 0,
      };

      expect(attributes['mullion.merge.strategy']).toBe('weightedVote');
      expect(attributes['mullion.merge.consensus_level']).toBe(0.66);
    });

    it('should support cache attributes', () => {
      const attributes: Partial<MullionAttributes> = {
        'mullion.scope.id': 'admin',
        'mullion.scope.name': 'admin-review',
        'mullion.operation': 'infer',
        'mullion.cache.hit_rate': 0.8,
        'mullion.cache.saved_tokens': 5000,
        'mullion.cache.created_tokens': 2000,
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
        'gen_ai.usage.input_tokens': 1500,
        'gen_ai.usage.output_tokens': 300,
      };

      expect(attributes['mullion.cache.hit_rate']).toBe(0.8);
      expect(attributes['mullion.cache.saved_tokens']).toBe(5000);
      expect(attributes['mullion.cache.created_tokens']).toBe(2000);
    });

    it('should support cost attributes', () => {
      const attributes: Partial<MullionAttributes> = {
        'mullion.scope.id': 'admin',
        'mullion.scope.name': 'admin-review',
        'mullion.operation': 'infer',
        'mullion.cost.usd': 0.0234,
        'mullion.cost.saved_usd': 0.012,
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
        'gen_ai.usage.input_tokens': 1500,
        'gen_ai.usage.output_tokens': 300,
      };

      expect(attributes['mullion.cost.usd']).toBe(0.0234);
      expect(attributes['mullion.cost.saved_usd']).toBe(0.012);
    });

    it('should support GenAI semantic conventions', () => {
      const attributes: Partial<MullionAttributes> = {
        'mullion.scope.id': 'admin',
        'mullion.scope.name': 'admin-review',
        'mullion.operation': 'infer',
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
        'gen_ai.usage.input_tokens': 1500,
        'gen_ai.usage.output_tokens': 300,
        'gen_ai.response.finish_reasons': ['stop'],
      };

      expect(attributes['gen_ai.system']).toBe('anthropic');
      expect(attributes['gen_ai.request.model']).toBe(
        'claude-3-5-sonnet-20241022',
      );
      expect(attributes['gen_ai.usage.input_tokens']).toBe(1500);
      expect(attributes['gen_ai.usage.output_tokens']).toBe(300);
      expect(attributes['gen_ai.response.finish_reasons']).toEqual(['stop']);
    });
  });

  describe('MullionSpan', () => {
    it('should create a valid span with required fields', () => {
      const span: MullionSpan = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        parentSpanId: '0000000000000001',
        name: 'mullion.infer',
        startTime: 1704067200000000,
        endTime: 1704067201500000,
        status: 'ok',
        kind: 'client',
        attributes: {
          'mullion.scope.id': 'admin',
          'mullion.scope.name': 'admin-review',
          'mullion.operation': 'infer',
          'mullion.confidence': 0.95,
          'gen_ai.system': 'anthropic',
          'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
          'gen_ai.usage.input_tokens': 1500,
          'gen_ai.usage.output_tokens': 300,
        },
      };

      expect(span.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(span.spanId).toBe('00f067aa0ba902b7');
      expect(span.parentSpanId).toBe('0000000000000001');
      expect(span.name).toBe('mullion.infer');
      expect(span.status).toBe('ok');
      expect(span.kind).toBe('client');
      expect(span.startTime).toBe(1704067200000000);
      expect(span.endTime).toBe(1704067201500000);
    });

    it('should support root spans without parentSpanId', () => {
      const span: MullionSpan = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        name: 'mullion.fork',
        startTime: 1704067200000000,
        endTime: 1704067201500000,
        status: 'ok',
        kind: 'internal',
        attributes: {
          'mullion.scope.id': 'analysis',
          'mullion.scope.name': 'risk-analysis',
          'mullion.operation': 'fork',
          'mullion.fork.strategy': 'cache-optimized',
          'mullion.fork.branch_count': 3,
          'gen_ai.system': 'anthropic',
          'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
          'gen_ai.usage.input_tokens': 5000,
          'gen_ai.usage.output_tokens': 1000,
        },
      };

      expect(span.parentSpanId).toBeUndefined();
    });

    it('should support error status with message', () => {
      const span: MullionSpan = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        name: 'mullion.infer',
        startTime: 1704067200000000,
        endTime: 1704067201500000,
        status: 'error',
        statusMessage: 'API rate limit exceeded',
        kind: 'client',
        attributes: {
          'mullion.scope.id': 'admin',
          'mullion.scope.name': 'admin-review',
          'mullion.operation': 'infer',
          'gen_ai.system': 'anthropic',
          'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
          'gen_ai.usage.input_tokens': 0,
          'gen_ai.usage.output_tokens': 0,
        },
      };

      expect(span.status).toBe('error');
      expect(span.statusMessage).toBe('API rate limit exceeded');
    });

    it('should support different span kinds', () => {
      const kinds: MullionSpan['kind'][] = [
        'internal',
        'client',
        'server',
        'producer',
        'consumer',
      ];

      kinds.forEach((kind) => {
        const span: MullionSpan = {
          traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
          spanId: '00f067aa0ba902b7',
          name: 'mullion.infer',
          startTime: 1704067200000000,
          endTime: 1704067201500000,
          status: 'ok',
          kind,
          attributes: {
            'mullion.scope.id': 'admin',
            'mullion.scope.name': 'admin-review',
            'mullion.operation': 'infer',
            'gen_ai.system': 'anthropic',
            'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
            'gen_ai.usage.input_tokens': 1500,
            'gen_ai.usage.output_tokens': 300,
          },
        };

        expect(span.kind).toBe(kind);
      });
    });
  });

  describe('SpanContext', () => {
    it('should create a valid span context', () => {
      const ctx: SpanContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        startTime: 1704067200000000,
      };

      expect(ctx.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(ctx.spanId).toBe('00f067aa0ba902b7');
      expect(ctx.startTime).toBe(1704067200000000);
    });

    it('should support parent span context', () => {
      const ctx: SpanContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        parentSpanId: '0000000000000001',
        startTime: 1704067200000000,
      };

      expect(ctx.parentSpanId).toBe('0000000000000001');
    });
  });

  describe('isMullionSpan', () => {
    it('should return true for valid MullionSpan', () => {
      const validSpan: MullionSpan = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        name: 'mullion.infer',
        startTime: 1704067200000000,
        endTime: 1704067201500000,
        status: 'ok',
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
      };

      expect(isMullionSpan(validSpan)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isMullionSpan(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isMullionSpan(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isMullionSpan('not a span')).toBe(false);
      expect(isMullionSpan(123)).toBe(false);
      expect(isMullionSpan(true)).toBe(false);
    });

    it('should return false for object missing traceId', () => {
      const invalidSpan = {
        spanId: '00f067aa0ba902b7',
        name: 'mullion.infer',
        startTime: 1704067200000000,
        endTime: 1704067201500000,
        status: 'ok',
        kind: 'client',
        attributes: {},
      };

      expect(isMullionSpan(invalidSpan)).toBe(false);
    });

    it('should return false for object missing spanId', () => {
      const invalidSpan = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        name: 'mullion.infer',
        startTime: 1704067200000000,
        endTime: 1704067201500000,
        status: 'ok',
        kind: 'client',
        attributes: {},
      };

      expect(isMullionSpan(invalidSpan)).toBe(false);
    });

    it('should return false for object missing name', () => {
      const invalidSpan = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        startTime: 1704067200000000,
        endTime: 1704067201500000,
        status: 'ok',
        kind: 'client',
        attributes: {},
      };

      expect(isMullionSpan(invalidSpan)).toBe(false);
    });

    it('should return false for object missing timestamps', () => {
      const invalidSpan = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        name: 'mullion.infer',
        status: 'ok',
        kind: 'client',
        attributes: {},
      };

      expect(isMullionSpan(invalidSpan)).toBe(false);
    });

    it('should return false for invalid status', () => {
      const invalidSpan = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        name: 'mullion.infer',
        startTime: 1704067200000000,
        endTime: 1704067201500000,
        status: 'invalid-status',
        kind: 'client',
        attributes: {},
      };

      expect(isMullionSpan(invalidSpan)).toBe(false);
    });

    it('should return false for invalid kind', () => {
      const invalidSpan = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        name: 'mullion.infer',
        startTime: 1704067200000000,
        endTime: 1704067201500000,
        status: 'ok',
        kind: 'invalid-kind',
        attributes: {},
      };

      expect(isMullionSpan(invalidSpan)).toBe(false);
    });

    it('should return false for missing attributes', () => {
      const invalidSpan = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        name: 'mullion.infer',
        startTime: 1704067200000000,
        endTime: 1704067201500000,
        status: 'ok',
        kind: 'client',
      };

      expect(isMullionSpan(invalidSpan)).toBe(false);
    });

    it('should return false for null attributes', () => {
      const invalidSpan = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        name: 'mullion.infer',
        startTime: 1704067200000000,
        endTime: 1704067201500000,
        status: 'ok',
        kind: 'client',
        attributes: null,
      };

      expect(isMullionSpan(invalidSpan)).toBe(false);
    });
  });

  describe('isSpanContext', () => {
    it('should return true for valid SpanContext', () => {
      const validContext: SpanContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        startTime: 1704067200000000,
      };

      expect(isSpanContext(validContext)).toBe(true);
    });

    it('should return true for SpanContext with parentSpanId', () => {
      const validContext: SpanContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        parentSpanId: '0000000000000001',
        startTime: 1704067200000000,
      };

      expect(isSpanContext(validContext)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isSpanContext(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSpanContext(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isSpanContext('not a context')).toBe(false);
      expect(isSpanContext(123)).toBe(false);
      expect(isSpanContext(true)).toBe(false);
    });

    it('should return false for object missing traceId', () => {
      const invalidContext = {
        spanId: '00f067aa0ba902b7',
        startTime: 1704067200000000,
      };

      expect(isSpanContext(invalidContext)).toBe(false);
    });

    it('should return false for object missing spanId', () => {
      const invalidContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        startTime: 1704067200000000,
      };

      expect(isSpanContext(invalidContext)).toBe(false);
    });

    it('should return false for object missing startTime', () => {
      const invalidContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
      };

      expect(isSpanContext(invalidContext)).toBe(false);
    });

    it('should return false for invalid traceId type', () => {
      const invalidContext = {
        traceId: 123,
        spanId: '00f067aa0ba902b7',
        startTime: 1704067200000000,
      };

      expect(isSpanContext(invalidContext)).toBe(false);
    });

    it('should return false for invalid spanId type', () => {
      const invalidContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: 123,
        startTime: 1704067200000000,
      };

      expect(isSpanContext(invalidContext)).toBe(false);
    });

    it('should return false for invalid startTime type', () => {
      const invalidContext = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        startTime: '1704067200000000',
      };

      expect(isSpanContext(invalidContext)).toBe(false);
    });
  });
});
