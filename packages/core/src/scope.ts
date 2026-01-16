import type {Context, Schema, InferOptions} from './context.js';
import type {Owned} from './owned.js';

/**
 * Creates a scoped execution context for LLM operations.
 *
 * The `scope` function establishes a type-safe boundary for LLM-generated values.
 * All values created within the scope are tagged with the scope identifier,
 * enabling compile-time detection of context leaks.
 *
 * This is the primary entry point for creating isolated execution contexts
 * in Mullion applications.

 *
 * @template S - The scope identifier (string literal type)
 * @template R - The return type of the scope function
 * @param name - The scope identifier (must be a string literal for type safety)
 * @param fn - Async function that receives a Context and returns a value
 * @returns Promise resolving to the value returned by the scope function
 *
 * @example
 * ```typescript
 * // Basic usage with simple scope
 * const result = await scope('user-input', async (ctx) => {
 *   // ctx is Context<'user-input'>
 *   const email = await ctx.infer(EmailSchema, userMessage);
 *   return email.value;
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Nested scopes for different security boundaries
 * const analysis = await scope('admin', async (adminCtx) => {
 *   const adminData = await adminCtx.infer(DataSchema, document);
 *
 *   // Create nested scope for processing
 *   const processed = await scope('processing', async (processCtx) => {
 *     // Must explicitly bridge to use admin data
 *     const bridged = processCtx.bridge(adminData);
 *     return bridged;
 *   });
 *
 *   return processed;
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using scope with type inference
 * const userIntent = await scope('chat', async (ctx) => {
 *   const intent = await ctx.infer(IntentSchema, userMessage);
 *
 *   if (intent.confidence < 0.8) {
 *     throw new Error('Low confidence intent');
 *   }
 *
 *   // Return unwrapped value
 *   return ctx.use(intent);
 * });
 * // userIntent has the unwrapped type
 * ```
 *
 * @example
 * ```typescript
 * // Returning Owned values from scope
 * const ownedResult = await scope('analysis', async (ctx) => {
 *   const data = await ctx.infer(AnalysisSchema, input);
 *   // data: Owned<Analysis, 'analysis'>
 *
 *   // Return the Owned value directly
 *   return data;
 * });
 * // ownedResult: Owned<Analysis, 'analysis'>
 * ```
 */
export async function scope<S extends string, R>(
  name: S,
  fn: (ctx: Context<S>) => Promise<R>,
): Promise<R> {
  // Create the context instance for this scope
  const ctx: Context<S> = {
    scope: name,

    /**
     * Infer method - placeholder that throws
     * (actual implementation provided by integration packages like @mullion/ai-sdk)
     */
    infer<T>(
      _schema: Schema<T>,
      _input: string,
      _options?: InferOptions,
    ): Promise<Owned<T, S>> {
      return Promise.reject(
        new Error(
          'Context.infer() is not implemented. ' +
            'This method is a placeholder provided by @mullion/core. ' +
            'To use LLM inference, install an integration package like @mullion/ai-sdk ' +
            'which provides a working implementation.',
        ),
      );
    },

    /**
     * Bridge method - transfers a value from another scope into this scope
     * Creates a union type that tracks both source and destination scopes
     */
    bridge<T, OS extends string>(owned: Owned<T, OS>): Owned<T, S | OS> {
      // Create new Owned value with union scope
      return {
        value: owned.value,
        confidence: owned.confidence,
        __scope: name as S | OS, // TypeScript knows this is S | OS from the return type
        traceId: owned.traceId,
      };
    },

    /**
     * Use method - extracts the raw value from an Owned wrapper
     * Only accepts values whose scope includes this scope (S)
     */
    use<T>(owned: Owned<T, S>): T {
      // Runtime validation that the scope matches
      if (owned.__scope !== name) {
        throw new Error(
          `Scope mismatch: attempting to use value from scope '${owned.__scope}' ` +
            `in scope '${name}'. Use bridge() to explicitly transfer values between scopes.`,
        );
      }

      return owned.value;
    },
  };

  // Execute the scoped function with the context
  return await fn(ctx);
}
