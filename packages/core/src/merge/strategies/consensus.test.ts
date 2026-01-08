import { describe, it, expect } from 'vitest';
import { createOwned } from '../../owned.js';
import type { Owned } from '../../owned.js';
import { requireConsensus } from './consensus.js';

describe('requireConsensus', () => {
  describe('basic consensus', () => {
    it('should accept result when consensus requirement is met', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'yes', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'yes', confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 'no', confidence: 0.7, scope: 'b2' }),
      ];

      const strategy = requireConsensus<string>(2);
      const result = strategy.merge(results);

      expect(result.value.value).toBe('yes');
      expect(result.value.confidence).toBeCloseTo(0.85, 2); // (0.9 + 0.8) / 2
      expect(result.provenance.contributingBranches).toEqual([0, 1]);
      expect(result.provenance.consensusLevel).toBeCloseTo(0.67, 2); // 2/3
    });

    it('should handle unanimous consensus', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'approve', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'approve', confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 'approve', confidence: 0.85, scope: 'b2' }),
      ];

      const strategy = requireConsensus<string>(3);
      const result = strategy.merge(results);

      expect(result.value.value).toBe('approve');
      expect(result.provenance.contributingBranches).toEqual([0, 1, 2]);
      expect(result.provenance.consensusLevel).toBe(1.0);
      expect(result.provenance.rejectedValues).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should work with k=1 (no consensus required)', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'A', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'B', confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 'C', confidence: 0.7, scope: 'b2' }),
      ];

      const strategy = requireConsensus<string>(1);
      const result = strategy.merge(results);

      // Should accept most confident single value
      expect(['A', 'B', 'C']).toContain(result.value.value);
      expect(result.value.confidence).toBeGreaterThan(0);
    });
  });

  describe('failure behaviors', () => {
    it('should return low confidence when consensus not met (default)', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'A', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'B', confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 'C', confidence: 0.7, scope: 'b2' }),
      ];

      const strategy = requireConsensus<string>(2); // Need 2 to agree
      const result = strategy.merge(results);

      expect(result.value.confidence).toBe(0); // Low confidence due to no consensus
      expect(result.provenance.consensusLevel).toBeCloseTo(0.33, 2); // 1/3
    });

    it('should return low confidence when onFailure is low-confidence', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'A', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'B', confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 'C', confidence: 0.7, scope: 'b2' }),
      ];

      const strategy = requireConsensus<string>(2, {
        onFailure: 'low-confidence',
      });
      const result = strategy.merge(results);

      expect(result.value.confidence).toBe(0);
    });

    it('should throw error when consensus not met and onFailure is error', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'A', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'B', confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 'C', confidence: 0.7, scope: 'b2' }),
      ];

      const strategy = requireConsensus<string>(2, {
        onFailure: 'error',
      });

      expect(() => strategy.merge(results)).toThrow(
        'Consensus requirement not met'
      );
      expect(() => strategy.merge(results)).toThrow('needed 2 agreeing');
    });
  });

  describe('numeric tolerance', () => {
    it('should consider values within tolerance as equal', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 100.0, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 100.05, confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 100.08, confidence: 0.85, scope: 'b2' }),
      ];

      const strategy = requireConsensus<number>(3, {
        tolerance: 0.1, // All values within 0.1
      });
      const result = strategy.merge(results);

      expect(result.value.value).toBeCloseTo(100, 1);
      expect(result.provenance.contributingBranches).toEqual([0, 1, 2]);
      expect(result.provenance.consensusLevel).toBe(1.0);
    });

    it('should reject values outside tolerance', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 100, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 101, confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 200, confidence: 0.7, scope: 'b2' }), // Outside tolerance
      ];

      const strategy = requireConsensus<number>(2, {
        tolerance: 2, // 100 and 101 within tolerance, 200 is not
      });
      const result = strategy.merge(results);

      expect(result.provenance.contributingBranches).toEqual([0, 1]);
      expect(result.provenance.rejectedValues).toHaveLength(1);
      expect(result.provenance.rejectedValues[0].branch).toBe(2);
    });

    it('should use strict equality with tolerance=0 (default)', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 100, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 100.01, confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 100, confidence: 0.85, scope: 'b2' }),
      ];

      const strategy = requireConsensus<number>(2); // Default tolerance=0
      const result = strategy.merge(results);

      expect(result.value.value).toBe(100);
      expect(result.provenance.contributingBranches).toEqual([0, 2]);
      expect(result.provenance.rejectedValues).toHaveLength(1);
      expect(result.provenance.rejectedValues[0].branch).toBe(1);
    });
  });

  describe('custom equality function', () => {
    it('should use custom equality function for objects', () => {
      interface TestObj {
        category: string;
        priority: number;
      }

      const results: Owned<TestObj, string>[] = [
        createOwned({
          value: { category: 'urgent', priority: 9 },
          confidence: 0.9,
          scope: 'b0',
        }),
        createOwned({
          value: { category: 'urgent', priority: 8 },
          confidence: 0.8,
          scope: 'b1',
        }),
        createOwned({
          value: { category: 'normal', priority: 5 },
          confidence: 0.7,
          scope: 'b2',
        }),
      ];

      // Consider equal if category matches, ignore priority
      const strategy = requireConsensus<TestObj>(2, {
        equalityFn: (a, b) => a.category === b.category,
      });
      const result = strategy.merge(results);

      expect(result.value.value.category).toBe('urgent');
      expect(result.provenance.contributingBranches).toEqual([0, 1]);
      expect(result.provenance.consensusLevel).toBeCloseTo(0.67, 2);
    });

    it('should use custom equality function for arrays', () => {
      const results: Owned<string[], string>[] = [
        createOwned({
          value: ['a', 'b', 'c'],
          confidence: 0.9,
          scope: 'b0',
        }),
        createOwned({
          value: ['a', 'b', 'c'],
          confidence: 0.8,
          scope: 'b1',
        }),
        createOwned({
          value: ['x', 'y', 'z'],
          confidence: 0.7,
          scope: 'b2',
        }),
      ];

      const strategy = requireConsensus<string[]>(2, {
        equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      });
      const result = strategy.merge(results);

      expect(result.value.value).toEqual(['a', 'b', 'c']);
      expect(result.provenance.contributingBranches).toEqual([0, 1]);
    });

    it('should prioritize equalityFn over tolerance', () => {
      const results: Owned<number, string>[] = [
        createOwned({ value: 100, confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 101, confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 102, confidence: 0.85, scope: 'b2' }),
      ];

      // Custom function that considers all numbers equal
      const strategy = requireConsensus<number>(3, {
        tolerance: 0, // Would reject if used
        equalityFn: () => true, // All equal
      });
      const result = strategy.merge(results);

      expect(result.provenance.contributingBranches).toEqual([0, 1, 2]);
      expect(result.provenance.consensusLevel).toBe(1.0);
    });
  });

  describe('edge cases', () => {
    it('should throw on empty results', () => {
      const strategy = requireConsensus<string>(1);
      expect(() => strategy.merge([])).toThrow('Cannot merge empty results');
    });

    it('should throw when k > number of results', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'A', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'B', confidence: 0.8, scope: 'b1' }),
      ];

      const strategy = requireConsensus<string>(3); // k=3 but only 2 results

      expect(() => strategy.merge(results)).toThrow(
        'Consensus requirement impossible'
      );
    });

    it('should throw on invalid k (non-integer)', () => {
      expect(() => requireConsensus<string>(1.5)).toThrow(
        'k must be a positive integer'
      );
    });

    it('should throw on invalid k (negative)', () => {
      expect(() => requireConsensus<string>(-1)).toThrow(
        'k must be a positive integer'
      );
    });

    it('should throw on invalid k (zero)', () => {
      expect(() => requireConsensus<string>(0)).toThrow(
        'k must be a positive integer'
      );
    });
  });

  describe('conflict tracking', () => {
    it('should record conflicts when multiple groups exist', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'A', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'A', confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 'B', confidence: 0.7, scope: 'b2' }),
      ];

      const strategy = requireConsensus<string>(2);
      const result = strategy.merge(results);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].values).toEqual(['A', 'B']);
      expect(result.conflicts[0].resolution).toBe('voted');
    });

    it('should not record conflicts when unanimous', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'A', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'A', confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 'A', confidence: 0.85, scope: 'b2' }),
      ];

      const strategy = requireConsensus<string>(3);
      const result = strategy.merge(results);

      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('rejected values tracking', () => {
    it('should track rejected values that did not match consensus', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'A', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'A', confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 'B', confidence: 0.7, scope: 'b2' }),
        createOwned({ value: 'C', confidence: 0.6, scope: 'b3' }),
      ];

      const strategy = requireConsensus<string>(2);
      const result = strategy.merge(results);

      expect(result.provenance.rejectedValues).toHaveLength(2);
      expect(result.provenance.rejectedValues[0].branch).toBe(2);
      expect(result.provenance.rejectedValues[1].branch).toBe(3);
      expect(
        result.provenance.rejectedValues.every(
          (r) => r.reason === 'did not match consensus value'
        )
      ).toBe(true);
    });

    it('should not reject any values when all agree', () => {
      const results: Owned<string, string>[] = [
        createOwned({ value: 'same', confidence: 0.9, scope: 'b0' }),
        createOwned({ value: 'same', confidence: 0.8, scope: 'b1' }),
        createOwned({ value: 'same', confidence: 0.85, scope: 'b2' }),
      ];

      const strategy = requireConsensus<string>(3);
      const result = strategy.merge(results);

      expect(result.provenance.rejectedValues).toHaveLength(0);
    });
  });
});
