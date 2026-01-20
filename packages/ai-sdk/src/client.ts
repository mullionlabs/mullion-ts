import type {LanguageModel, FinishReason, ModelMessage, Prompt} from 'ai';
import {generateObject} from 'ai';
import type {z} from 'zod';
import {createOwned} from '@mullion/core';
import type {Context, InferOptions, Owned} from '@mullion/core';
import type {CacheSegmentManager} from './cache/segments.js';
import {createCacheSegmentManager} from './cache/segments.js';
import {createDefaultCacheConfig} from './cache/types.js';
import type {Provider} from './cache/capabilities.js';
import type {CacheStats} from './cache/metrics.js';
import {CacheMetricsCollector} from './cache/metrics.js';
import type {CostBreakdown, TokenUsage} from './cost/calculator.js';
import {calculateCost, estimateCost} from './cost/calculator.js';
import {estimateTokens} from './cost/tokens.js';

type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | {[key: string]: JsonValue};

type ProviderPromptOptions = Record<string, Record<string, JsonValue>>;
type ProviderCallOptions = Record<string, Record<string, JsonValue>>;

/**
 * Confidence scores mapped to LLM finish reasons.
 *
 * These values represent how confident we can be in the LLM output
 * based on why it stopped generating.
 */
const FINISH_REASON_CONFIDENCE: Record<FinishReason, number> = {
  /** Model completed naturally - highest confidence */
  stop: 1.0,
  /** Model made tool calls - high confidence (intentional action) */
  'tool-calls': 0.95,
  /** Output truncated due to token limit - medium-high confidence */
  length: 0.75,
  /** Content was filtered - medium confidence */
  'content-filter': 0.6,
  /** Unknown reason - medium confidence */
  other: 0.5,
  /** Error occurred - low confidence */
  error: 0.3,
};

/**
 * Extract a confidence score from the LLM finish reason.
 *
 * This function maps the finish reason to a confidence score between 0 and 1.
 * The mapping is based on how reliable the output is likely to be given
 * why the model stopped generating.
 *
 * @param finishReason - The reason the model finished generating
 * @returns A confidence score between 0 and 1
 *
 * @example
 * ```typescript
 * extractConfidenceFromFinishReason('stop');    // 1.0
 * extractConfidenceFromFinishReason('length');  // 0.75
 * extractConfidenceFromFinishReason('error');   // 0.3
 * ```
 */
export function extractConfidenceFromFinishReason(
  finishReason: FinishReason,
): number {
  return FINISH_REASON_CONFIDENCE[finishReason] ?? 0.5;
}

/**
 * Mullion client for Vercel AI SDK integration.
 *
 * Provides a scoped execution environment with LLM inference capabilities.
 * The client wraps a language model and provides type-safe context management
 * for all LLM operations.
 *
 * @example
 * ```typescript
 * import { createMullionClient } from '@mullion/ai-sdk';
 * import { openai } from '@ai-sdk/openai';
 *
 * const client = createMullionClient(openai('gpt-4'));
 *
 * const result = await client.scope('user-query', async (ctx) => {
 *   const intent = await ctx.infer(IntentSchema, userMessage);
 *   return intent.value;
 * });
 * ```
 */
export interface MullionClient {
  /**
   * Create a scoped execution context for LLM operations.
   *
   * This method establishes a type-safe boundary for LLM-generated values.
   * All values created within the scope are tagged with the scope identifier,
   * enabling compile-time detection of context leaks.
   *
   * @template S - The scope identifier (string literal type)
   * @template R - The return type of the scope function
   * @param name - The scope identifier (must be a string literal for type safety)
   * @param fn - Async function that receives a Context and returns a value
   * @returns Promise resolving to the value returned by the scope function
   *
   * @example
   * ```typescript
   * import { z } from 'zod';
   *
   * const EmailSchema = z.object({
   *   subject: z.string(),
   *   category: z.enum(['support', 'sales', 'feedback'])
   * });
   *
   * const result = await client.scope('email-processing', async (ctx) => {
   *   const email = await ctx.infer(EmailSchema, rawEmailText);
   *
   *   if (email.confidence < 0.8) {
   *     throw new Error('Low confidence classification');
   *   }
   *
   *   return ctx.use(email);
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Nested scopes with bridging
   * const analysis = await client.scope('admin', async (adminCtx) => {
   *   const adminData = await adminCtx.infer(DataSchema, document);
   *
   *   return await client.scope('processing', async (processCtx) => {
   *     // Must explicitly bridge to use admin data
   *     const bridged = processCtx.bridge(adminData);
   *     return bridged;
   *   });
   * });
   * ```
   */
  scope<S extends string, R>(
    name: S,
    fn: (ctx: MullionContext<S>) => Promise<R>,
  ): Promise<R>;
}

/**
 * Creates a Mullion client with Vercel AI SDK integration.
 *
 * This function wraps a Vercel AI SDK language model to provide type-safe
 * context management for LLM operations. The returned client can create
 * scoped contexts where all LLM-generated values are properly tagged and
 * tracked for provenance.
 *
 * @param model - A Vercel AI SDK language model instance
 * @param options - Optional client configuration
 * @returns A Mullion client with scope() method
 *
 * @example
 * ```typescript
 * import { createMullionClient } from '@mullion/ai-sdk';
 * import { openai } from '@ai-sdk/openai';
 * import { anthropic } from '@ai-sdk/anthropic';
 *
 * // With OpenAI
 * const client = createMullionClient(openai('gpt-4'));
 *
 * // With Anthropic
 * const client = createMullionClient(anthropic('claude-3-5-sonnet-20241022'));
 *
 * // Use the client
 * const result = await client.scope('analysis', async (ctx) => {
 *   const data = await ctx.infer(Schema, input);
 *   return data.value;
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With custom model configuration
 * import { openai } from '@ai-sdk/openai';
 *
 * const model = openai('gpt-4', {
 *   apiKey: process.env.OPENAI_API_KEY,
 * });
 *
 * const client = createMullionClient(model);
 * ```
 */
/**
 * Configuration options for Mullion client.
 */
export interface MullionClientOptions {
  /** LLM provider name for cache optimization */
  readonly provider?: Provider;

  /** Model identifier for provider-specific features */
  readonly model?: string;

  /** Enable cache segments API (default: false) */
  readonly enableCache?: boolean;

  /** Default provider-specific options for all infer() calls */
  readonly providerOptions?: ProviderCallOptions;
}

/**
 * Cache options for infer() method.
 */
export interface CacheOptions {
  /** Cache strategy for this inference call */
  readonly cache?: 'use-segments' | 'none';
}

/**
 * Extended InferOptions that includes cache configuration.
 */
export interface MullionInferOptions extends InferOptions, CacheOptions {
  /** Provider-specific options for this inference call */
  readonly providerOptions?: ProviderCallOptions;
}

/**
 * Extended Context interface that includes cache segments API and cost tracking.
 */
export interface MullionContext<S extends string> extends Context<S> {
  /** Cache segments manager for this context */
  readonly cache: CacheSegmentManager;

  /** Enhanced infer method with cache options */
  infer<T>(
    schema: z.ZodType<T> & {_type?: T},
    input: string,
    options?: MullionInferOptions,
  ): Promise<Owned<T, S>>;

  /** Get aggregated cache statistics for this context */
  getCacheStats(): CacheStats;

  /**
   * Get cost breakdown for the last API call made in this context.
   *
   * Returns detailed cost information including input/output costs,
   * cache costs, and savings analysis. Returns null if no calls have
   * been made yet.
   *
   * @returns Cost breakdown from last infer() call or null
   *
   * @example
   * ```typescript
   * await ctx.infer(schema, prompt);
   * const cost = ctx.getLastCallCost();
   * if (cost) {
   *   console.log(`Total: $${cost.totalCost.toFixed(4)}`);
   *   console.log(`Savings: ${cost.savingsPercent.toFixed(1)}%`);
   * }
   * ```
   */
  getLastCallCost(): CostBreakdown | null;

  /**
   * Estimate cost for a potential API call before making it.
   *
   * Provides pre-call cost estimation based on token count estimation
   * and current model pricing. Useful for cost-aware decision making.
   *
   * @param prompt - The prompt text to estimate cost for
   * @param estimatedOutputTokens - Expected output tokens (default: 500)
   * @returns Estimated cost breakdown
   *
   * @example
   * ```typescript
   * const estimate = ctx.estimateNextCallCost(longDocument);
   * if (estimate.totalCost > 0.10) {
   *   console.warn('This call will be expensive!');
   * }
   * await ctx.infer(schema, longDocument);
   * ```
   *
   * @example
   * ```typescript
   * // Compare estimate vs actual
   * const estimate = ctx.estimateNextCallCost(prompt, 200);
   * await ctx.infer(schema, prompt);
   * const actual = ctx.getLastCallCost();
   *
   * if (actual) {
   *   const diff = actual.totalCost - estimate.totalCost;
   *   console.log(`Estimation error: $${Math.abs(diff).toFixed(4)}`);
   * }
   * ```
   */
  estimateNextCallCost(
    prompt: string,
    estimatedOutputTokens?: number,
  ): CostBreakdown;
}

export function createMullionClient(
  model: LanguageModel,
  clientOptions: MullionClientOptions = {},
): MullionClient {
  return {
    async scope<S extends string, R>(
      name: S,
      fn: (ctx: MullionContext<S>) => Promise<R>,
    ): Promise<R> {
      // Create cache segment manager (always create one, but it may be disabled)
      const cacheManager =
        clientOptions.enableCache &&
        clientOptions.provider &&
        clientOptions.model
          ? createCacheSegmentManager(
              clientOptions.provider,
              clientOptions.model,
              createDefaultCacheConfig({enabled: true}),
            )
          : createCacheSegmentManager(
              clientOptions.provider ?? ('openai' as Provider),
              clientOptions.model ?? 'gpt-4',
              createDefaultCacheConfig({enabled: false}),
            );

      // Create metrics collector for cache statistics
      const metricsCollector =
        clientOptions.provider && clientOptions.model
          ? new CacheMetricsCollector(
              clientOptions.provider,
              clientOptions.model,
            )
          : undefined;

      // Cost tracking state
      let lastCallCost: CostBreakdown | null = null;

      // Create context with working infer implementation and cache manager
      const ctx: MullionContext<S> = {
        scope: name,
        cache: cacheManager,

        /**
         * Infer a typed value from unstructured input using the LLM.
         *
         * Uses Vercel AI SDK's generateObject to extract structured data
         * according to the provided Zod schema. The result is wrapped in
         * an Owned type tagged with this scope.
         *
         * Cache Integration:
         * - `cache: 'use-segments'` (default): Uses segments from cache manager
         * - `cache: 'none'`: Disables caching for this call
         *
         * Confidence is automatically extracted from the LLM's finish reason:
         * - `stop` (1.0): Model completed naturally
         * - `tool-calls` (0.95): Model made tool calls
         * - `length` (0.75): Output truncated due to token limit
         * - `content-filter` (0.6): Content was filtered
         * - `other` (0.5): Unknown reason
         * - `error` (0.3): Error occurred
         */
        async infer<T>(
          schema: z.ZodType<T> & {_type?: T},
          input: string,
          options?: MullionInferOptions,
        ): Promise<Owned<T, S>> {
          // Determine cache strategy (use client-level provider/model info)
          const cacheStrategy = options?.cache ?? 'use-segments';
          const useCache = cacheStrategy !== 'none' && cacheManager;
          const segments = cacheManager.getSegments();

          const applyCacheControl =
            useCache &&
            clientOptions.provider === 'anthropic' &&
            !!clientOptions.model;

          const buildCacheProviderOptions = (
            ttl?: '5m' | '1h',
          ): ProviderPromptOptions | undefined =>
            applyCacheControl
              ? {
                  anthropic: {
                    cacheControl: {
                      type: 'ephemeral' as const,
                      ...(ttl ? {ttl} : {}),
                    },
                  },
                }
              : undefined;

          const buildPromptOptions = (): Prompt => {
            if (segments.length === 0) {
              return {
                prompt: input,
                system: options?.systemPrompt,
              };
            }

            const systemMessages: ModelMessage[] = [];
            if (options?.systemPrompt) {
              systemMessages.push({
                role: 'system',
                content: options.systemPrompt,
              });
            }

            const userParts: {
              type: 'text';
              text: string;
              providerOptions?: ProviderPromptOptions;
            }[] = [];

            for (const segment of segments) {
              const providerOptions = buildCacheProviderOptions(segment.ttl);
              if (segment.scope === 'system-only') {
                systemMessages.push({
                  role: 'system',
                  content: segment.content,
                  ...(providerOptions ? {providerOptions} : {}),
                });
              } else {
                userParts.push({
                  type: 'text',
                  text: segment.content,
                  ...(providerOptions ? {providerOptions} : {}),
                });
              }
            }

            userParts.push({type: 'text', text: input});

            const messages: ModelMessage[] = [
              ...systemMessages,
              {role: 'user', content: userParts},
            ];

            return {messages};
          };

          // Use Vercel AI SDK to generate structured output
          const result = await generateObject({
            model,
            schema,
            ...buildPromptOptions(),
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
            providerOptions:
              options?.providerOptions ?? clientOptions.providerOptions,
          });

          // Extract confidence from finish reason
          const confidence = extractConfidenceFromFinishReason(
            result.finishReason,
          );

          // Collect cache metrics from the result
          if (metricsCollector && result.usage) {
            const usageWithRaw = result.usage as {
              raw?: Record<string, unknown>;
            };
            const providerMetadata = result.providerMetadata as
              | Record<string, unknown>
              | undefined;
            let providerUsage: Record<string, unknown> | undefined;
            if (providerMetadata && typeof providerMetadata === 'object') {
              for (const entry of Object.values(providerMetadata)) {
                if (entry && typeof entry === 'object' && 'usage' in entry) {
                  const usage = (entry as Record<string, unknown>).usage;
                  if (usage && typeof usage === 'object') {
                    providerUsage = usage as Record<string, unknown>;
                    break;
                  }
                }
              }
            }
            const metricsSource =
              usageWithRaw.raw && typeof usageWithRaw.raw === 'object'
                ? usageWithRaw.raw
                : providerUsage && typeof providerUsage === 'object'
                  ? providerUsage
                  : (result.usage as Record<string, unknown>);

            metricsCollector.addMetrics(metricsSource);
          }

          // Calculate cost for this call
          if (result.usage && clientOptions.model) {
            const usage: TokenUsage = {
              inputTokens: result.usage.inputTokens ?? 0,
              outputTokens: result.usage.outputTokens ?? 0,
            };

            // Get the most recent cache stats (last item in the array)
            const individualStats = metricsCollector
              ? metricsCollector.getIndividualStats()
              : [];
            const cacheStats =
              individualStats.length > 0
                ? individualStats[individualStats.length - 1]
                : null;

            lastCallCost = calculateCost(
              usage,
              cacheStats,
              clientOptions.model,
            );
          }

          // Generate trace ID with cache information
          const traceId = `${name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

          // Wrap in Owned with scope and confidence
          return createOwned({
            value: result.object,
            scope: name,
            confidence,
            traceId,
          });
        },

        /**
         * Bridge a value from another scope into this context.
         *
         * Creates a new Owned value with a union scope type that tracks
         * both the source and destination scopes.
         */
        bridge<T, OS extends string>(owned: Owned<T, OS>): Owned<T, S | OS> {
          return {
            value: owned.value,
            confidence: owned.confidence,
            __scope: name as S | OS,
            traceId: owned.traceId,
          };
        },

        /**
         * Extract the raw value from an Owned wrapper.
         *
         * Only accepts values whose scope matches this context's scope.
         * Throws an error at runtime if there's a scope mismatch.
         */
        use<T>(owned: Owned<T, S>): T {
          if (owned.__scope !== name) {
            throw new Error(
              `Scope mismatch: attempting to use value from scope '${owned.__scope}' ` +
                `in scope '${name}'. Use bridge() to explicitly transfer values between scopes.`,
            );
          }

          return owned.value;
        },

        /**
         * Get aggregated cache statistics for this context.
         *
         * Returns cumulative metrics from all infer() calls made within
         * this scope, including cache hit rates and cost savings.
         */
        getCacheStats(): CacheStats {
          return (
            metricsCollector?.getAggregatedStats() ?? {
              provider: 'unknown',
              cacheWriteTokens: 0,
              cacheReadTokens: 0,
              inputTokens: 0,
              outputTokens: 0,
              savedTokens: 0,
              cacheHitRate: 0,
              estimatedSavingsUsd: 0,
              raw: {noMetrics: true},
            }
          );
        },

        /**
         * Get cost breakdown for the last API call made in this context.
         */
        getLastCallCost(): CostBreakdown | null {
          return lastCallCost;
        },

        /**
         * Estimate cost for a potential API call before making it.
         */
        estimateNextCallCost(
          prompt: string,
          estimatedOutputTokens = 500,
        ): CostBreakdown {
          if (!clientOptions.model) {
            throw new Error(
              'Cannot estimate cost: model identifier not provided in client options',
            );
          }

          // Estimate input tokens from prompt
          const tokenEstimate = estimateTokens(prompt, clientOptions.model);

          // Use cache info if available
          const useCache =
            clientOptions.enableCache &&
            cacheManager &&
            cacheManager.getSegments().length > 0;

          return estimateCost(
            tokenEstimate.count,
            estimatedOutputTokens,
            clientOptions.model,
            useCache,
          );
        },
      };

      // Execute the scoped function with the context
      return await fn(ctx);
    },
  };
}
