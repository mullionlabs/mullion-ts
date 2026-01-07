import type { LanguageModel, FinishReason } from 'ai';
import { generateObject } from 'ai';
import type { z } from 'zod';
import { createOwned } from '@scopestack/core';
import type { Context, InferOptions, Owned } from '@scopestack/core';
import type { CacheSegmentsAPI } from './cache-segments.js';
import { createCacheSegmentsAPI } from './cache-segments.js';
import { createCacheConfig } from './cache-config.js';
import type { Provider } from './cache-capabilities.js';

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
 * ScopeStack client for Vercel AI SDK integration.
 *
 * Provides a scoped execution environment with LLM inference capabilities.
 * The client wraps a language model and provides type-safe context management
 * for all LLM operations.
 *
 * @example
 * ```typescript
 * import { createScopeStackClient } from '@scopestack/ai-sdk';
 * import { openai } from '@ai-sdk/openai';
 *
 * const client = createScopeStackClient(openai('gpt-4'));
 *
 * const result = await client.scope('user-query', async (ctx) => {
 *   const intent = await ctx.infer(IntentSchema, userMessage);
 *   return intent.value;
 * });
 * ```
 */
export interface ScopeStackClient {
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
 * Creates a ScopeStack client with Vercel AI SDK integration.
 *
 * This function wraps a Vercel AI SDK language model to provide type-safe
 * context management for LLM operations. The returned client can create
 * scoped contexts where all LLM-generated values are properly tagged and
 * tracked for provenance.
 *
 * @param model - A Vercel AI SDK language model instance
 * @param options - Optional client configuration
 * @returns A ScopeStack client with scope() method
 *
 * @example
 * ```typescript
 * import { createScopeStackClient } from '@scopestack/ai-sdk';
 * import { openai } from '@ai-sdk/openai';
 * import { anthropic } from '@ai-sdk/anthropic';
 *
 * // With OpenAI
 * const client = createScopeStackClient(openai('gpt-4'));
 *
 * // With Anthropic
 * const client = createScopeStackClient(anthropic('claude-3-5-sonnet-20241022'));
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
 * const client = createScopeStackClient(model);
 * ```
 */
/**
 * Configuration options for ScopeStack client.
 */
export interface ScopeStackClientOptions {
  /** LLM provider name for cache optimization */
  readonly provider?: Provider;

  /** Model identifier for provider-specific features */
  readonly model?: string;

  /** Enable cache segments API (default: false) */
  readonly enableCache?: boolean;
}

/**
 * Extended Context interface that includes cache segments API.
 */
export interface ScopeStackContext<S extends string> extends Context<S> {
  /** Cache segments API for this context */
  readonly cache: CacheSegmentsAPI;
}

export function createScopeStackClient(
  model: LanguageModel,
  options: ScopeStackClientOptions = {}
): ScopeStackClient {
  return {
    async scope<S extends string, R>(
      name: S,
      fn: (ctx: Context<S>) => Promise<R>
    ): Promise<R> {
      // Create cache API if enabled
      const cacheAPI =
        options.enableCache && options.provider && options.model
          ? createCacheSegmentsAPI(
              options.provider,
              options.model,
              createCacheConfig() // Use default cache config for now
            )
          : undefined;

      // Create context with working infer implementation and optional cache API
      const ctx: Context<S> & { cache?: CacheSegmentsAPI } = {
        scope: name,

        // Add cache API if enabled
        ...(cacheAPI ? { cache: cacheAPI } : {}),

        /**
         * Infer a typed value from unstructured input using the LLM.
         *
         * Uses Vercel AI SDK's generateObject to extract structured data
         * according to the provided Zod schema. The result is wrapped in
         * an Owned type tagged with this scope.
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
          options?: InferOptions
        ): Promise<Owned<T, S>> {
          // Use Vercel AI SDK to generate structured output
          const result = await generateObject({
            model,
            schema,
            prompt: input,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
            system: options?.systemPrompt,
          });

          // Extract confidence from finish reason
          const confidence = extractConfidenceFromFinishReason(
            result.finishReason
          );

          // Record metrics if cache is enabled and metrics collection is on
          if (cacheAPI && result.usage && cacheAPI._recordMetrics) {
            cacheAPI._recordMetrics(result.usage);
          }

          // Wrap in Owned with scope and extracted confidence
          return createOwned({
            value: result.object,
            scope: name,
            confidence,
            traceId: `${name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
      };

      // Execute the scoped function with the context
      return await fn(ctx);
    },
  };
}
