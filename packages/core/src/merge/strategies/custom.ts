import { createOwned } from '../../owned.js';
import type { Owned } from '../../owned.js';
import type { MergeStrategy, MergeResult } from '../types.js';

/**
 * User-provided custom merge function.
 *
 * @template T - The input type from branches
 * @template R - The result type after merging
 * @param results - Array of Owned values from parallel branches
 * @returns The merged value (unwrapped - will be wrapped in Owned automatically)
 */
export type CustomMergeFn<T, R> = (results: Owned<T, string>[]) => R;

/**
 * Options for custom merge strategy.
 */
export interface CustomOptions {
  /**
   * Custom function to calculate confidence for the merged result.
   * If not provided, uses average confidence of input results.
   *
   * @param results - Input results
   * @param mergedValue - The value returned by the merge function
   * @returns Confidence score (0-1)
   */
  calculateConfidence?: <T, R>(
    results: Owned<T, string>[],
    mergedValue: R
  ) => number;

  /**
   * Custom function to calculate consensus level.
   * If not provided, defaults to 1.0 (assuming custom logic handles this).
   *
   * @param results - Input results
   * @param mergedValue - The value returned by the merge function
   * @returns Consensus level (0-1)
   */
  calculateConsensus?: <T, R>(
    results: Owned<T, string>[],
    mergedValue: R
  ) => number;
}

/**
 * Creates a merge strategy with custom user-provided logic.
 *
 * Allows full control over how values are merged, with automatic
 * wrapping in Owned type and provenance tracking.
 *
 * **Use cases:**
 * - Domain-specific merge logic not covered by built-in strategies
 * - Complex aggregations requiring custom algorithms
 * - Experimental merge approaches
 *
 * **Note:** The custom function receives Owned values and should return
 * the unwrapped merged value (R). The strategy automatically wraps it
 * in Owned<R, 'merged'>.
 *
 * @template T - The input type from branches
 * @template R - The result type after merging
 * @param mergeFn - User-provided merge function
 * @param options - Configuration options
 * @returns A MergeStrategy with custom logic
 *
 * @example
 * ```typescript
 * // Median strategy for numbers
 * const medianStrategy = custom<number, number>((results) => {
 *   const values = results.map(r => r.value).sort((a, b) => a - b);
 *   const mid = Math.floor(values.length / 2);
 *   return values.length % 2 === 0
 *     ? (values[mid - 1] + values[mid]) / 2
 *     : values[mid];
 * });
 *
 * const result = medianStrategy.merge([
 *   { value: 10, confidence: 0.9, __scope: 'b0', traceId: 't1' },
 *   { value: 20, confidence: 0.8, __scope: 'b1', traceId: 't2' },
 *   { value: 30, confidence: 0.7, __scope: 'b2', traceId: 't3' },
 * ]);
 *
 * // result.value.value === 20 (median)
 * ```
 *
 * @example
 * ```typescript
 * // Most common prefix strategy for strings
 * const commonPrefixStrategy = custom<string, string>(
 *   (results) => {
 *     const values = results.map(r => r.value);
 *     let prefix = values[0];
 *
 *     for (const value of values.slice(1)) {
 *       let i = 0;
 *       while (i < prefix.length && i < value.length && prefix[i] === value[i]) {
 *         i++;
 *       }
 *       prefix = prefix.slice(0, i);
 *     }
 *
 *     return prefix;
 *   },
 *   {
 *     calculateConfidence: (results, merged) => {
 *       // Confidence based on how much of original strings we kept
 *       const avgLength = results.reduce((sum, r) => sum + r.value.length, 0) / results.length;
 *       return merged.length / avgLength;
 *     }
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Ensemble strategy: keep all values with metadata
 * interface EnsembleResult<T> {
 *   values: T[];
 *   confidences: number[];
 *   recommendation: T;
 * }
 *
 * const ensembleStrategy = custom<string, EnsembleResult<string>>((results) => {
 *   return {
 *     values: results.map(r => r.value),
 *     confidences: results.map(r => r.confidence),
 *     recommendation: results.reduce((best, r) =>
 *       r.confidence > best.confidence ? r : best
 *     ).value
 *   };
 * });
 * ```
 */
export function custom<T, R>(
  mergeFn: CustomMergeFn<T, R>,
  options: CustomOptions = {}
): MergeStrategy<T, R> {
  const {
    calculateConfidence = (results) =>
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
    calculateConsensus = () => 1.0,
  } = options;

  return {
    name: 'custom',

    merge(results: Owned<T, string>[]): MergeResult<R> {
      if (results.length === 0) {
        throw new Error('Cannot merge empty results array');
      }

      // Execute user's merge function
      let mergedValue: R;
      try {
        mergedValue = mergeFn(results);
      } catch (error) {
        throw new Error(
          `Custom merge function failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Calculate confidence and consensus
      const confidence = calculateConfidence(results, mergedValue);
      const consensusLevel = calculateConsensus(results, mergedValue);

      // Validate confidence is in range
      if (confidence < 0 || confidence > 1) {
        throw new Error(
          `Custom calculateConfidence returned invalid value: ${confidence} (must be 0-1)`
        );
      }

      // Validate consensus is in range
      if (consensusLevel < 0 || consensusLevel > 1) {
        throw new Error(
          `Custom calculateConsensus returned invalid value: ${consensusLevel} (must be 0-1)`
        );
      }

      // All branches contributed (custom logic decides what to do with them)
      const contributingBranches = results.map((_, idx) => idx);

      return {
        value: createOwned({
          value: mergedValue,
          confidence,
          scope: 'merged',
          traceId: `merge-custom-${Date.now()}`,
        }),
        provenance: {
          contributingBranches,
          rejectedValues: [], // Custom function handles rejection internally
          consensusLevel,
        },
        conflicts: [], // Custom function defines what counts as conflict
      };
    },
  };
}
