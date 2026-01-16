// Merge types and utilities for aggregating parallel inference results

export type {
  ConflictResolution,
  MergeConflict,
  MergeProvenance,
  MergeResult,
  MergeStrategy,
} from './types.js';

// Merge strategies
export {
  merge,
  categorical,
  continuous,
  object,
  array,
  custom,
  weightedVote,
  weightedAverage,
  fieldwise,
  concat,
  requireConsensus,
} from './strategies/index.js';

export type {
  WeightedVoteOptions,
  WeightedAverageOptions,
  WeightedAverageResult,
  FieldwiseOptions,
  ConcatOptions,
  CustomMergeFn,
  CustomOptions,
  ConsensusFailureBehavior,
  RequireConsensusOptions,
} from './strategies/index.js';

// Main merge function
export {merge as mergeResults} from './merge.js';
