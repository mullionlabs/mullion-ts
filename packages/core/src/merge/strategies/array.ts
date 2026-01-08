import { createOwned } from '../../owned.js';
import type { Owned } from '../../owned.js';
import type { MergeStrategy, MergeResult } from '../types.js';

/**
 * Options for configuring array concatenation strategy.
 */
export interface ConcatOptions<T> {
  /**
   * Minimum confidence threshold for a branch to be considered.
   *
   * @default 0
   */
  minConfidence?: number;

  /**
   * Whether to remove duplicate items from the concatenated array.
   *
   * @default true
   */
  removeDuplicates?: boolean;

  /**
   * Custom equality function for duplicate detection.
   * Only used if removeDuplicates is true.
   *
   * @default JSON.stringify comparison
   */
  equalityFn?: (a: T, b: T) => boolean;

  /**
   * Maximum number of items to include in final array.
   * Items are kept based on the confidence of their source branch.
   *
   * @default undefined (no limit)
   */
  maxItems?: number;
}

/**
 * Creates a merge strategy that concatenates arrays from multiple branches.
 *
 * Combines all array results into a single array, optionally removing duplicates.
 * Useful when each branch might discover different items.
 *
 * **Use cases:**
 * - Collecting search results from multiple sources
 * - Aggregating suggestions or recommendations
 * - Combining lists of entities or tags
 *
 * **Confidence calculation:**
 * Average confidence of all contributing branches
 *
 * **Consensus calculation:**
 * Based on overlap: (shared items) / (total unique items)
 *
 * @template T - The type of items in the arrays
 * @param options - Configuration options
 * @returns A MergeStrategy that concatenates arrays
 *
 * @example
 * ```typescript
 * const results = [
 *   {
 *     value: ['tag1', 'tag2', 'tag3'],
 *     confidence: 0.9,
 *     __scope: 'branch-0',
 *     traceId: 't1'
 *   },
 *   {
 *     value: ['tag2', 'tag4'],
 *     confidence: 0.8,
 *     __scope: 'branch-1',
 *     traceId: 't2'
 *   },
 *   {
 *     value: ['tag1', 'tag5'],
 *     confidence: 0.7,
 *     __scope: 'branch-2',
 *     traceId: 't3'
 *   },
 * ];
 *
 * const strategy = array.concat<string>();
 * const result = strategy.merge(results);
 *
 * // result.value.value === ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
 * // Duplicates removed (tag1, tag2 appeared multiple times)
 * // result.provenance.consensusLevel reflects item overlap
 * ```
 *
 * @example
 * ```typescript
 * // With custom equality function for objects
 * const strategy = array.concat<{ id: string; name: string }>({
 *   equalityFn: (a, b) => a.id === b.id
 * });
 *
 * const results = [
 *   {
 *     value: [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }],
 *     confidence: 0.9,
 *     __scope: 'b0',
 *     traceId: 't1'
 *   },
 *   {
 *     value: [{ id: '1', name: 'Alice' }, { id: '3', name: 'Carol' }],
 *     confidence: 0.8,
 *     __scope: 'b1',
 *     traceId: 't2'
 *   },
 * ];
 *
 * const result = strategy.merge(results);
 * // Only 3 items: id '1' appears twice but is deduplicated
 * ```
 *
 * @example
 * ```typescript
 * // Limit total items, prioritizing high-confidence branches
 * const strategy = array.concat<string>({
 *   maxItems: 10
 * });
 *
 * // If branches return 20 total items, keeps top 10
 * // Items from higher-confidence branches are prioritized
 * ```
 */
export function concat<T>(
  options: ConcatOptions<T> = {}
): MergeStrategy<T[], T[]> {
  const {
    minConfidence = 0,
    removeDuplicates = true,
    equalityFn = (a, b) => JSON.stringify(a) === JSON.stringify(b),
    maxItems,
  } = options;

  return {
    name: 'array-concat',

    merge(results: Owned<T[], string>[]): MergeResult<T[]> {
      if (results.length === 0) {
        throw new Error('Cannot merge empty results array');
      }

      // Filter by confidence threshold
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
          `All results rejected: confidence below threshold (${minConfidence})`
        );
      }

      // Track items with their source branch confidence (for prioritization)
      const itemsWithMeta: { item: T; confidence: number }[] = [];

      validResults.forEach((result) => {
        result.value.forEach((item) => {
          itemsWithMeta.push({
            item,
            confidence: result.confidence,
          });
        });
      });

      // Remove duplicates if enabled
      let finalItems: T[];

      if (removeDuplicates) {
        const uniqueItems: T[] = [];
        const seen = new Set<number>(); // Indices of items we've seen

        itemsWithMeta.forEach((itemMeta, idx) => {
          const isDuplicate = uniqueItems.some((existing) =>
            equalityFn(existing, itemMeta.item)
          );

          if (!isDuplicate) {
            uniqueItems.push(itemMeta.item);
          } else {
            seen.add(idx);
          }
        });

        finalItems = uniqueItems;
      } else {
        finalItems = itemsWithMeta.map((m) => m.item);
      }

      // Apply maxItems limit if specified
      if (maxItems !== undefined && finalItems.length > maxItems) {
        // Sort items by their source branch confidence, keep top N
        const sortedWithMeta = itemsWithMeta
          .map((meta, originalIdx) => ({ ...meta, originalIdx }))
          .filter((meta) => {
            // Find this item in finalItems
            return finalItems.some((item) => equalityFn(item, meta.item));
          })
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, maxItems);

        finalItems = sortedWithMeta.map((m) => m.item);
      }

      // Calculate consensus based on overlap
      // If all branches returned same items, consensus = 1
      // If no overlap, consensus = 0
      const allItems = validResults.flatMap((r) => r.value);
      const totalItems = allItems.length;
      const uniqueItems = finalItems.length;

      // Overlap ratio: more duplicates = more consensus
      const overlapRatio =
        uniqueItems > 0 ? (totalItems - uniqueItems) / totalItems : 0;
      const consensusLevel = Math.max(0, Math.min(1, overlapRatio));

      // Average confidence
      const avgConfidence =
        validResults.reduce((sum, r) => sum + r.confidence, 0) /
        validResults.length;

      const contributingBranches = validResults.map((r) => results.indexOf(r));

      return {
        value: createOwned({
          value: finalItems,
          confidence: avgConfidence,
          scope: 'merged',
          traceId: `merge-concat-${Date.now()}`,
        }),
        provenance: {
          contributingBranches,
          rejectedValues,
          consensusLevel,
        },
        conflicts: [], // Concatenation doesn't have conflicts
      };
    },
  };
}

/**
 * Namespace for array merge strategies.
 */
export const array = {
  concat,
};
