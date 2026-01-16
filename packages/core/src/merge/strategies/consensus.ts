import {createOwned} from '../../owned.js';
import type {Owned} from '../../owned.js';
import type {MergeStrategy, MergeResult} from '../types.js';

/**
 * Behavior when consensus requirement is not met.
 */
export type ConsensusFailureBehavior = 'low-confidence' | 'error';

/**
 * Options for consensus requirements.
 */
export interface RequireConsensusOptions<T> {
  /**
   * What to do when consensus requirement is not met.
   * - 'low-confidence': Return result with confidence set to 0
   * - 'error': Throw an error
   *
   * @default 'low-confidence'
   */
  onFailure?: ConsensusFailureBehavior;

  /**
   * Tolerance for considering values as "equal" (for consensus calculation).
   * Only applies to numeric types.
   *
   * For numbers: |a - b| <= tolerance means they agree
   * For other types: uses strict equality
   *
   * @default 0 (strict equality)
   */
  tolerance?: number;

  /**
   * Custom equality function for determining if two values agree.
   * Takes precedence over tolerance.
   *
   * @param a - First value
   * @param b - Second value
   * @returns true if values are considered equal for consensus
   */
  equalityFn?: (a: T, b: T) => boolean;
}

/**
 * Creates a merge strategy that requires a minimum number of branches
 * to agree on the same value.
 *
 * This is useful for high-stakes decisions where you want strong agreement
 * among multiple LLM inferences before accepting a result.
 *
 * **Consensus calculation:**
 * - Groups values by equality (using tolerance or custom function)
 * - Counts how many branches produced each unique value
 * - Checks if any value group has >= k branches
 *
 * **Use cases:**
 * - Critical decisions requiring agreement (medical diagnosis, financial advice)
 * - Filtering out low-quality or uncertain results
 * - Ensuring robustness against hallucinations
 *
 * @template T - The type of values to check consensus on
 * @param k - Minimum number of branches that must agree (1 <= k <= n)
 * @param options - Configuration options
 * @returns A MergeStrategy that enforces consensus requirements
 *
 * @example
 * ```typescript
 * // Require at least 2 out of 3 branches to agree
 * const strategy = requireConsensus<string>(2);
 *
 * const results = [
 *   { value: 'yes', confidence: 0.9, __scope: 'b0', traceId: 't1' },
 *   { value: 'yes', confidence: 0.8, __scope: 'b1', traceId: 't2' },
 *   { value: 'no', confidence: 0.7, __scope: 'b2', traceId: 't3' },
 * ];
 *
 * const result = strategy.merge(results);
 * // 'yes' appears 2 times, consensus met
 * // result.value.value === 'yes'
 * // result.value.confidence === 0.85 (average of agreeing branches)
 * ```
 *
 * @example
 * ```typescript
 * // Require consensus on numbers with tolerance
 * const strategy = requireConsensus<number>(3, {
 *   tolerance: 0.1 // Values within 0.1 are considered equal
 * });
 *
 * const results = [
 *   { value: 100.0, confidence: 0.9, __scope: 'b0', traceId: 't1' },
 *   { value: 100.05, confidence: 0.8, __scope: 'b1', traceId: 't2' },
 *   { value: 100.08, confidence: 0.85, __scope: 'b2', traceId: 't3' },
 * ];
 *
 * const result = strategy.merge(results);
 * // All values within tolerance, consensus met
 * ```
 *
 * @example
 * ```typescript
 * // Throw error if consensus not met
 * const strategy = requireConsensus<string>(2, {
 *   onFailure: 'error'
 * });
 *
 * const results = [
 *   { value: 'A', confidence: 0.9, __scope: 'b0', traceId: 't1' },
 *   { value: 'B', confidence: 0.8, __scope: 'b1', traceId: 't2' },
 *   { value: 'C', confidence: 0.7, __scope: 'b2', traceId: 't3' },
 * ];
 *
 * // Throws: "Consensus requirement not met: needed 2 agreeing branches, got max 1"
 * strategy.merge(results);
 * ```
 *
 * @example
 * ```typescript
 * // Custom equality for objects
 * const strategy = requireConsensus<{category: string}>(2, {
 *   equalityFn: (a, b) => a.category === b.category
 * });
 * ```
 */
export function requireConsensus<T>(
  k: number,
  options: RequireConsensusOptions<T> = {},
): MergeStrategy<T, T> {
  const {onFailure = 'low-confidence', tolerance = 0, equalityFn} = options;

  // Validate k
  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`k must be a positive integer, got ${k}`);
  }

  return {
    name: 'require-consensus',

    merge(results: Owned<T, string>[]): MergeResult<T> {
      if (results.length === 0) {
        throw new Error('Cannot merge empty results array');
      }

      if (k > results.length) {
        throw new Error(
          `Consensus requirement impossible: k=${k} but only ${results.length} results provided`,
        );
      }

      // Determine equality function
      const isEqual: (a: T, b: T) => boolean =
        equalityFn ??
        ((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') {
            return Math.abs(a - b) <= tolerance;
          }
          return a === b;
        });

      // Group results by value (using equality function)
      const groups = new Map<
        number,
        {
          value: T;
          results: Owned<T, string>[];
          indices: number[];
        }
      >();

      results.forEach((result, idx) => {
        // Find if this value matches any existing group
        let foundGroup = false;

        for (const group of groups.values()) {
          if (isEqual(result.value, group.value)) {
            group.results.push(result);
            group.indices.push(idx);
            foundGroup = true;
            break;
          }
        }

        if (!foundGroup) {
          // Create new group
          groups.set(groups.size, {
            value: result.value,
            results: [result],
            indices: [idx],
          });
        }
      });

      // Find group with most agreement
      let largestGroup: {
        value: T;
        results: Owned<T, string>[];
        indices: number[];
      } | null = null;
      let maxAgreement = 0;

      for (const group of groups.values()) {
        if (group.results.length > maxAgreement) {
          maxAgreement = group.results.length;
          largestGroup = group;
        }
      }

      if (!largestGroup) {
        throw new Error('Failed to find any value group');
      }

      // Check if consensus requirement is met
      const consensusMet = maxAgreement >= k;

      if (!consensusMet && onFailure === 'error') {
        throw new Error(
          `Consensus requirement not met: needed ${k} agreeing branches, got max ${maxAgreement}`,
        );
      }

      // Calculate confidence
      const avgConfidence =
        largestGroup.results.reduce((sum, r) => sum + r.confidence, 0) /
        largestGroup.results.length;

      // If consensus not met and onFailure is 'low-confidence', set confidence to 0
      const finalConfidence = consensusMet ? avgConfidence : 0;

      // Calculate consensus level (proportion of branches that agreed)
      const consensusLevel = maxAgreement / results.length;

      // Identify rejected values (branches not in largest group)
      const rejectedValues: {
        branch: number;
        value: unknown;
        reason: string;
      }[] = [];

      results.forEach((result, idx) => {
        if (!largestGroup.indices.includes(idx)) {
          rejectedValues.push({
            branch: idx,
            value: result.value,
            reason: 'did not match consensus value',
          });
        }
      });

      // Record conflicts if there were multiple groups
      const conflicts =
        groups.size > 1
          ? [
              {
                values: Array.from(groups.values()).map((g) => g.value),
                resolution: 'voted' as const,
              },
            ]
          : [];

      return {
        value: createOwned({
          value: largestGroup.value,
          confidence: finalConfidence,
          scope: 'merged',
          traceId: `merge-consensus-${Date.now()}`,
        }),
        provenance: {
          contributingBranches: largestGroup.indices,
          rejectedValues,
          consensusLevel,
        },
        conflicts,
      };
    },
  };
}
