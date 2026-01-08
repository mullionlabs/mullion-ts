import type { Owned } from '../owned.js';

/**
 * Represents how values from multiple branches should be resolved when they disagree.
 *
 * @example
 * ```typescript
 * // For categorical values (voted by confidence)
 * resolution: 'voted'
 *
 * // For numeric values (averaged by confidence)
 * resolution: 'averaged'
 *
 * // When first value is taken
 * resolution: 'first'
 *
 * // When value is rejected due to low confidence
 * resolution: 'rejected'
 * ```
 */
export type ConflictResolution = 'voted' | 'averaged' | 'first' | 'rejected';

/**
 * Describes a conflict that occurred during merge when branches produced different values.
 *
 * Conflicts are inevitable when running multiple LLM inferences in parallel.
 * This interface provides transparency about disagreements and how they were resolved.
 *
 * @template T - The type of values in conflict
 *
 * @example
 * ```typescript
 * const conflict: MergeConflict<string> = {
 *   field: 'category',
 *   values: ['urgent', 'normal', 'urgent'],
 *   resolution: 'voted' // 'urgent' won with 2/3 votes
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Top-level conflict (no specific field)
 * const conflict: MergeConflict<number> = {
 *   values: [42.5, 38.2, 40.1],
 *   resolution: 'averaged' // resulted in 40.27
 * };
 * ```
 */
export interface MergeConflict<T = unknown> {
  /**
   * The field name where conflict occurred (for object merges).
   * Undefined for top-level value conflicts.
   */
  field?: string;

  /**
   * The conflicting values from different branches.
   * Array length matches number of branches that produced this value.
   */
  values: T[];

  /**
   * How the conflict was resolved by the merge strategy.
   */
  resolution: ConflictResolution;
}

/**
 * Tracks which branches contributed to the final merged result.
 *
 * Provenance is critical for understanding why a merged value is what it is,
 * and for auditing decisions made by merge strategies.
 *
 * @example
 * ```typescript
 * const provenance: MergeProvenance = {
 *   contributingBranches: [0, 2], // branches 0 and 2 contributed
 *   rejectedValues: [
 *     {
 *       branch: 1,
 *       value: 'low-quality-result',
 *       reason: 'confidence below threshold (0.3 < 0.5)'
 *     }
 *   ],
 *   consensusLevel: 0.85 // 85% agreement among branches
 * };
 * ```
 */
export interface MergeProvenance {
  /**
   * Indices of branches that contributed to the final result.
   * Branch indices correspond to the order in fork() branches array.
   *
   * @example
   * ```typescript
   * // If fork had 3 branches and all contributed:
   * contributingBranches: [0, 1, 2]
   *
   * // If only branches 0 and 2 were used (branch 1 rejected):
   * contributingBranches: [0, 2]
   * ```
   */
  contributingBranches: number[];

  /**
   * Values that were rejected during merge and the reasons why.
   * Useful for debugging and understanding merge behavior.
   */
  rejectedValues: {
    /**
     * Index of the branch that produced this value.
     */
    branch: number;

    /**
     * The value that was rejected.
     */
    value: unknown;

    /**
     * Human-readable reason for rejection.
     *
     * @example
     * - "confidence below threshold (0.3 < 0.5)"
     * - "outlier detected (3 std deviations)"
     * - "schema validation failed"
     */
    reason: string;
  }[];

  /**
   * Consensus level from 0 to 1 indicating agreement among branches.
   *
   * - `1.0` = Perfect agreement (all branches returned same value)
   * - `0.5` = Split decision (50/50)
   * - `0.0` = No agreement (all different values)
   *
   * Calculation depends on merge strategy:
   * - **Voting**: ratio of votes for winning value
   * - **Averaging**: inverse of coefficient of variation
   * - **Object fieldwise**: average consensus across fields
   *
   * @example
   * ```typescript
   * if (result.provenance.consensusLevel < 0.6) {
   *   console.warn('Low consensus - manual review recommended');
   * }
   * ```
   */
  consensusLevel: number;
}

/**
 * Result of merging values from multiple branches.
 *
 * Contains the merged value, provenance information, and any conflicts
 * that occurred during the merge process.
 *
 * @template T - The type of the merged value
 *
 * @example
 * ```typescript
 * const mergeResult: MergeResult<string> = {
 *   value: {
 *     value: 'urgent',
 *     confidence: 0.87,
 *     __scope: 'merged',
 *     traceId: 'merge-abc123'
 *   },
 *   provenance: {
 *     contributingBranches: [0, 2],
 *     rejectedValues: [],
 *     consensusLevel: 0.85
 *   },
 *   conflicts: []
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Result with conflicts
 * const mergeResult: MergeResult<{ category: string; priority: number }> = {
 *   value: {
 *     value: { category: 'urgent', priority: 8 },
 *     confidence: 0.75,
 *     __scope: 'merged',
 *     traceId: 'merge-xyz789'
 *   },
 *   provenance: {
 *     contributingBranches: [0, 1, 2],
 *     rejectedValues: [],
 *     consensusLevel: 0.67
 *   },
 *   conflicts: [
 *     {
 *       field: 'category',
 *       values: ['urgent', 'normal', 'urgent'],
 *       resolution: 'voted'
 *     }
 *   ]
 * };
 * ```
 */
export interface MergeResult<T> {
  /**
   * The merged value wrapped in an Owned type with scope 'merged'.
   *
   * Confidence reflects the merge strategy's certainty about this result,
   * typically derived from consensus level and individual branch confidences.
   */
  value: Owned<T, 'merged'>;

  /**
   * Provenance information tracking which branches contributed
   * and how consensus was achieved.
   */
  provenance: MergeProvenance;

  /**
   * List of conflicts encountered during merge.
   * Empty array indicates no conflicts (perfect agreement).
   */
  conflicts: MergeConflict[];
}

/**
 * Defines how to merge values from multiple branches into a single result.
 *
 * A merge strategy encapsulates the algorithm for aggregating parallel inference results.
 * Different strategies are appropriate for different data types and use cases.
 *
 * @template T - The input type (what each branch produces)
 * @template R - The result type (what the merge produces)
 *
 * @example
 * ```typescript
 * // Strategy for categorical voting
 * const votingStrategy: MergeStrategy<string, string> = {
 *   name: 'weighted-vote',
 *   merge: (results) => {
 *     // Count votes weighted by confidence
 *     const votes = new Map<string, number>();
 *     for (const result of results) {
 *       const current = votes.get(result.value) ?? 0;
 *       votes.set(result.value, current + result.confidence);
 *     }
 *
 *     // Find winner
 *     const [winningValue, totalVotes] = [...votes.entries()]
 *       .sort((a, b) => b[1] - a[1])[0];
 *
 *     return {
 *       value: createOwned({
 *         value: winningValue,
 *         confidence: totalVotes / results.length,
 *         scope: 'merged'
 *       }),
 *       provenance: {
 *         contributingBranches: results.map((_, i) => i),
 *         rejectedValues: [],
 *         consensusLevel: totalVotes / results.reduce((sum, r) => sum + r.confidence, 0)
 *       },
 *       conflicts: []
 *     };
 *   }
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Strategy for numeric averaging
 * const averagingStrategy: MergeStrategy<number, number> = {
 *   name: 'weighted-average',
 *   merge: (results) => {
 *     const totalWeight = results.reduce((sum, r) => sum + r.confidence, 0);
 *     const weightedSum = results.reduce((sum, r) => sum + r.value * r.confidence, 0);
 *     const average = weightedSum / totalWeight;
 *
 *     return {
 *       value: createOwned({
 *         value: average,
 *         confidence: totalWeight / results.length,
 *         scope: 'merged'
 *       }),
 *       provenance: {
 *         contributingBranches: results.map((_, i) => i),
 *         rejectedValues: [],
 *         consensusLevel: 0.8 // calculated based on variance
 *       },
 *       conflicts: []
 *     };
 *   }
 * };
 * ```
 */
export interface MergeStrategy<T, R> {
  /**
   * Human-readable name for this strategy.
   *
   * @example
   * - "weighted-vote"
   * - "weighted-average"
   * - "fieldwise-merge"
   * - "array-concat"
   * - "require-consensus"
   */
  name: string;

  /**
   * The merge function that aggregates multiple Owned values into one.
   *
   * @param results - Array of Owned values from parallel branches, all from the same fork
   * @returns A MergeResult containing the merged value, provenance, and conflicts
   *
   * @throws {Error} If results array is empty
   * @throws {Error} If strategy-specific validation fails (e.g., consensus not met)
   */
  merge(results: Owned<T, string>[]): MergeResult<R>;
}
