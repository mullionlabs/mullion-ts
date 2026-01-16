import {createOwned} from '../../owned.js';
import type {Owned} from '../../owned.js';
import type {MergeStrategy, MergeResult, MergeConflict} from '../types.js';

/**
 * Options for configuring fieldwise merge strategy.
 */
export interface FieldwiseOptions {
  /**
   * How to merge each field.
   * - 'vote': Use weighted voting for each field
   * - 'first': Always take value from first branch
   * - 'highest-confidence': Take value from branch with highest overall confidence
   *
   * @default 'vote'
   */
  fieldStrategy?: 'vote' | 'first' | 'highest-confidence';

  /**
   * Minimum confidence threshold for a branch to be considered.
   *
   * @default 0
   */
  minConfidence?: number;

  /**
   * Whether to allow partial objects (missing fields).
   * If false, all branches must have the same set of fields.
   *
   * @default false
   */
  allowPartial?: boolean;
}

/**
 * Creates a merge strategy that merges objects field by field.
 *
 * Each field is merged independently using the specified field strategy.
 * Conflicts are tracked per field, never silently overwritten.
 *
 * **Use cases:**
 * - Structured data with multiple independent fields
 * - Configuration objects
 * - Entity records where fields can be merged separately
 *
 * **Warning:** All branches must produce objects with the same structure
 * (same field names) unless `allowPartial: true` is set.
 *
 * @template T - The object type to merge (must extend Record<string, any>)
 * @param options - Configuration options
 * @returns A MergeStrategy that performs fieldwise merging
 *
 * @example
 * ```typescript
 * const results = [
 *   {
 *     value: { category: 'urgent', priority: 9, assignee: 'alice' },
 *     confidence: 0.9,
 *     __scope: 'branch-0',
 *     traceId: 't1'
 *   },
 *   {
 *     value: { category: 'normal', priority: 7, assignee: 'alice' },
 *     confidence: 0.7,
 *     __scope: 'branch-1',
 *     traceId: 't2'
 *   },
 *   {
 *     value: { category: 'urgent', priority: 8, assignee: 'bob' },
 *     confidence: 0.8,
 *     __scope: 'branch-2',
 *     traceId: 't3'
 *   },
 * ];
 *
 * const strategy = object.fieldwise<typeof results[0]['value']>();
 * const result = strategy.merge(results);
 *
 * // Field-by-field voting:
 * // - category: 'urgent' wins (0.9 + 0.8 vs 0.7)
 * // - priority: 9 wins (0.9 vs 0.7 vs 0.8)
 * // - assignee: 'alice' wins (0.9 + 0.7 vs 0.8)
 * //
 * // result.value.value === { category: 'urgent', priority: 9, assignee: 'alice' }
 * // result.conflicts shows which fields had disagreements
 * ```
 *
 * @example
 * ```typescript
 * // With highest-confidence strategy
 * const strategy = object.fieldwise({
 *   fieldStrategy: 'highest-confidence'
 * });
 *
 * // Takes ALL fields from the branch with highest confidence
 * // No field-by-field voting
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fieldwise<T extends Record<string, any>>(
  options: FieldwiseOptions = {},
): MergeStrategy<T, T> {
  const {
    fieldStrategy = 'vote',
    minConfidence = 0,
    allowPartial = false,
  } = options;

  return {
    name: 'fieldwise-merge',

    merge(results: Owned<T, string>[]): MergeResult<T> {
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
          `All results rejected: confidence below threshold (${minConfidence})`,
        );
      }

      // Get all unique field names
      const allFields = new Set<string>();
      for (const result of validResults) {
        Object.keys(result.value).forEach((key) => allFields.add(key));
      }

      // Validate all branches have same fields (unless allowPartial)
      if (!allowPartial) {
        const firstFields = new Set(Object.keys(validResults[0].value));
        for (let i = 1; i < validResults.length; i++) {
          const currentFields = new Set(Object.keys(validResults[i].value));
          if (
            firstFields.size !== currentFields.size ||
            ![...firstFields].every((f) => currentFields.has(f))
          ) {
            throw new Error(
              `Field mismatch: branches have different fields. Set allowPartial: true to allow this.`,
            );
          }
        }
      }

      // Apply field strategy
      let mergedValue: T;
      const conflicts: MergeConflict[] = [];
      const contributingBranches = validResults.map((r) => results.indexOf(r));

      if (fieldStrategy === 'highest-confidence') {
        // Take all fields from branch with highest confidence
        const bestResult = validResults.reduce((best, current) =>
          current.confidence > best.confidence ? current : best,
        );
        mergedValue = {...bestResult.value};
      } else if (fieldStrategy === 'first') {
        // Take all fields from first branch
        mergedValue = {...validResults[0].value};
      } else {
        // Vote on each field independently
        mergedValue = {} as T;

        for (const field of allFields) {
          // Get values for this field from all branches that have it
          const fieldValues = new Map<
            unknown,
            {weight: number; indices: number[]}
          >();

          validResults.forEach((result) => {
            const originalIndex = results.indexOf(result);
            const value = result.value[field] as unknown;

            if (value !== undefined) {
              const current = fieldValues.get(value);
              if (current) {
                current.weight += result.confidence;
                current.indices.push(originalIndex);
              } else {
                fieldValues.set(value, {
                  weight: result.confidence,
                  indices: [originalIndex],
                });
              }
            }
          });

          if (fieldValues.size === 0) {
            // Field not present in any branch
            continue;
          }

          // Find winner for this field
          let winningValue: unknown;
          let winningWeight = -1;

          for (const [value, data] of fieldValues.entries()) {
            if (data.weight > winningWeight) {
              winningValue = value;
              winningWeight = data.weight;
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mergedValue as Record<string, any>)[field] = winningValue;

          // Record conflict if multiple different values
          if (fieldValues.size > 1) {
            conflicts.push({
              field,
              values: Array.from(fieldValues.keys()),
              resolution: 'voted',
            });
          }
        }
      }

      // Calculate overall confidence and consensus
      const avgConfidence =
        validResults.reduce((sum, r) => sum + r.confidence, 0) /
        validResults.length;

      // Consensus based on field agreement rate
      const totalFields = allFields.size;
      const conflictedFields = conflicts.length;
      const consensusLevel =
        totalFields > 0 ? 1 - conflictedFields / totalFields : 1;

      return {
        value: createOwned({
          value: mergedValue,
          confidence: avgConfidence * consensusLevel,
          scope: 'merged',
          traceId: `merge-fieldwise-${Date.now()}`,
        }),
        provenance: {
          contributingBranches,
          rejectedValues,
          consensusLevel,
        },
        conflicts,
      };
    },
  };
}

/**
 * Namespace for object merge strategies.
 */
export const object = {
  fieldwise,
};
