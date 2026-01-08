import type { LanguageModel, FinishReason } from 'ai';
import { generateObject } from 'ai';
import type { z } from 'zod';
import { createOwned } from '@mullion/core';
import type { Context, InferOptions, Owned } from '@mullion/core';
import type { CacheSegmentManager } from './cache/segments.js';
import { createCacheSegmentManager } from './cache/segments.js';
import {
  createDefaultCacheConfig,
  createAnthropicAdapter,
  createOpenAIAdapter,
} from './cache/types.js';
import type { Provider } from './cache/capabilities.js';
import type { CacheStats } from './cache/metrics.js';
import { CacheMetricsCollector } from './cache/metrics.js';

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
  finishReason: FinishReason
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
    fn: (ctx: Context<S>) => Promise<R>
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
export interface MullionInferOptions extends InferOptions, CacheOptions {}

/**
 * Extended Context interface that includes cache segments API.
 */
export interface MullionContext<S extends string> extends Context<S> {
  /** Cache segments manager for this context */
  readonly cache: CacheSegmentManager;

  /** Enhanced infer method with cache options */
  infer<T>(
    schema: z.ZodType<T> & { _type?: T },
    input: string,
    options?: MullionInferOptions
  ): Promise<Owned<T, S>>;

  /** Get aggregated cache statistics for this context */
  getCacheStats(): CacheStats;
}

export function createMullionClient(
  model: LanguageModel,
  clientOptions: MullionClientOptions = {}
): MullionClient {
  return {
    async scope<S extends string, R>(
      name: S,
      fn: (ctx: Context<S>) => Promise<R>
    ): Promise<R> {
      // Create cache segment manager if enabled
      const cacheManager =
        clientOptions.enableCache &&
        clientOptions.provider &&
        clientOptions.model
          ? createCacheSegmentManager(
              clientOptions.provider,
              clientOptions.model,
              createDefaultCacheConfig({ enabled: true })
            )
          : undefined;

      // Create metrics collector for cache statistics
      const metricsCollector =
        clientOptions.provider && clientOptions.model
          ? new CacheMetricsCollector(
              clientOptions.provider,
              clientOptions.model
            )
          : undefined;

      // Create context with working infer implementation and cache manager
      const ctx: Context<S> & {
        cache?: CacheSegmentManager;
        getCacheStats?: () => CacheStats;
      } = {
        scope: name,

        // Add cache manager if enabled
        ...(cacheManager ? { cache: cacheManager } : {}),

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
          schema: z.ZodType<T> & { _type?: T },
          input: string,
          options?: MullionInferOptions
        ): Promise<Owned<T, S>> {
          // Determine cache strategy (use client-level provider/model info)
          const cacheStrategy = options?.cache ?? 'use-segments';
          const useCache = cacheStrategy !== 'none' && cacheManager;

          // Prepare provider options with cache if enabled
          let providerOptions = {};
          if (useCache) {
            const segments = cacheManager.getSegments();

            if (
              segments.length > 0 &&
              clientOptions.provider === 'anthropic' &&
              clientOptions.model
            ) {
              // Convert segments to Anthropic provider options
              const adapter = createAnthropicAdapter(clientOptions.model);
              const cacheConfig = createDefaultCacheConfig({
                enabled: true,
                breakpoints: segments.length,
              });
              const anthropicOptions = adapter.toProviderOptions(cacheConfig);

              if (anthropicOptions.cache) {
                providerOptions = {
                  // Map to Anthropic's cache control format
                  experimental_providerMetadata: {
                    anthropic: {
                      cacheControl: segments.map((segment) => ({
                        type: 'ephemeral' as const,
                        ...(segment.ttl ? { ttl: segment.ttl } : {}),
                      })),
                    },
                  },
                };
              }
            } else if (
              clientOptions.provider === 'openai' &&
              clientOptions.model
            ) {
              // OpenAI uses automatic caching - no special provider options needed
              const adapter = createOpenAIAdapter(clientOptions.model);
              const cacheConfig = createDefaultCacheConfig({ enabled: true });
              const openaiOptions = adapter.toProviderOptions(cacheConfig);

              if (openaiOptions.autoCaching) {
                providerOptions = {
                  experimental_providerMetadata: {
                    openai: {
                      caching: true,
                    },
                  },
                };
              }
            }
          }

          // Use Vercel AI SDK to generate structured output
          const result = await generateObject({
            model,
            schema,
            prompt: input,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
            system: options?.systemPrompt,
            ...providerOptions,
          });

          // Extract confidence from finish reason
          const confidence = extractConfidenceFromFinishReason(
            result.finishReason
          );

          // Collect cache metrics from the result
          if (metricsCollector && result.usage) {
            metricsCollector.addMetrics(
              result.usage as Record<string, unknown>
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
                `in scope '${name}'. Use bridge() to explicitly transfer values between scopes.`
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
              raw: { noMetrics: true },
            }
          );
        },
      };

      // Execute the scoped function with the context
      return await fn(ctx);
    },
  };
}
