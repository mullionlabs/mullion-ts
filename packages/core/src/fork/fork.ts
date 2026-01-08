/**
 * Fork implementation for parallel LLM execution with cache optimization.
 *
 * This module provides the core fork functionality for executing multiple
 * LLM operations in parallel while maximizing cache reuse across branches.
 *
 * @module fork/fork
 */

import type { Context, InferOptions, Schema } from '../context.js';
import type { Owned } from '../owned.js';

import type {
  ForkBranch,
  ForkCacheStats,
  ForkOptions,
  ForkResult,
  WarmupResult,
  WarmupStrategy,
} from './types.js';

/**
 * Configuration for warmup execution.
 *
 * Integration packages (like @mullion/ai-sdk) provide an implementation
 * of this interface to enable cache-optimized fork execution.
 */
export interface WarmupExecutor {
  /**
   * Executes an explicit warmup call to prime the cache.
   *
   * This should make a minimal API call that uses the cached segments
   * but produces minimal output, purely to establish the cache entry
   * before parallel branches execute.
   *
   * @param ctx - The parent context for the warmup
   * @returns Promise resolving to warmup metrics
   */
  explicitWarmup<S extends string>(ctx: Context<S>): Promise<WarmupResult>;

  /**
   * Indicates whether this executor supports cache optimization.
   *
   * If false, cache-optimized strategy falls back to fast-parallel behavior.
   */
  readonly supportsCacheOptimization: boolean;
}

/**
 * Creates an isolated child context for a fork branch.
 *
 * The child context shares the parent's scope identifier but maintains
 * independent state for operations. This enables parallel execution
 * without interference between branches.
 *
 * @template S - The scope identifier
 * @param parentCtx - The parent context
 * @param branchIndex - Index of this branch (for tracing)
 * @returns A new child context
 */
function createChildContext<S extends string>(
  parentCtx: Context<S>,
  branchIndex: number
): Context<S> {
  return {
    scope: parentCtx.scope,

    infer<T>(
      schema: Schema<T>,
      input: string,
      options?: InferOptions
    ): Promise<Owned<T, S>> {
      // Delegate to parent's infer but could add branch metadata
      return parentCtx.infer(schema, input, {
        ...options,
        metadata: {
          ...options?.metadata,
          __forkBranchIndex: branchIndex,
        },
      });
    },

    bridge<T, OS extends string>(owned: Owned<T, OS>): Owned<T, S | OS> {
      return parentCtx.bridge(owned);
    },

    use<T>(owned: Owned<T, S>): T {
      return parentCtx.use(owned);
    },
  };
}

/**
 * Executes fast-parallel strategy.
 *
 * All branches execute simultaneously with Promise.all().
 * No cache warmup, branches don't share cache.
 * Fastest latency, highest token cost.
 */
async function executeFastParallel<T, S extends string>(
  ctx: Context<S>,
  branches: readonly ForkBranch<T, S>[]
): Promise<{
  results: Owned<T, S>[];
  cacheStats: ForkCacheStats;
}> {
  // Create child contexts for each branch
  const childContexts = branches.map((_, index) =>
    createChildContext(ctx, index)
  );

  // Execute all branches in parallel
  const results = await Promise.all(
    branches.map((branch, index) => branch(childContexts[index]))
  );

  // No cache sharing in fast-parallel mode
  const cacheStats: ForkCacheStats = {
    warmupCost: 0,
    branchCacheHits: branches.map(() => 0),
    totalSaved: 0,
  };

  return { results, cacheStats };
}

/**
 * Executes cache-optimized strategy.
 *
 * Primes cache first (based on warmup strategy), then executes
 * branches in parallel to benefit from cached prefix.
 */
async function executeCacheOptimized<T, S extends string>(
  ctx: Context<S>,
  branches: readonly ForkBranch<T, S>[],
  warmupStrategy: WarmupStrategy,
  warmupExecutor?: WarmupExecutor
): Promise<{
  results: Owned<T, S>[];
  cacheStats: ForkCacheStats;
  warnings: string[];
}> {
  const warnings: string[] = [];
  let warmupResult: WarmupResult | undefined;

  // Check if we have a warmup executor
  if (!warmupExecutor?.supportsCacheOptimization) {
    warnings.push(
      'Cache optimization requested but no warmup executor available. ' +
        'Falling back to fast-parallel execution. Install @mullion/ai-sdk for cache support.'
    );

    const { results, cacheStats } = await executeFastParallel(ctx, branches);
    return { results, cacheStats, warnings };
  }

  // Execute warmup based on strategy
  switch (warmupStrategy) {
    case 'explicit':
      // Separate minimal call to prime cache
      warmupResult = await warmupExecutor.explicitWarmup(ctx);
      break;

    case 'first-branch':
      // First branch primes, others wait
      // This is handled specially below
      break;

    case 'none':
      // No warmup, just parallel execution
      break;
  }

  // Create child contexts for each branch
  const childContexts = branches.map((_, index) =>
    createChildContext(ctx, index)
  );

  let results: Owned<T, S>[];
  const branchCacheHits: number[] = [];

  if (warmupStrategy === 'first-branch' && branches.length > 0) {
    // Execute first branch, wait for it to complete (primes cache)
    const firstResult = await branches[0](childContexts[0]);
    branchCacheHits.push(0); // First branch creates cache, no hits

    // Execute remaining branches in parallel (benefiting from cache)
    if (branches.length > 1) {
      const remainingResults = await Promise.all(
        branches
          .slice(1)
          .map((branch, index) => branch(childContexts[index + 1]))
      );

      // Remaining branches should have cache hits
      // Actual values would come from metrics in integration package
      remainingResults.forEach(() => branchCacheHits.push(0));

      results = [firstResult, ...remainingResults];
    } else {
      results = [firstResult];
    }
  } else {
    // Execute all branches in parallel (after explicit warmup or no warmup)
    results = await Promise.all(
      branches.map((branch, index) => branch(childContexts[index]))
    );

    // All branches after warmup should have cache hits
    // Actual values would come from metrics in integration package
    results.forEach(() => branchCacheHits.push(0));
  }

  const cacheStats: ForkCacheStats = {
    warmupCost: warmupResult?.tokenCost ?? 0,
    branchCacheHits,
    totalSaved: 0, // Calculated by integration package from actual metrics
  };

  return { results, cacheStats, warnings };
}

/**
 * Global warmup executor that can be set by integration packages.
 *
 * @internal
 */
let globalWarmupExecutor: WarmupExecutor | undefined;

/**
 * Registers a warmup executor for cache-optimized fork execution.
 *
 * This is called by integration packages (like @mullion/ai-sdk) to
 * provide the actual cache warmup implementation.
 *
 * @param executor - The warmup executor to register
 *
 * @example
 * ```typescript
 * // In @mullion/ai-sdk initialization:
 * import { registerWarmupExecutor } from '@mullion/core';
 *
 * registerWarmupExecutor({
 *   supportsCacheOptimization: true,
 *   async explicitWarmup(ctx) {
 *     // Make minimal API call with cached segments
 *     return { tokenCost: 100, cacheCreatedTokens: 5000, durationMs: 200 };
 *   },
 * });
 * ```
 */
export function registerWarmupExecutor(executor: WarmupExecutor): void {
  globalWarmupExecutor = executor;
}

/**
 * Gets the currently registered warmup executor.
 *
 * @returns The registered executor, or undefined if none registered
 * @internal
 */
export function getWarmupExecutor(): WarmupExecutor | undefined {
  return globalWarmupExecutor;
}

/**
 * Clears the registered warmup executor.
 *
 * Primarily used for testing to reset state between tests.
 *
 * @internal
 */
export function clearWarmupExecutor(): void {
  globalWarmupExecutor = undefined;
}

/**
 * Executes multiple LLM operations in parallel with optional cache optimization.
 *
 * Fork enables running multiple inference operations simultaneously, with support
 * for two execution strategies:
 *
 * - **fast-parallel**: Maximum speed, all branches execute immediately with
 *   `Promise.all()`. No cache sharing between branches, highest token cost.
 *
 * - **cache-optimized**: Trade latency for token savings. Primes cache first,
 *   then branches benefit from shared cached prefix.
 *
 * @template T - Type of values returned by all branches
 * @template S - Scope identifier of the parent context
 * @param ctx - The parent context for fork execution
 * @param options - Fork configuration including strategy and branches
 * @returns Promise resolving to fork results with cache statistics
 *
 * @example
 * ```typescript
 * // Fast parallel execution for speed-critical paths
 * const result = await fork(ctx, {
 *   strategy: 'fast-parallel',
 *   branches: [
 *     (c) => c.infer(RiskSchema, 'Analyze risk factors'),
 *     (c) => c.infer(OpportunitySchema, 'Find opportunities'),
 *     (c) => c.infer(SummarySchema, 'Provide executive summary'),
 *   ],
 * });
 *
 * const [risk, opportunity, summary] = result.results;
 * console.log(risk.value, opportunity.value, summary.value);
 * ```
 *
 * @example
 * ```typescript
 * // Cache-optimized execution for cost savings
 * // First, add content to cache segments
 * await ctx.cache.segment('document', longDocument, { ttl: '5m' });
 * await ctx.cache.system(systemPrompt, { ttl: '1h' });
 *
 * const result = await fork(ctx, {
 *   strategy: 'cache-optimized',
 *   warmup: 'explicit',
 *   onSchemaConflict: 'warn',
 *   branches: [
 *     (c) => c.infer(AnalysisSchema, 'Analyze from perspective A'),
 *     (c) => c.infer(AnalysisSchema, 'Analyze from perspective B'),
 *     (c) => c.infer(AnalysisSchema, 'Analyze from perspective C'),
 *   ],
 * });
 *
 * console.log(`Saved ${result.cacheStats.totalSaved} tokens`);
 * console.log(`Branch cache hits: ${result.cacheStats.branchCacheHits}`);
 *
 * if (result.warnings.length > 0) {
 *   console.warn('Warnings:', result.warnings);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // First-branch warmup for natural cache priming
 * const result = await fork(ctx, {
 *   strategy: 'cache-optimized',
 *   warmup: 'first-branch',
 *   branches: [
 *     (c) => c.infer(OverviewSchema, 'Generate overview'), // Primes cache
 *     (c) => c.infer(DetailSchema, 'Generate details'),    // Uses cache
 *     (c) => c.infer(ActionSchema, 'Generate actions'),    // Uses cache
 *   ],
 * });
 * ```
 */
export async function fork<T, S extends string>(
  ctx: Context<S>,
  options: ForkOptions<T, S>
): Promise<ForkResult<T, S>> {
  const {
    strategy,
    warmup = strategy === 'cache-optimized' ? 'explicit' : 'none',
    onSchemaConflict = 'warn',
    branches,
  } = options;

  // Validate branches
  if (branches.length === 0) {
    return {
      results: [],
      cacheStats: {
        warmupCost: 0,
        branchCacheHits: [],
        totalSaved: 0,
      },
      warnings: [],
    };
  }

  const warnings: string[] = [];

  // Schema conflict detection would be implemented here
  // For now, we note that it requires integration with the inference layer
  // to inspect what schemas each branch will use
  if (
    onSchemaConflict === 'warn' &&
    strategy === 'cache-optimized' &&
    branches.length > 1
  ) {
    // Schema conflict detection happens at inference time in integration package
    // The onSchemaConflict option is passed through to enable that detection
  }

  // Execute based on strategy
  if (strategy === 'fast-parallel') {
    const { results, cacheStats } = await executeFastParallel(ctx, branches);

    return {
      results,
      cacheStats,
      warnings,
    };
  } else {
    // cache-optimized strategy
    const executionResult = await executeCacheOptimized(
      ctx,
      branches,
      warmup,
      globalWarmupExecutor
    );

    return {
      results: executionResult.results,
      cacheStats: executionResult.cacheStats,
      warnings: [...warnings, ...executionResult.warnings],
    };
  }
}
