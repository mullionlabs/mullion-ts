/**
 * Fork types for parallel execution with cache optimization.
 *
 * This module defines the type system for Mullion's fork functionality,
 * enabling type-safe parallel execution of LLM operations with support
 * for cache reuse strategies and schema conflict detection.
 *
 * @module fork/types
 */

import type {Context} from '../context.js';
import type {Owned} from '../owned.js';

/**
 * Strategy for parallel execution of fork branches.
 *
 * Determines how branches are executed and whether cache optimization
 * is applied between them.
 *
 * @remarks
 * **Critical Anthropic limitations:**
 * 1. Cache becomes available only AFTER first response starts
 * 2. Different tool schemas = different cache prefix = no reuse
 * 3. `Promise.all()` without warmup = zero cache hits between branches
 *
 * @example
 * ```typescript
 * // For speed-critical paths with no cache dependency
 * const result = await fork(ctx, {
 *   strategy: 'fast-parallel',
 *   branches: [...]
 * });
 *
 * // For cost-optimized paths with shared context
 * const result = await fork(ctx, {
 *   strategy: 'cache-optimized',
 *   warmup: 'explicit',
 *   branches: [...]
 * });
 * ```
 */
export type ForkStrategy =
  /**
   * Execute all branches immediately with `Promise.all()`.
   *
   * - Fastest latency (all branches start simultaneously)
   * - No cache sharing between branches
   * - Highest token cost
   * - Best for: speed-critical paths, independent operations
   */
  | 'fast-parallel'
  /**
   * Prime cache first, then execute branches in parallel.
   *
   * - Slightly higher latency (warmup step first)
   * - Branches benefit from shared cached prefix
   * - Lower token cost for cache-eligible content
   * - Best for: cost-optimized paths, shared context
   */
  | 'cache-optimized';

/**
 * Warmup strategy for cache-optimized fork execution.
 *
 * Determines how the cache is primed before parallel branch execution.
 *
 * @remarks
 * Warmup is essential for Anthropic cache sharing because:
 * - Cache becomes available only after the first response completes
 * - Without warmup, parallel branches each create their own cache
 * - With warmup, all branches can read from the primed cache
 */
export type WarmupStrategy =
  /**
   * Separate minimal call to prime cache before branches.
   *
   * - Dedicated warmup request with minimal output
   * - Most reliable cache priming
   * - Adds one extra API call latency
   * - Warmup cost tracked separately in metrics
   */
  | 'explicit'
  /**
   * First branch primes cache, others wait then execute.
   *
   * - Uses first branch result to prime cache
   * - Other branches wait for first to complete
   * - No extra API call, but sequential first branch
   * - Useful when first branch has reusable output
   */
  | 'first-branch'
  /**
   * No warmup, equivalent to fast-parallel cache behavior.
   *
   * - No cache priming step
   * - Branches may create duplicate caches
   * - Use with cache-optimized when warmup isn't needed
   */
  | 'none';

/**
 * Behavior when fork branches have conflicting schemas.
 *
 * For Anthropic specifically, `generateObject` uses tools under the hood.
 * Different schemas in fork branches create different tool definitions,
 * which breaks cache prefix matching.
 *
 * @remarks
 * This is an Anthropic-specific concern:
 * - OpenAI caching is automatic and doesn't have this limitation
 * - Schema conflict only matters when using `cache-optimized` strategy
 * - With `fast-parallel`, schemas don't affect cache anyway
 *
 * @example
 * ```typescript
 * // Warn but continue (default, best for development)
 * const result = await fork(ctx, {
 *   strategy: 'cache-optimized',
 *   onSchemaConflict: 'warn',
 *   branches: [
 *     (c) => c.infer(RiskSchema, 'Analyze risk'),
 *     (c) => c.infer(OpportunitySchema, 'Find opportunities'),
 *   ],
 * });
 * // Console: "Warning: Different schemas in fork branches break Anthropic cache reuse..."
 *
 * // Strict mode (best for production cost optimization)
 * const result = await fork(ctx, {
 *   strategy: 'cache-optimized',
 *   onSchemaConflict: 'error',
 *   branches: [...]
 * });
 * // Throws if schemas differ
 * ```
 */
export type SchemaConflictBehavior =
  /**
   * Log a warning but continue execution.
   *
   * Best for development and debugging - see issues without breaking flow.
   */
  | 'warn'
  /**
   * Throw an error if schemas conflict.
   *
   * Best for production when cache optimization is critical.
   */
  | 'error'
  /**
   * Silently allow schema conflicts.
   *
   * Use when schema differences are intentional and accepted.
   */
  | 'allow';

/**
 * Branch function type for fork execution.
 *
 * Each branch receives an isolated child context and returns a Promise
 * of an Owned value. The child context shares cache segments with siblings
 * but maintains independent operation tracking.
 *
 * @template T - Type of value returned by the branch
 * @template S - Scope identifier of the parent context
 */
export type ForkBranch<T, S extends string> = (
  ctx: Context<S>,
) => Promise<Owned<T, S>>;

/**
 * Configuration options for fork execution.
 *
 * Provides full control over parallel execution strategy, cache behavior,
 * warmup approach, and schema conflict handling.
 *
 * @template T - Type of values returned by branches
 * @template S - Scope identifier of the parent context
 *
 * @example
 * ```typescript
 * // Minimal configuration (fast parallel)
 * const options: ForkOptions<Analysis, 'analysis'> = {
 *   strategy: 'fast-parallel',
 *   branches: [
 *     (c) => c.infer(RiskSchema, 'Analyze risk'),
 *     (c) => c.infer(OpportunitySchema, 'Find opportunities'),
 *   ],
 * };
 *
 * // Full cache optimization
 * const options: ForkOptions<Summary, 'analysis'> = {
 *   strategy: 'cache-optimized',
 *   warmup: 'explicit',
 *   onSchemaConflict: 'warn',
 *   branches: [
 *     (c) => c.infer(SummarySchema, 'Summarize for executives'),
 *     (c) => c.infer(SummarySchema, 'Summarize for engineers'),
 *     (c) => c.infer(SummarySchema, 'Summarize for marketing'),
 *   ],
 * };
 * ```
 */
export interface ForkOptions<T, S extends string> {
  /**
   * Execution strategy for parallel branches.
   *
   * - `'fast-parallel'`: Maximum speed, no cache sharing
   * - `'cache-optimized'`: Trade latency for token savings
   */
  readonly strategy: ForkStrategy;

  /**
   * Cache warmup approach (only used with `cache-optimized` strategy).
   *
   * - `'explicit'`: Separate warmup call before branches
   * - `'first-branch'`: First branch primes, others wait
   * - `'none'`: No warmup (equivalent to fast-parallel cache)
   *
   * @default 'explicit' when strategy is 'cache-optimized'
   */
  readonly warmup?: WarmupStrategy;

  /**
   * Behavior when branch schemas conflict (Anthropic-specific).
   *
   * Different schemas break cache prefix matching. Choose how to handle:
   * - `'warn'`: Log warning, continue (default)
   * - `'error'`: Throw error
   * - `'allow'`: Silent continue
   *
   * @default 'warn'
   */
  readonly onSchemaConflict?: SchemaConflictBehavior;

  /**
   * Branch functions to execute in parallel.
   *
   * Each branch receives an isolated child context and should return
   * a Promise of an Owned value. All branches must return the same type T.
   *
   * @remarks
   * For best cache optimization with Anthropic:
   * - Use the same schema across branches when possible
   * - Or use `generateText` + post-processing instead of `generateObject`
   * - Accept no cache sharing if schemas must differ
   */
  readonly branches: readonly ForkBranch<T, S>[];
}

/**
 * Cache statistics aggregated across fork branches.
 *
 * Provides visibility into cache performance for the entire fork operation,
 * including warmup costs and per-branch cache utilization.
 */
export interface ForkCacheStats {
  /**
   * Token cost of the warmup step (0 if no warmup).
   *
   * Only populated when using `cache-optimized` with `warmup: 'explicit'`
   * or `warmup: 'first-branch'`.
   */
  readonly warmupCost: number;

  /**
   * Cache hit tokens for each branch (by index).
   *
   * Element i contains the number of cache read tokens for branch i.
   * Compare across branches to verify cache sharing is working.
   *
   * @example
   * ```typescript
   * // With effective cache sharing
   * result.cacheStats.branchCacheHits
   * // [0, 5000, 5000] - first branch creates cache, others read
   *
   * // Without cache sharing (schema conflict or fast-parallel)
   * result.cacheStats.branchCacheHits
   * // [0, 0, 0] - each branch creates own cache, no reads
   * ```
   */
  readonly branchCacheHits: readonly number[];

  /**
   * Total tokens saved across all branches.
   *
   * Calculated as: sum of cache read tokens that avoided re-processing.
   */
  readonly totalSaved: number;
}

/**
 * Result of a fork operation.
 *
 * Contains the collected results from all branches, cache performance metrics,
 * and any warnings generated during execution.
 *
 * @template T - Type of values returned by branches
 * @template S - Scope identifier of the parent context
 *
 * @example
 * ```typescript
 * const result = await fork(ctx, {
 *   strategy: 'cache-optimized',
 *   warmup: 'explicit',
 *   branches: [
 *     (c) => c.infer(RiskSchema, 'Analyze risk factors'),
 *     (c) => c.infer(OpportunitySchema, 'Find opportunities'),
 *     (c) => c.infer(SummarySchema, 'Provide executive summary'),
 *   ],
 * });
 *
 * // Access branch results
 * const [risk, opportunity, summary] = result.results;
 * console.log(risk.value, risk.confidence);
 *
 * // Check cache efficiency
 * console.log(`Saved ${result.cacheStats.totalSaved} tokens`);
 * console.log(`Branch cache hits: ${result.cacheStats.branchCacheHits}`);
 *
 * // Review any warnings
 * if (result.warnings.length > 0) {
 *   console.warn('Fork warnings:', result.warnings);
 * }
 * ```
 */
export interface ForkResult<T, S extends string> {
  /**
   * Results from all branches in order.
   *
   * Each element corresponds to the branch at the same index in the
   * `branches` array. All results are Owned values tagged with the
   * parent context's scope.
   */
  readonly results: readonly Owned<T, S>[];

  /**
   * Aggregated cache statistics for the fork operation.
   *
   * Includes warmup cost, per-branch cache hits, and total savings.
   * Use these metrics to tune fork strategy and warmup approach.
   */
  readonly cacheStats: ForkCacheStats;

  /**
   * Warnings generated during fork execution.
   *
   * May include:
   * - Schema conflict warnings (when `onSchemaConflict: 'warn'`)
   * - Cache threshold warnings (content below min tokens)
   * - Provider capability warnings
   *
   * Empty array if no warnings were generated.
   */
  readonly warnings: readonly string[];
}

/**
 * Schema conflict detection result.
 *
 * Used internally to check if branch schemas would break
 * Anthropic cache prefix matching.
 */
export interface SchemaConflictResult {
  /**
   * Whether a schema conflict was detected.
   */
  readonly hasConflict: boolean;

  /**
   * Detailed description of the conflict.
   *
   * Includes information about which branches have different schemas
   * and suggestions for resolution.
   */
  readonly message: string;

  /**
   * Indices of branches with conflicting schemas.
   *
   * Groups branches by schema signature - branches in different groups
   * will not share cache.
   */
  readonly conflictingBranches: readonly (readonly number[])[];
}

/**
 * Warmup result for cache-optimized fork execution.
 *
 * Returned by the warmup step to provide visibility into cache priming cost.
 */
export interface WarmupResult {
  /**
   * Number of tokens used in warmup (input + output).
   */
  readonly tokenCost: number;

  /**
   * Number of tokens written to cache during warmup.
   */
  readonly cacheCreatedTokens: number;

  /**
   * Duration of warmup step in milliseconds.
   */
  readonly durationMs: number;
}
