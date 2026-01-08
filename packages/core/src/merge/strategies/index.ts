// Merge strategies for aggregating parallel inference results

// Categorical strategies (voting)
export { categorical, weightedVote } from './categorical.js';
export type { WeightedVoteOptions } from './categorical.js';

// Continuous strategies (averaging)
export { continuous, weightedAverage } from './continuous.js';
export type {
  WeightedAverageOptions,
  WeightedAverageResult,
} from './continuous.js';

// Object strategies (field-by-field merging)
export { object, fieldwise } from './object.js';
export type { FieldwiseOptions } from './object.js';

// Array strategies (concatenation)
export { array, concat } from './array.js';
export type { ConcatOptions } from './array.js';

// Custom strategy factory
export { custom } from './custom.js';
export type { CustomMergeFn, CustomOptions } from './custom.js';

// Consensus requirements
export { requireConsensus } from './consensus.js';
export type {
  ConsensusFailureBehavior,
  RequireConsensusOptions,
} from './consensus.js';

// Import for merge namespace
import { categorical } from './categorical.js';
import { continuous } from './continuous.js';
import { object } from './object.js';
import { array } from './array.js';
import { custom } from './custom.js';
import { requireConsensus } from './consensus.js';

/**
 * Namespace containing all built-in merge strategies.
 *
 * Provides type-safe algorithms for aggregating parallel inference results
 * from fork operations.
 *
 * @example
 * ```typescript
 * import { merge } from '@mullion/core';
 *
 * // Categorical voting
 * const votingStrategy = merge.categorical.weightedVote();
 *
 * // Numeric averaging
 * const averagingStrategy = merge.continuous.weightedAverage();
 *
 * // Object field-by-field
 * const fieldwiseStrategy = merge.object.fieldwise();
 *
 * // Array concatenation
 * const concatStrategy = merge.array.concat();
 *
 * // Custom logic
 * const customStrategy = merge.custom((results) => {
 *   // Your merge logic here
 * });
 *
 * // Consensus requirements
 * const consensusStrategy = merge.requireConsensus(2);
 * ```
 */
export const merge = {
  categorical,
  continuous,
  object,
  array,
  custom,
  requireConsensus,
};
