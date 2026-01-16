import {createOwned} from '../../owned.js';
import type {Owned} from '../../owned.js';
import type {MergeStrategy, MergeResult} from '../types.js';

/**
 * Result of weighted average merge that includes dispersion metrics.
 */
export interface WeightedAverageResult {
  /**
   * The weighted average value.
   */
  value: number;

  /**
   * Standard deviation of the values (unweighted).
   * Indicates spread/disagreement among branches.
   *
   * Higher dispersion = less agreement = lower confidence in result.
   */
  dispersion: number;
}

/**
 * Options for configuring weighted average strategy.
 */
export interface WeightedAverageOptions {
  /**
   * Minimum confidence threshold for a value to be considered.
   * Values below this threshold are rejected.
   *
   * @default 0
   */
  minConfidence?: number;

  /**
   * Number of standard deviations beyond which to reject outliers.
   * Set to 0 to disable outlier detection.
   *
   * @default 0 (disabled)
   * @example 3 - Reject values > 3 standard deviations from mean
   */
  outlierThreshold?: number;
}

/**
 * Creates a merge strategy that averages numeric values,
 * weighted by confidence scores.
 *
 * Each branch's value contributes to the average proportionally to its confidence.
 * Also calculates dispersion (standard deviation) as an uncertainty indicator.
 *
 * **Use cases:**
 * - Numeric predictions (prices, quantities, scores)
 * - Continuous measurements
 * - Probability estimates
 *
 * **Confidence calculation:**
 * Final confidence = (average confidence) * (1 - normalized dispersion)
 *
 * **Consensus calculation:**
 * Consensus = 1 - (coefficient of variation)
 * Where coefficient of variation = stddev / mean (when mean != 0)
 *
 * @param options - Configuration options
 * @returns A MergeStrategy that performs weighted averaging
 *
 * @example
 * ```typescript
 * const results = [
 *   { value: 42.5, confidence: 0.9, __scope: 'branch-0', traceId: 't1' },
 *   { value: 38.2, confidence: 0.7, __scope: 'branch-1', traceId: 't2' },
 *   { value: 40.1, confidence: 0.8, __scope: 'branch-2', traceId: 't3' },
 * ];
 *
 * const strategy = continuous.weightedAverage();
 * const result = strategy.merge(results);
 *
 * // Weighted average:
 * // (42.5*0.9 + 38.2*0.7 + 40.1*0.8) / (0.9 + 0.7 + 0.8) = 40.56
 * //
 * // result.value.value.value === 40.56
 * // result.value.value.dispersion === 2.15 (standard deviation)
 * ```
 *
 * @example
 * ```typescript
 * // With outlier detection
 * const strategy = continuous.weightedAverage({
 *   outlierThreshold: 2 // Reject values > 2 std devs from mean
 * });
 *
 * const results = [
 *   { value: 100, confidence: 0.9, __scope: 'b0', traceId: 't1' },
 *   { value: 102, confidence: 0.8, __scope: 'b1', traceId: 't2' },
 *   { value: 500, confidence: 0.7, __scope: 'b2', traceId: 't3' }, // Outlier
 * ];
 *
 * const result = strategy.merge(results);
 * // The 500 value is rejected as outlier
 * // result.provenance.rejectedValues contains branch 2
 * ```
 */
export function weightedAverage(
  options: WeightedAverageOptions = {},
): MergeStrategy<number, WeightedAverageResult> {
  const {minConfidence = 0, outlierThreshold = 0} = options;

  return {
    name: 'weighted-average',

    merge(
      results: Owned<number, string>[],
    ): MergeResult<WeightedAverageResult> {
      if (results.length === 0) {
        throw new Error('Cannot merge empty results array');
      }

      // Filter by confidence threshold
      const rejectedValues: {
        branch: number;
        value: unknown;
        reason: string;
      }[] = [];

      let validResults = results.filter((result, index) => {
        if (result.confidence < minConfidence) {
          rejectedValues.push({
            branch: index,
            value: result.value,
            reason: `confidence below threshold (${result.confidence} < ${minConfidence})`,
          });
          return false;
        }
        return true;
      });

      if (validResults.length === 0) {
        throw new Error(
          `All results rejected: confidence below threshold (${minConfidence})`,
        );
      }

      // Detect and reject outliers if enabled
      if (outlierThreshold > 0 && validResults.length >= 3) {
        const values = validResults.map((r) => r.value);
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance =
          values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
          values.length;
        const stdDev = Math.sqrt(variance);

        validResults = validResults.filter((result) => {
          const originalIndex = results.indexOf(result);
          const deviations = Math.abs(result.value - mean) / stdDev;

          if (deviations > outlierThreshold) {
            rejectedValues.push({
              branch: originalIndex,
              value: result.value,
              reason: `outlier detected (${deviations.toFixed(2)} std deviations from mean)`,
            });
            return false;
          }
          return true;
        });

        if (validResults.length === 0) {
          throw new Error('All results rejected as outliers');
        }
      }

      // Calculate weighted average
      const totalWeight = validResults.reduce(
        (sum, r) => sum + r.confidence,
        0,
      );
      const weightedSum = validResults.reduce(
        (sum, r) => sum + r.value * r.confidence,
        0,
      );
      const average = weightedSum / totalWeight;

      // Calculate dispersion (unweighted standard deviation)
      const values = validResults.map((r) => r.value);
      const variance =
        values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) /
        values.length;
      const dispersion = Math.sqrt(variance);

      // Calculate confidence based on average confidence and dispersion
      const avgConfidence = totalWeight / validResults.length;

      // Normalize dispersion: if values are far from mean, reduce confidence
      // Use coefficient of variation (CV) as normalized dispersion
      const cv = average !== 0 ? dispersion / Math.abs(average) : dispersion;
      const dispersionPenalty = Math.min(cv, 1); // Cap at 1
      const confidence = avgConfidence * (1 - dispersionPenalty * 0.5); // Max 50% penalty

      // Consensus: 1 - coefficient of variation (capped at [0,1])
      const consensusLevel = Math.max(0, Math.min(1, 1 - cv));

      // All valid branches contributed
      const contributingBranches = validResults.map((r) => results.indexOf(r));

      return {
        value: createOwned({
          value: {
            value: average,
            dispersion,
          },
          confidence: Math.max(0, Math.min(1, confidence)),
          scope: 'merged',
          traceId: `merge-avg-${Date.now()}`,
        }),
        provenance: {
          contributingBranches,
          rejectedValues,
          consensusLevel,
        },
        conflicts:
          dispersion > 0
            ? [
                {
                  values: validResults.map((r) => r.value),
                  resolution: 'averaged',
                },
              ]
            : [],
      };
    },
  };
}

/**
 * Namespace for continuous merge strategies.
 */
export const continuous = {
  weightedAverage,
};
