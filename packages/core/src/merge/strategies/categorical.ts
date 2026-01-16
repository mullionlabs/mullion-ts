import {createOwned} from '../../owned.js';
import type {Owned} from '../../owned.js';
import type {MergeStrategy, MergeResult} from '../types.js';

/**
 * Options for configuring weighted vote strategy.
 */
export interface WeightedVoteOptions {
  /**
   * Minimum confidence threshold for a value to be considered.
   * Values below this threshold are rejected.
   *
   * @default 0
   */
  minConfidence?: number;

  /**
   * How to handle ties when multiple values have equal votes.
   * - 'first': Use the first value that appears
   * - 'highest-confidence': Use the value with highest individual confidence
   *
   * @default 'highest-confidence'
   */
  tiebreaker?: 'first' | 'highest-confidence';
}

/**
 * Creates a merge strategy that votes on discrete categorical values,
 * weighted by confidence scores.
 *
 * Each branch's value gets a vote weighted by its confidence.
 * The value with the most weighted votes wins.
 *
 * **Use cases:**
 * - Classification results (category labels)
 * - Discrete choices (yes/no, option A/B/C)
 * - Enum values
 *
 * **Confidence calculation:**
 * Final confidence = (total votes for winner) / (sum of all confidences)
 *
 * **Consensus calculation:**
 * Consensus = (votes for winner) / (total possible votes)
 *
 * @template T - The type of categorical values to vote on
 * @param options - Configuration options
 * @returns A MergeStrategy that performs weighted voting
 *
 * @example
 * ```typescript
 * const results = [
 *   { value: 'urgent', confidence: 0.9, __scope: 'branch-0', traceId: 't1' },
 *   { value: 'normal', confidence: 0.6, __scope: 'branch-1', traceId: 't2' },
 *   { value: 'urgent', confidence: 0.8, __scope: 'branch-2', traceId: 't3' },
 * ];
 *
 * const strategy = categorical.weightedVote<string>();
 * const result = strategy.merge(results);
 *
 * // result.value.value === 'urgent' (0.9 + 0.8 = 1.7 votes vs 0.6 for 'normal')
 * // result.value.confidence === 0.74 (1.7 / 2.3)
 * // result.provenance.consensusLevel === 0.74 (1.7 / 2.3)
 * ```
 *
 * @example
 * ```typescript
 * // With minimum confidence threshold
 * const strategy = categorical.weightedVote<string>({
 *   minConfidence: 0.7
 * });
 *
 * const results = [
 *   { value: 'A', confidence: 0.9, __scope: 'b0', traceId: 't1' },
 *   { value: 'B', confidence: 0.5, __scope: 'b1', traceId: 't2' }, // Rejected
 *   { value: 'A', confidence: 0.8, __scope: 'b2', traceId: 't3' },
 * ];
 *
 * const result = strategy.merge(results);
 * // 'B' is rejected, only 'A' votes count
 * // result.provenance.rejectedValues contains branch 1
 * ```
 */
export function weightedVote<T>(
  options: WeightedVoteOptions = {},
): MergeStrategy<T, T> {
  const {minConfidence = 0, tiebreaker = 'highest-confidence'} = options;

  return {
    name: 'weighted-vote',

    merge(results: Owned<T, string>[]): MergeResult<T> {
      if (results.length === 0) {
        throw new Error('Cannot merge empty results array');
      }

      // Filter results by confidence threshold
      const rejectedValues: {
        branch: number;
        value: unknown;
        reason: string;
      }[] = [];

      const validResults = results.filter((result, index) => {
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

      // Count votes weighted by confidence
      const votes = new Map<
        T,
        {weight: number; indices: number[]; maxConfidence: number}
      >();

      validResults.forEach((result) => {
        const originalIndex = results.indexOf(result);
        const current = votes.get(result.value);

        if (current) {
          current.weight += result.confidence;
          current.indices.push(originalIndex);
          current.maxConfidence = Math.max(
            current.maxConfidence,
            result.confidence,
          );
        } else {
          votes.set(result.value, {
            weight: result.confidence,
            indices: [originalIndex],
            maxConfidence: result.confidence,
          });
        }
      });

      // Find winner
      let winningValue: T | undefined;
      let winningVotes:
        | {
            weight: number;
            indices: number[];
            maxConfidence: number;
          }
        | undefined;

      for (const [value, voteData] of votes.entries()) {
        if (!winningVotes || voteData.weight > winningVotes.weight) {
          winningValue = value;
          winningVotes = voteData;
        } else if (voteData.weight === winningVotes.weight) {
          // Handle tie
          if (tiebreaker === 'highest-confidence') {
            if (voteData.maxConfidence > winningVotes.maxConfidence) {
              winningValue = value;
              winningVotes = voteData;
            }
          }
          // 'first' tiebreaker: keep current winner (first encountered)
        }
      }

      if (winningValue === undefined || !winningVotes) {
        throw new Error('Failed to determine winning value');
      }

      // Calculate confidence and consensus
      const totalWeight = validResults.reduce(
        (sum, r) => sum + r.confidence,
        0,
      );
      const confidence = winningVotes.weight / totalWeight;
      const consensusLevel = winningVotes.weight / totalWeight;

      // Determine contributing branches
      const contributingBranches = winningVotes.indices;

      return {
        value: createOwned({
          value: winningValue,
          confidence,
          scope: 'merged',
          traceId: `merge-vote-${Date.now()}`,
        }),
        provenance: {
          contributingBranches,
          rejectedValues,
          consensusLevel,
        },
        conflicts:
          votes.size > 1
            ? [
                {
                  values: Array.from(votes.keys()),
                  resolution: 'voted',
                },
              ]
            : [],
      };
    },
  };
}

/**
 * Namespace for categorical merge strategies.
 */
export const categorical = {
  weightedVote,
};
