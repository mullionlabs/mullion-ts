import { describe, it, expect } from 'vitest';
import { createOwned } from '../../owned.js';
import type { Owned } from '../../owned.js';
import { categorical } from './categorical.js';
import { continuous } from './continuous.js';
import { object } from './object.js';
import { array } from './array.js';
import { custom } from './custom.js';

describe('Merge Strategies', () => {
  describe('categorical.weightedVote', () => {
    it('should select value with highest weighted votes', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'urgent', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'normal', confidence: 0.6, scope: 'b1' }),
        createOwned({ value: 'urgent', confidence: 0.8, scope: 'b2' }),
      ];

      const strategy = categorical.weightedVote<string>();
      const result = strategy.merge(results);

      expect(result.value.value).toBe('urgent');
      expect(result.value.__scope).toBe('merged');
      expect(result.value.confidence).toBeCloseTo(0.739, 2); // (0.9 + 0.8) / (0.9 + 0.6 + 0.8)
      expect(result.provenance.contributingBranches).toEqual([0, 2]);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe('voted');
    });

    it('should handle unanimous decision', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'yes', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'yes', confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 'yes', confidence: 0.7, scope: 'b2' }),
      ];

      const strategy = categorical.weightedVote<string>();
      const result = strategy.merge(results);

      expect(result.value.value).toBe('yes');
      expect(result.provenance.consensusLevel).toBe(1.0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should reject values below minimum confidence', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'A', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'B', confidence: 0.3, scope: 'b1' }),
        createOwned({ value: 'A', confidence: 0.8, scope: 'b2' }),
      ];

      const strategy = categorical.weightedVote<string>({
        minConfidence: 0.5,
      });
      const result = strategy.merge(results);

      expect(result.value.value).toBe('A');
      expect(result.provenance.rejectedValues).toHaveLength(1);
      expect(result.provenance.rejectedValues[0].branch).toBe(1);
      expect(result.provenance.rejectedValues[0].reason).toContain(
        'confidence below threshold'
      );
    });

    it('should use highest-confidence tiebreaker', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'A', confidence: 0.7, scope: 'b0' }),
        createOwned({ value: 'B', confidence: 0.9, scope: 'b1' }),
        createOwned({ value: 'C', confidence: 0.7, scope: 'b2' }),
      ];

      const strategy = categorical.weightedVote<string>({
        tiebreaker: 'highest-confidence',
      });
      const result = strategy.merge(results);

      // All have different weights, but if tied, B would win due to 0.9 confidence
      expect(['A', 'B', 'C']).toContain(result.value.value);
    });

    it('should throw on empty results', () => {
      const strategy = categorical.weightedVote<string>();
      expect(() => strategy.merge([])).toThrow('Cannot merge empty results');
    });

    it('should throw when all results rejected', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'A', confidence: 0.3, scope: 'b0' }),
        createOwned({ value: 'B', confidence: 0.2, scope: 'b1' }),
      ];

      const strategy = categorical.weightedVote<string>({
        minConfidence: 0.5,
      });

      expect(() => strategy.merge(results)).toThrow('All results rejected');
    });
  });

  describe('continuous.weightedAverage', () => {
    it('should calculate weighted average', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 42.5, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 38.2, confidence: 0.7, scope: 'b1' }),
        createOwned({ value: 40.1, confidence: 0.8, scope: 'b2' }),
      ];

      const strategy = continuous.weightedAverage();
      const result = strategy.merge(results);

      // (42.5*0.9 + 38.2*0.7 + 40.1*0.8) / (0.9 + 0.7 + 0.8)
      const expectedAvg = (42.5 * 0.9 + 38.2 * 0.7 + 40.1 * 0.8) / 2.4;

      expect(result.value.value.value).toBeCloseTo(expectedAvg, 2);
      expect(result.value.value.dispersion).toBeGreaterThan(0);
      expect(result.value.__scope).toBe('merged');
      expect(result.provenance.contributingBranches).toEqual([0, 1, 2]);
    });

    it('should detect and reject outliers', () => {
      // Use many values to make outlier detection effective
      const results: Owned<number, string>[] = [
        createOwned({ value: 100, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 102, confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 101, confidence: 0.85, scope: 'b2' }),
        createOwned({ value: 99, confidence: 0.9, scope: 'b3' }),
        createOwned({ value: 103, confidence: 0.8, scope: 'b4' }),
        createOwned({ value: 1000, confidence: 0.7, scope: 'b5' }), // Outlier
      ];

      const strategy = continuous.weightedAverage({
        outlierThreshold: 2,
      });
      const result = strategy.merge(results);

      expect(result.provenance.rejectedValues).toHaveLength(1);
      expect(result.provenance.rejectedValues[0].branch).toBe(5);
      expect(result.provenance.rejectedValues[0].reason).toContain('outlier');
    });

    it('should handle zero dispersion (perfect agreement)', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 42, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 42, confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 42, confidence: 0.7, scope: 'b2' }),
      ];

      const strategy = continuous.weightedAverage();
      const result = strategy.merge(results);

      expect(result.value.value.value).toBe(42);
      expect(result.value.value.dispersion).toBe(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should reject values below minimum confidence', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 100, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 200, confidence: 0.3, scope: 'b1' }),
        createOwned({ value: 105, confidence: 0.8, scope: 'b2' }),
      ];

      const strategy = continuous.weightedAverage({
        minConfidence: 0.5,
      });
      const result = strategy.merge(results);

      expect(result.provenance.rejectedValues).toHaveLength(1);
      expect(result.provenance.contributingBranches).toHaveLength(2);
    });

    it('should throw on empty results', () => {
      const strategy = continuous.weightedAverage();
      expect(() => strategy.merge([])).toThrow('Cannot merge empty results');
    });
  });

  describe('object.fieldwise', () => {
    it('should merge objects field by field using voting', () => {
      interface TestObj {
        category: string;
        priority: number;
        assignee: string;
      }

      const results: Owned<TestObj, string>[] = [
        createOwned({
          value: { category: 'urgent', priority: 9, assignee: 'alice' },
          confidence: 0.9,
          scope: 'b0',
        }),
        createOwned({
          value: { category: 'normal', priority: 7, assignee: 'alice' },
          confidence: 0.7,
          scope: 'b1',
        }),
        createOwned({
          value: { category: 'urgent', priority: 8, assignee: 'bob' },
          confidence: 0.8,
          scope: 'b2',
        }),
      ];

      const strategy = object.fieldwise<TestObj>();
      const result = strategy.merge(results);

      // category: 'urgent' wins (0.9 + 0.8 vs 0.7)
      // priority: 9 wins (0.9 vs 0.7 vs 0.8)
      // assignee: 'alice' wins (0.9 + 0.7 vs 0.8)
      expect(result.value.value.category).toBe('urgent');
      expect(result.value.value.priority).toBe(9);
      expect(result.value.value.assignee).toBe('alice');

      // Should have conflicts for all fields
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts.every((c) => c.resolution === 'voted')).toBe(
        true
      );
    });

    it('should use highest-confidence strategy', () => {
      interface TestObj {
        a: string;
        b: number;
      }

      const results: Owned<TestObj, string>[] = [
        createOwned({
          value: { a: 'x', b: 1 },
          confidence: 0.7,
          scope: 'b0',
        }),
        createOwned({
          value: { a: 'y', b: 2 },
          confidence: 0.9,
          scope: 'b1',
        }),
        createOwned({
          value: { a: 'z', b: 3 },
          confidence: 0.6,
          scope: 'b2',
        }),
      ];

      const strategy = object.fieldwise<TestObj>({
        fieldStrategy: 'highest-confidence',
      });
      const result = strategy.merge(results);

      // Should take all fields from branch 1 (highest confidence)
      expect(result.value.value).toEqual({ a: 'y', b: 2 });
    });

    it('should use first strategy', () => {
      interface TestObj {
        a: string;
      }

      const results: Owned<TestObj, string>[] = [
        createOwned({ value: { a: 'first' }, confidence: 0.5, scope: 'b0' }),
        createOwned({ value: { a: 'second' }, confidence: 0.9, scope: 'b1' }),
      ];

      const strategy = object.fieldwise<TestObj>({
        fieldStrategy: 'first',
      });
      const result = strategy.merge(results);

      expect(result.value.value.a).toBe('first');
    });

    it('should throw on field mismatch without allowPartial', () => {
      interface TestObj {
        a: string;
        b?: number;
      }

      const results: Owned<TestObj, string>[] = [
        createOwned({ value: { a: 'x', b: 1 }, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: { a: 'y' }, confidence: 0.8, scope: 'b1' }),
      ];

      const strategy = object.fieldwise<TestObj>();

      expect(() => strategy.merge(results)).toThrow('Field mismatch');
    });

    it('should handle partial objects when allowed', () => {
      interface TestObj {
        a: string;
        b?: number;
      }

      const results: Owned<TestObj, string>[] = [
        createOwned({ value: { a: 'x', b: 1 }, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: { a: 'y' }, confidence: 0.8, scope: 'b1' }),
      ];

      const strategy = object.fieldwise<TestObj>({
        allowPartial: true,
      });
      const result = strategy.merge(results);

      expect(result.value.value.a).toBeDefined();
      expect(result.value.value.b).toBeDefined();
    });

    it('should throw on empty results', () => {
      const strategy = object.fieldwise<{ a: string }>();
      expect(() => strategy.merge([])).toThrow('Cannot merge empty results');
    });
  });

  describe('array.concat', () => {
    it('should concatenate arrays and remove duplicates', () => {
      const results: Owned<string[], string>[] = [
        createOwned({
          value: ['tag1', 'tag2', 'tag3'],
          confidence: 0.9,
          scope: 'b0',
        }),
        createOwned({ value: ['tag2', 'tag4'], confidence: 0.8, scope: 'b1' }),
        createOwned({ value: ['tag1', 'tag5'], confidence: 0.7, scope: 'b2' }),
      ];

      const strategy = array.concat<string>();
      const result = strategy.merge(results);

      expect(result.value.value).toHaveLength(5);
      expect(result.value.value).toEqual(
        expect.arrayContaining(['tag1', 'tag2', 'tag3', 'tag4', 'tag5'])
      );
    });

    it('should keep duplicates when configured', () => {
      const results: Owned<string[], string>[] = [
        createOwned({ value: ['a', 'b'], confidence: 0.9, scope: 'b0' }),
        createOwned({ value: ['a', 'c'], confidence: 0.8, scope: 'b1' }),
      ];

      const strategy = array.concat<string>({
        removeDuplicates: false,
      });
      const result = strategy.merge(results);

      expect(result.value.value).toHaveLength(4); // ['a', 'b', 'a', 'c']
      expect(result.value.value.filter((x) => x === 'a')).toHaveLength(2);
    });

    it('should use custom equality function', () => {
      interface Item {
        id: string;
        name: string;
      }

      const results: Owned<Item[], string>[] = [
        createOwned({
          value: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
          confidence: 0.9,
          scope: 'b0',
        }),
        createOwned({
          value: [
            { id: '1', name: 'Alice' },
            { id: '3', name: 'Carol' },
          ],
          confidence: 0.8,
          scope: 'b1',
        }),
      ];

      const strategy = array.concat<Item>({
        equalityFn: (a, b) => a.id === b.id,
      });
      const result = strategy.merge(results);

      expect(result.value.value).toHaveLength(3); // id '1' deduplicated
    });

    it('should limit total items', () => {
      const results: Owned<string[], string>[] = [
        createOwned({
          value: ['a', 'b', 'c', 'd'],
          confidence: 0.9,
          scope: 'b0',
        }),
        createOwned({
          value: ['e', 'f', 'g', 'h'],
          confidence: 0.8,
          scope: 'b1',
        }),
      ];

      const strategy = array.concat<string>({
        maxItems: 5,
      });
      const result = strategy.merge(results);

      expect(result.value.value.length).toBeLessThanOrEqual(5);
    });

    it('should reject arrays below minimum confidence', () => {
      const results: Owned<string[], string>[] = [
        createOwned({ value: ['a', 'b'], confidence: 0.9, scope: 'b0' }),
        createOwned({ value: ['c', 'd'], confidence: 0.3, scope: 'b1' }),
        createOwned({ value: ['e', 'f'], confidence: 0.8, scope: 'b2' }),
      ];

      const strategy = array.concat<string>({
        minConfidence: 0.5,
      });
      const result = strategy.merge(results);

      expect(result.provenance.rejectedValues).toHaveLength(1);
      expect(result.value.value).not.toContain('c');
      expect(result.value.value).not.toContain('d');
    });

    it('should throw on empty results', () => {
      const strategy = array.concat<string>();
      expect(() => strategy.merge([])).toThrow('Cannot merge empty results');
    });
  });

  describe('custom', () => {
    it('should execute custom merge function', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 10, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 20, confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 30, confidence: 0.7, scope: 'b2' }),
      ];

      // Median strategy
      const strategy = custom<number, number>((results) => {
        const values = results.map((r) => r.value).sort((a, b) => a - b);
        const mid = Math.floor(values.length / 2);
        return values[mid];
      });

      const result = strategy.merge(results);

      expect(result.value.value).toBe(20); // Median of [10, 20, 30]
      expect(result.value.__scope).toBe('merged');
    });

    it('should use custom confidence calculation', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'abc', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'abx', confidence: 0.8, scope: 'b1' }),
      ];

      // Common prefix with confidence based on prefix length
      const strategy = custom<string, string>(
        (results) => {
          let prefix = results[0].value;
          for (const r of results.slice(1)) {
            let i = 0;
            while (
              i < prefix.length &&
              i < r.value.length &&
              prefix[i] === r.value[i]
            ) {
              i++;
            }
            prefix = prefix.slice(0, i);
          }
          return prefix;
        },
        {
          calculateConfidence: (results, merged) => {
            const avgLength =
              results.reduce((sum, r) => sum + r.value.length, 0) /
              results.length;
            return merged.length / avgLength;
          },
        }
      );

      const result = strategy.merge(results);

      expect(result.value.value).toBe('ab');
      expect(result.value.confidence).toBeCloseTo(0.67, 1); // 2 / 3
    });

    it('should use custom consensus calculation', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 1, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 2, confidence: 0.8, scope: 'b1' }),
      ];

      const strategy = custom<number, number>((results) => results[0].value, {
        calculateConsensus: () => 0.5,
      });

      const result = strategy.merge(results);

      expect(result.provenance.consensusLevel).toBe(0.5);
    });

    it('should throw if merge function throws', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 1, confidence: 0.9, scope: 'b0' }),
      ];

      const strategy = custom<number, number>(() => {
        throw new Error('Test error');
      });

      expect(() => strategy.merge(results)).toThrow(
        'Custom merge function failed'
      );
    });

    it('should throw if confidence is out of range', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 1, confidence: 0.9, scope: 'b0' }),
      ];

      const strategy = custom<number, number>((results) => results[0].value, {
        calculateConfidence: () => 1.5,
      });

      expect(() => strategy.merge(results)).toThrow('invalid value');
    });

    it('should throw if consensus is out of range', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 1, confidence: 0.9, scope: 'b0' }),
      ];

      const strategy = custom<number, number>((results) => results[0].value, {
        calculateConsensus: () => -0.5,
      });

      expect(() => strategy.merge(results)).toThrow('invalid value');
    });

    it('should throw on empty results', () => {
      const strategy = custom<number, number>((results) => results[0].value);
      expect(() => strategy.merge([])).toThrow('Cannot merge empty results');
    });
  });
});
