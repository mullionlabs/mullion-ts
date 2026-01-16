import type {Owned} from '../owned.js';
import type {MergeStrategy, MergeResult} from './types.js';

/**
 * Merges multiple Owned values into a single result using the specified strategy.
 *
 * This is the main function for aggregating results from parallel inferences
 * (e.g., from fork operations). It applies a merge strategy to combine values
 * and provides comprehensive provenance tracking.
 *
 * **Workflow:**
 * 1. Fork multiple branches for parallel execution
 * 2. Collect Owned results from each branch
 * 3. Apply merge strategy to aggregate results
 * 4. Use merged value with confidence and provenance
 *
 * @template T - The input type (what each branch produces)
 * @template R - The result type (what the merge produces)
 * @param results - Array of Owned values to merge (typically from fork)
 * @param strategy - The merge strategy to apply
 * @returns A MergeResult containing the merged value, provenance, and conflicts
 *
 * @throws {Error} If results array is empty
 * @throws {Error} If strategy-specific validation fails
 *
 * @example
 * ```typescript
 * import { fork, merge, categorical } from '@mullion/core';
 *
 * // Fork multiple branches
 * const forkResult = await fork(ctx, {
 *   strategy: 'cache-optimized',
 *   branches: [
 *     (c) => c.infer(CategorySchema, 'Classify as urgent or normal'),
 *     (c) => c.infer(CategorySchema, 'Classify as urgent or normal'),
 *     (c) => c.infer(CategorySchema, 'Classify as urgent or normal'),
 *   ],
 * });
 *
 * // Merge results using weighted voting
 * const mergeResult = merge(
 *   forkResult.results,
 *   categorical.weightedVote()
 * );
 *
 * console.log(mergeResult.value.value); // 'urgent' or 'normal'
 * console.log(mergeResult.value.confidence); // 0-1
 * console.log(mergeResult.provenance.consensusLevel); // 0-1
 * ```
 *
 * @example
 * ```typescript
 * // Merge numeric values using weighted average
 * const forkResult = await fork(ctx, {
 *   strategy: 'fast-parallel',
 *   branches: [
 *     (c) => c.infer(PriceSchema, 'Estimate price'),
 *     (c) => c.infer(PriceSchema, 'Estimate price'),
 *     (c) => c.infer(PriceSchema, 'Estimate price'),
 *   ],
 * });
 *
 * const mergeResult = merge(
 *   forkResult.results.map(r => ({ ...r, value: r.value.price })),
 *   continuous.weightedAverage()
 * );
 *
 * console.log(mergeResult.value.value.value); // Average price
 * console.log(mergeResult.value.value.dispersion); // Std deviation
 * ```
 *
 * @example
 * ```typescript
 * // Merge objects field by field
 * const forkResult = await fork(ctx, {
 *   strategy: 'cache-optimized',
 *   branches: [
 *     (c) => c.infer(AnalysisSchema, 'Analyze document'),
 *     (c) => c.infer(AnalysisSchema, 'Analyze document'),
 *     (c) => c.infer(AnalysisSchema, 'Analyze document'),
 *   ],
 * });
 *
 * const mergeResult = merge(
 *   forkResult.results,
 *   object.fieldwise()
 * );
 *
 * console.log(mergeResult.conflicts); // Shows which fields had disagreements
 * ```
 *
 * @example
 * ```typescript
 * // Require consensus before accepting result
 * const forkResult = await fork(ctx, {
 *   strategy: 'fast-parallel',
 *   branches: [
 *     (c) => c.infer(DiagnosisSchema, 'Medical diagnosis'),
 *     (c) => c.infer(DiagnosisSchema, 'Medical diagnosis'),
 *     (c) => c.infer(DiagnosisSchema, 'Medical diagnosis'),
 *   ],
 * });
 *
 * const mergeResult = merge(
 *   forkResult.results,
 *   requireConsensus(2, { onFailure: 'error' })
 * );
 *
 * // Only succeeds if at least 2 branches agree
 * ```
 *
 * @example
 * ```typescript
 * // Custom merge logic
 * const forkResult = await fork(ctx, {
 *   strategy: 'cache-optimized',
 *   branches: [
 *     (c) => c.infer(NumberSchema, 'Generate random number'),
 *     (c) => c.infer(NumberSchema, 'Generate random number'),
 *     (c) => c.infer(NumberSchema, 'Generate random number'),
 *   ],
 * });
 *
 * // Take median instead of average
 * const mergeResult = merge(
 *   forkResult.results,
 *   custom((results) => {
 *     const values = results.map(r => r.value).sort((a, b) => a - b);
 *     return values[Math.floor(values.length / 2)];
 *   })
 * );
 * ```
 *
 * @see {@link MergeStrategy} For available merge strategies
 * @see {@link MergeResult} For result structure
 * @see {@link fork} For creating parallel branches
 */
export function merge<T, R>(
  results: Owned<T, string>[],
  strategy: MergeStrategy<T, R>,
): MergeResult<R> {
  // Delegate to strategy's merge implementation
  return strategy.merge(results);
}
