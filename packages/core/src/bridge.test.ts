import {describe, it, expect} from 'vitest';
import {
  bridge,
  bridgeSemantic,
  bridgeMultiple,
  getProvenance,
  bridgeWithMetadata,
} from './bridge.js';
import type {Owned} from './owned.js';
import {createOwned} from './owned.js';
import type {SemanticValue} from './semantic-value.js';
import {createSemanticValue} from './semantic-value.js';

describe('bridge', () => {
  describe('bridge()', () => {
    it('should bridge an Owned value to a new scope', () => {
      const original: Owned<string, 'source'> = createOwned({
        value: 'test-data',
        scope: 'source',
        confidence: 0.9,
      });

      const bridged = bridge(original, 'target');

      expect(bridged.value).toBe('test-data');
      expect(bridged.confidence).toBe(0.9);
      expect(bridged.__scope).toBe('target');
      expect(bridged.traceId).toBe(original.traceId);
    });

    it('should preserve all original metadata except scope', () => {
      const original: Owned<number, 'admin'> = createOwned({
        value: 42,
        scope: 'admin',
        confidence: 0.75,
        traceId: 'custom-trace-123',
      });

      const bridged = bridge(original, 'user');

      expect(bridged.value).toBe(42);
      expect(bridged.confidence).toBe(0.75);
      expect(bridged.traceId).toBe('custom-trace-123');
      expect(bridged.__scope).toBe('user');
    });

    it('should allow chaining multiple bridges', () => {
      const step1: Owned<string, 'input'> = createOwned({
        value: 'data',
        scope: 'input',
      });

      const step2 = bridge(step1, 'processing');
      const step3 = bridge(step2, 'output');

      expect(step3.value).toBe('data');
      expect(step3.__scope).toBe('output');
      expect(step3.traceId).toBe(step1.traceId);
    });

    it('should work with complex value types', () => {
      interface ComplexData {
        id: number;
        nested: {
          field: string;
        };
      }

      const original: Owned<ComplexData, 'scope1'> = createOwned({
        value: {id: 1, nested: {field: 'value'}},
        scope: 'scope1',
      });

      const bridged = bridge(original, 'scope2');

      expect(bridged.value).toEqual({id: 1, nested: {field: 'value'}});
      expect(bridged.__scope).toBe('scope2');
    });
  });

  describe('bridgeSemantic()', () => {
    it('should bridge a SemanticValue preserving all metadata', () => {
      const original: SemanticValue<string, 'ai-analysis'> =
        createSemanticValue({
          value: 'positive',
          scope: 'ai-analysis',
          confidence: 0.85,
          alternatives: [
            {value: 'neutral', confidence: 0.7},
            {value: 'negative', confidence: 0.3},
          ],
          reasoning: 'Overall positive sentiment detected',
        });

      const bridged = bridgeSemantic(original, 'reporting');

      expect(bridged.value).toBe('positive');
      expect(bridged.confidence).toBe(0.85);
      expect(bridged.__scope).toBe('reporting');
      expect(bridged.alternatives).toHaveLength(2);
      expect(bridged.alternatives[0]).toEqual({
        value: 'neutral',
        confidence: 0.7,
      });
      expect(bridged.reasoning).toBe('Overall positive sentiment detected');
      expect(bridged.traceId).toBe(original.traceId);
    });

    it('should preserve empty alternatives and reasoning', () => {
      const original: SemanticValue<number, 'scope1'> = createSemanticValue({
        value: 42,
        scope: 'scope1',
        alternatives: [],
        reasoning: '',
      });

      const bridged = bridgeSemantic(original, 'scope2');

      expect(bridged.alternatives).toEqual([]);
      expect(bridged.reasoning).toBe('');
    });

    it('should allow chaining semantic bridges', () => {
      const step1: SemanticValue<string, 'input'> = createSemanticValue({
        value: 'data',
        scope: 'input',
        reasoning: 'Initial analysis',
      });

      const step2 = bridgeSemantic(step1, 'processing');
      const step3 = bridgeSemantic(step2, 'output');

      expect(step3.value).toBe('data');
      expect(step3.reasoning).toBe('Initial analysis');
      expect(step3.__scope).toBe('output');
    });
  });

  describe('bridgeMultiple()', () => {
    it('should bridge multiple values to same target scope', () => {
      const values: Owned<number, 'source'>[] = [
        createOwned({value: 1, scope: 'source'}),
        createOwned({value: 2, scope: 'source'}),
        createOwned({value: 3, scope: 'source'}),
      ];

      const bridged = bridgeMultiple(values, 'target');

      expect(bridged).toHaveLength(3);
      expect(bridged[0].value).toBe(1);
      expect(bridged[1].value).toBe(2);
      expect(bridged[2].value).toBe(3);
      expect(bridged[0].__scope).toBe('target');
      expect(bridged[1].__scope).toBe('target');
      expect(bridged[2].__scope).toBe('target');
    });

    it('should handle empty array', () => {
      const values: Owned<string, 'source'>[] = [];
      const bridged = bridgeMultiple(values, 'target');

      expect(bridged).toEqual([]);
    });

    it('should preserve individual trace IDs', () => {
      const values: Owned<string, 'source'>[] = [
        createOwned({value: 'a', scope: 'source', traceId: 'trace-1'}),
        createOwned({value: 'b', scope: 'source', traceId: 'trace-2'}),
      ];

      const bridged = bridgeMultiple(values, 'target');

      expect(bridged[0].traceId).toBe('trace-1');
      expect(bridged[1].traceId).toBe('trace-2');
    });

    it('should throw when requireSameScope=true and scopes differ', () => {
      const values: Owned<string, 'scope1' | 'scope2'>[] = [
        createOwned({value: 'a', scope: 'scope1' as const}),
        createOwned({value: 'b', scope: 'scope2' as const}),
      ];

      expect(() => {
        bridgeMultiple(values, 'target', {requireSameScope: true});
      }).toThrow(/different scopes/);
    });

    it('should not throw when requireSameScope=true and scopes match', () => {
      const values: Owned<string, 'source'>[] = [
        createOwned({value: 'a', scope: 'source'}),
        createOwned({value: 'b', scope: 'source'}),
      ];

      const bridged = bridgeMultiple(values, 'target', {
        requireSameScope: true,
      });

      expect(bridged).toHaveLength(2);
    });

    it('should allow requireSameScope=true with empty array', () => {
      const values: Owned<string, 'source'>[] = [];

      const bridged = bridgeMultiple(values, 'target', {
        requireSameScope: true,
      });

      expect(bridged).toEqual([]);
    });

    it('should accept metadata option', () => {
      const values: Owned<string, 'source'>[] = [
        createOwned({value: 'test', scope: 'source'}),
      ];

      // Should not throw
      const bridged = bridgeMultiple(values, 'target', {
        metadata: {reason: 'aggregation'},
      });

      expect(bridged).toHaveLength(1);
    });
  });

  describe('getProvenance()', () => {
    it('should return current scope and trace ID', () => {
      const owned: Owned<string, 'test-scope'> = createOwned({
        value: 'data',
        scope: 'test-scope',
        traceId: 'trace-456',
      });

      const provenance = getProvenance(owned);

      expect(provenance.currentScope).toBe('test-scope');
      expect(provenance.traceId).toBe('trace-456');
    });

    it('should work with bridged values', () => {
      const original: Owned<number, 'source'> = createOwned({
        value: 42,
        scope: 'source',
      });

      const bridged = bridge(original, 'target');
      const provenance = getProvenance(bridged);

      expect(provenance.currentScope).toBe('target');
      expect(provenance.traceId).toBe(original.traceId);
    });

    it('should preserve trace ID through multiple bridges', () => {
      const original: Owned<string, 'scope1'> = createOwned({
        value: 'data',
        scope: 'scope1',
        traceId: 'original-trace',
      });

      const step2 = bridge(original, 'scope2');
      const step3 = bridge(step2, 'scope3');

      const provenance = getProvenance(step3);

      expect(provenance.traceId).toBe('original-trace');
      expect(provenance.currentScope).toBe('scope3');
    });
  });

  describe('bridgeWithMetadata()', () => {
    it('should bridge value and return metadata', () => {
      const original: Owned<string, 'admin'> = createOwned({
        value: 'sensitive-data',
        scope: 'admin',
        traceId: 'trace-789',
      });

      const {bridged, metadata} = bridgeWithMetadata(
        original,
        'audit-log',
        'Compliance requirement',
      );

      // Check bridged value
      expect(bridged.value).toBe('sensitive-data');
      expect(bridged.__scope).toBe('audit-log');
      expect(bridged.traceId).toBe('trace-789');

      // Check metadata
      expect(metadata.source).toBe('admin');
      expect(metadata.target).toBe('audit-log');
      expect(metadata.traceId).toBe('trace-789');
      expect(metadata.reason).toBe('Compliance requirement');
      expect(metadata.timestamp).toBeTypeOf('number');
      expect(metadata.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should work without reason parameter', () => {
      const original: Owned<number, 'scope1'> = createOwned({
        value: 123,
        scope: 'scope1',
      });

      const {bridged, metadata} = bridgeWithMetadata(original, 'scope2');

      expect(bridged.__scope).toBe('scope2');
      expect(metadata.reason).toBeUndefined();
    });

    it('should generate timestamp close to current time', () => {
      const original: Owned<string, 'test'> = createOwned({
        value: 'data',
        scope: 'test',
      });

      const before = Date.now();
      const {metadata} = bridgeWithMetadata(original, 'target');
      const after = Date.now();

      expect(metadata.timestamp).toBeGreaterThanOrEqual(before);
      expect(metadata.timestamp).toBeLessThanOrEqual(after);
    });

    it('should include all required metadata fields', () => {
      const original: Owned<boolean, 'source'> = createOwned({
        value: true,
        scope: 'source',
      });

      const {metadata} = bridgeWithMetadata(original, 'dest', 'test-reason');

      expect(metadata).toHaveProperty('source');
      expect(metadata).toHaveProperty('target');
      expect(metadata).toHaveProperty('timestamp');
      expect(metadata).toHaveProperty('traceId');
      expect(metadata).toHaveProperty('reason');
    });
  });

  describe('Type Safety', () => {
    it('should maintain type information through bridges', () => {
      interface TestData {
        id: number;
        name: string;
      }

      const original: Owned<TestData, 'source'> = createOwned({
        value: {id: 1, name: 'test'},
        scope: 'source',
      });

      const bridged = bridge(original, 'target');

      // TypeScript should know these fields exist
      expect(bridged.value.id).toBe(1);
      expect(bridged.value.name).toBe('test');
    });

    it('should work with union value types', () => {
      type Status = 'active' | 'inactive' | 'pending';

      const original: Owned<Status, 'state'> = createOwned({
        value: 'active',
        scope: 'state',
      });

      const bridged = bridge(original, 'monitoring');

      expect(bridged.value).toBe('active');
    });
  });

  describe('Edge Cases', () => {
    it('should handle bridging to same scope name', () => {
      const original: Owned<string, 'scope'> = createOwned({
        value: 'data',
        scope: 'scope',
      });

      // Bridging to scope with same name
      const bridged = bridge(original, 'scope');

      expect(bridged.value).toBe('data');
      expect(bridged.__scope).toBe('scope');
    });

    it('should handle null values', () => {
      const original: Owned<null, 'source'> = createOwned({
        value: null,
        scope: 'source',
      });

      const bridged = bridge(original, 'target');

      expect(bridged.value).toBeNull();
    });

    it('should handle undefined values', () => {
      const original: Owned<undefined, 'source'> = createOwned({
        value: undefined,
        scope: 'source',
      });

      const bridged = bridge(original, 'target');

      expect(bridged.value).toBeUndefined();
    });

    it('should handle zero confidence', () => {
      const original: Owned<string, 'source'> = createOwned({
        value: 'low-confidence',
        scope: 'source',
        confidence: 0,
      });

      const bridged = bridge(original, 'target');

      expect(bridged.confidence).toBe(0);
    });

    it('should handle maximum confidence', () => {
      const original: Owned<string, 'source'> = createOwned({
        value: 'high-confidence',
        scope: 'source',
        confidence: 1,
      });

      const bridged = bridge(original, 'target');

      expect(bridged.confidence).toBe(1);
    });

    it('should handle scope names with special characters', () => {
      const original: Owned<string, 'scope-with-dashes'> = createOwned({
        value: 'data',
        scope: 'scope-with-dashes',
      });

      const bridged = bridge(original, 'scope_with_underscores.and.dots');

      expect(bridged.__scope).toBe('scope_with_underscores.and.dots');
    });
  });
});
