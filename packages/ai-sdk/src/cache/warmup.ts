/**
 * Cache warmup implementation for fork optimization.
 *
 * This module provides warmup strategies for priming the cache before
 * parallel fork branch execution. Warmup is essential for Anthropic
 * cache sharing because cache becomes available only after the first
 * response completes.
 *
 * @module cache/warmup
 */

import type {LanguageModel} from 'ai';
import {generateText} from 'ai';
import type {Context, WarmupExecutor, WarmupResult} from '@mullion/core';
import {registerWarmupExecutor} from '@mullion/core';

import type {CacheSegmentManager} from './segments.js';
import type {Provider} from './capabilities.js';
import {getCacheCapabilities} from './capabilities.js';

/**
 * Configuration for warmup operations.
 */
export interface WarmupConfig {
  /** LLM provider (anthropic, openai, etc.) */
  readonly provider: Provider;

  /** Model identifier */
  readonly model: string;

  /** Language model instance for API calls */
  readonly languageModel: LanguageModel;

  /** System prompt to use for warmup (optional) */
  readonly systemPrompt?: string;

  /** Minimal prompt for warmup (produces minimal output) */
  readonly warmupPrompt?: string;

  /** Maximum tokens for warmup output (should be minimal) */
  readonly maxTokens?: number;
}

/**
 * Default warmup prompt that produces minimal output.
 *
 * The goal is to prime the cache with segments while generating
 * as little output as possible to minimize warmup cost.
 */
const DEFAULT_WARMUP_PROMPT =
  'Respond with exactly one word: "ready". Do not include any other text.';

/**
 * Default maximum tokens for warmup (very small).
 */
const DEFAULT_WARMUP_MAX_TOKENS = 10;

/**
 * Performs an explicit warmup call to prime the cache.
 *
 * This function makes a minimal API call that uses the cached segments
 * but produces minimal output, purely to establish the cache entry
 * before parallel branches execute.
 *
 * @param config - Warmup configuration
 * @param cacheManager - Cache segment manager with segments to prime
 * @returns Promise resolving to warmup metrics
 *
 * @example
 * ```typescript
 * const config: WarmupConfig = {
 *   provider: 'anthropic',
 *   model: 'claude-3-5-sonnet-20241022',
 *   languageModel: anthropic('claude-3-5-sonnet-20241022'),
 * };
 *
 * // Add segments to cache manager
 * cacheManager.segment('document', longDocument, { ttl: '5m' });
 * cacheManager.system(systemPrompt, { ttl: '1h' });
 *
 * // Perform explicit warmup
 * const result = await explicitWarmup(config, cacheManager);
 * console.log(`Warmup cost: ${result.tokenCost} tokens`);
 * console.log(`Cache created: ${result.cacheCreatedTokens} tokens`);
 * ```
 */
export async function explicitWarmup(
  config: WarmupConfig,
  cacheManager?: CacheSegmentManager,
): Promise<WarmupResult> {
  const startTime = Date.now();

  // Check if caching is supported for this provider/model
  const capabilities = getCacheCapabilities(config.provider, config.model);
  if (!capabilities.supported) {
    return {
      tokenCost: 0,
      cacheCreatedTokens: 0,
      durationMs: Date.now() - startTime,
    };
  }

  // Build the warmup prompt with system prompt if provided
  const warmupPrompt = config.warmupPrompt ?? DEFAULT_WARMUP_PROMPT;
  const maxTokens = config.maxTokens ?? DEFAULT_WARMUP_MAX_TOKENS;

  // Prepare provider-specific cache options if we have segments
  let providerOptions: Record<string, unknown> = {};
  if (cacheManager && config.provider === 'anthropic') {
    const segments = cacheManager.getSegments();
    if (segments.length > 0) {
      // Build Anthropic cache control for segments
      providerOptions = {
        providerOptions: {
          anthropic: {
            cacheControl: segments.map(() => ({
              type: 'ephemeral' as const,
            })),
          },
        },
      };
    }
  }

  // Make the warmup call
  const result = await generateText({
    model: config.languageModel,
    prompt: warmupPrompt,
    system: config.systemPrompt,
    maxOutputTokens: maxTokens,
    ...providerOptions,
  });

  // Extract usage metrics
  const usage = result.usage;
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;

  // Extract cache-specific metrics from provider metadata
  let cacheCreatedTokens = 0;
  const providerMetadata = result.providerMetadata as
    | Record<string, unknown>
    | undefined;

  if (config.provider === 'anthropic' && providerMetadata?.anthropic) {
    const anthropicMeta = providerMetadata.anthropic as Record<string, unknown>;
    cacheCreatedTokens =
      (anthropicMeta.cache_creation_input_tokens as number) ?? 0;
  }

  return {
    tokenCost: inputTokens + outputTokens,
    cacheCreatedTokens,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Result of first-branch warmup.
 */
export interface FirstBranchWarmupResult<T> {
  /** Result from the first branch */
  readonly firstResult: T;

  /** Warmup metrics */
  readonly warmup: WarmupResult;
}

/**
 * Executes first branch as warmup, then returns its result.
 *
 * This strategy uses the first branch's natural execution to prime
 * the cache. Other branches wait for the first to complete before
 * executing in parallel, benefiting from the primed cache.
 *
 * @template T - Return type of the branch
 * @param firstBranch - The first branch function to execute
 * @param ctx - Context for the branch
 * @returns Promise resolving to first branch result and warmup metrics
 *
 * @example
 * ```typescript
 * const branches = [
 *   (c) => c.infer(OverviewSchema, 'Generate overview'),
 *   (c) => c.infer(DetailSchema, 'Generate details'),
 *   (c) => c.infer(ActionSchema, 'Generate actions'),
 * ];
 *
 * // Execute first branch as warmup
 * const { firstResult, warmup } = await firstBranchWarmup(
 *   branches[0],
 *   ctx
 * );
 *
 * // Execute remaining branches (they benefit from cache)
 * const remainingResults = await Promise.all(
 *   branches.slice(1).map((branch) => branch(ctx))
 * );
 *
 * const allResults = [firstResult, ...remainingResults];
 * ```
 */
export async function firstBranchWarmup<T, S extends string>(
  firstBranch: (ctx: Context<S>) => Promise<T>,
  ctx: Context<S>,
): Promise<FirstBranchWarmupResult<T>> {
  const startTime = Date.now();

  // Execute the first branch
  const firstResult = await firstBranch(ctx);

  // We can't easily extract cache metrics from a generic branch execution
  // The metrics would come from the context's cache stats if available
  const warmup: WarmupResult = {
    tokenCost: 0, // Would be populated from context metrics
    cacheCreatedTokens: 0, // Would be populated from context metrics
    durationMs: Date.now() - startTime,
  };

  return {firstResult, warmup};
}

/**
 * Creates a warmup executor for use with the fork function.
 *
 * This factory creates a WarmupExecutor that can be registered with
 * @mullion/core to enable cache-optimized fork execution.
 *
 * @param config - Warmup configuration
 * @param cacheManager - Optional cache manager for segment access
 * @returns A WarmupExecutor instance
 *
 * @example
 * ```typescript
 * import { createWarmupExecutor, registerWarmupExecutor } from '@mullion/ai-sdk';
 * import { anthropic } from '@ai-sdk/anthropic';
 *
 * const executor = createWarmupExecutor({
 *   provider: 'anthropic',
 *   model: 'claude-3-5-sonnet-20241022',
 *   languageModel: anthropic('claude-3-5-sonnet-20241022'),
 * });
 *
 * registerWarmupExecutor(executor);
 *
 * // Now fork() with strategy: 'cache-optimized' will use this executor
 * const result = await fork(ctx, {
 *   strategy: 'cache-optimized',
 *   warmup: 'explicit',
 *   branches: [...],
 * });
 * ```
 */
export function createWarmupExecutor(
  config: WarmupConfig,
  cacheManager?: CacheSegmentManager,
): WarmupExecutor {
  const capabilities = getCacheCapabilities(config.provider, config.model);

  return {
    supportsCacheOptimization:
      capabilities.supported && !capabilities.isAutomatic,

    async explicitWarmup<S extends string>(
      _ctx: Context<S>,
    ): Promise<WarmupResult> {
      return explicitWarmup(config, cacheManager);
    },
  };
}

/**
 * Registers a warmup executor with @mullion/core for the given configuration.
 *
 * This is a convenience function that creates and registers the executor
 * in one call.
 *
 * @param config - Warmup configuration
 * @param cacheManager - Optional cache manager for segment access
 * @returns The created WarmupExecutor instance
 *
 * @example
 * ```typescript
 * import { setupWarmupExecutor } from '@mullion/ai-sdk';
 * import { anthropic } from '@ai-sdk/anthropic';
 *
 * // Register warmup for cache-optimized fork
 * setupWarmupExecutor({
 *   provider: 'anthropic',
 *   model: 'claude-3-5-sonnet-20241022',
 *   languageModel: anthropic('claude-3-5-sonnet-20241022'),
 * });
 *
 * // Now use cache-optimized fork
 * const result = await fork(ctx, {
 *   strategy: 'cache-optimized',
 *   branches: [...],
 * });
 * ```
 */
export function setupWarmupExecutor(
  config: WarmupConfig,
  cacheManager?: CacheSegmentManager,
): WarmupExecutor {
  const executor = createWarmupExecutor(config, cacheManager);
  registerWarmupExecutor(executor);
  return executor;
}

/**
 * Estimates the token cost of a warmup operation.
 *
 * This function provides a rough estimate of the warmup cost before
 * actually executing the warmup, useful for cost planning.
 *
 * @param cacheManager - Cache manager with segments
 * @param systemPrompt - Optional system prompt
 * @returns Estimated token cost
 *
 * @example
 * ```typescript
 * const estimate = estimateWarmupCost(cacheManager, systemPrompt);
 * console.log(`Estimated warmup cost: ~${estimate} tokens`);
 *
 * if (estimate > 10000) {
 *   console.warn('Large warmup cost, consider reducing cached content');
 * }
 * ```
 */
export function estimateWarmupCost(
  cacheManager?: CacheSegmentManager,
  systemPrompt?: string,
): number {
  let totalTokens = 0;

  // Add segment tokens
  if (cacheManager) {
    totalTokens += cacheManager.getTotalTokens();
  }

  // Add system prompt tokens (estimate ~4 chars per token)
  if (systemPrompt) {
    totalTokens += Math.ceil(systemPrompt.length / 4);
  }

  // Add warmup prompt tokens (very small)
  totalTokens += 20; // Approximate tokens for default warmup prompt

  // Add small output tokens
  totalTokens += DEFAULT_WARMUP_MAX_TOKENS;

  return totalTokens;
}

/**
 * Determines if warmup would be beneficial for the given configuration.
 *
 * Warmup is beneficial when:
 * - Provider supports explicit caching (not automatic like OpenAI)
 * - There are cache segments to prime
 * - Expected branch count is > 1
 *
 * @param config - Warmup configuration
 * @param cacheManager - Cache manager with segments
 * @param branchCount - Number of fork branches
 * @returns Whether warmup is recommended
 *
 * @example
 * ```typescript
 * if (shouldWarmup(config, cacheManager, branches.length)) {
 *   await fork(ctx, {
 *     strategy: 'cache-optimized',
 *     warmup: 'explicit',
 *     branches,
 *   });
 * } else {
 *   await fork(ctx, {
 *     strategy: 'fast-parallel',
 *     branches,
 *   });
 * }
 * ```
 */
export function shouldWarmup(
  config: WarmupConfig,
  cacheManager?: CacheSegmentManager,
  branchCount = 0,
): boolean {
  const capabilities = getCacheCapabilities(config.provider, config.model);

  // No benefit if caching not supported
  if (!capabilities.supported) {
    return false;
  }

  // No benefit for automatic caching (OpenAI)
  if (capabilities.isAutomatic) {
    return false;
  }

  // No benefit if no segments to cache
  if (!cacheManager || cacheManager.getSegments().length === 0) {
    return false;
  }

  // No benefit for single branch
  if (branchCount <= 1) {
    return false;
  }

  // Check if segments meet minimum token threshold
  const totalTokens = cacheManager.getTotalTokens();
  if (totalTokens < capabilities.minTokens) {
    return false;
  }

  return true;
}
