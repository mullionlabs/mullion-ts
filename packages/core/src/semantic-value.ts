import { z } from 'zod';
import type { Owned } from './owned.js';
import { ownedSchema } from './owned.js';

/**
 * SemanticValue represents an LLM-generated value with semantic alternatives and reasoning.
 *
 * Extends {@link Owned} to include additional semantic information:
 * - Alternative interpretations the LLM considered
 * - Reasoning behind the chosen value
 *
 * This is useful when you need to:
 * - Understand why the LLM chose a particular interpretation
 * - Present alternative options to users
 * - Debug or audit LLM decision-making
 * - Implement fallback logic based on alternatives
 *
 * @template T - The type of the wrapped value
 * @template S - The scope identifier (string literal type for compile-time safety)
 *
 * @example
 * ```typescript
 * // LLM extracts user intent with alternatives
 * const intent: SemanticValue<UserIntent, 'customer-support'> = {
 *   value: { action: 'refund', amount: 50 },
 *   confidence: 0.85,
 *   __scope: 'customer-support',
 *   traceId: 'trace-123',
 *   alternatives: [
 *     { value: { action: 'exchange', amount: 50 }, confidence: 0.70 },
 *     { value: { action: 'credit', amount: 50 }, confidence: 0.60 }
 *   ],
 *   reasoning: 'Customer explicitly mentioned "refund" and expressed dissatisfaction'
 * };
 *
 * // Use alternatives for fallback logic
 * if (intent.confidence < 0.9 && intent.alternatives.length > 0) {
 *   console.log('Consider alternatives:', intent.alternatives);
 * }
 * ```
 *
 * @see {@link Owned} Base type for LLM-generated values
 * @see {@link createSemanticValue} Factory function for creating SemanticValue instances
 * @see {@link isSemanticValue} Type guard for runtime checking
 */
export interface SemanticValue<T, S extends string> extends Owned<T, S> {
  /**
   * Alternative interpretations the LLM considered but ranked lower.
   *
   * Each alternative includes:
   * - `value`: The alternative interpretation
   * - `confidence`: The LLM's confidence in this alternative (0-1)
   *
   * Alternatives are typically sorted by confidence in descending order.
   *
   * @example
   * ```typescript
   * const sentiment: SemanticValue<Sentiment, 'reviews'> = {
   *   value: 'positive',
   *   confidence: 0.75,
   *   __scope: 'reviews',
   *   traceId: 'trace-456',
   *   alternatives: [
   *     { value: 'neutral', confidence: 0.65 },
   *     { value: 'mixed', confidence: 0.55 }
   *   ],
   *   reasoning: 'Overall positive tone but with some concerns mentioned'
   * };
   *
   * // Handle low-confidence cases
   * if (sentiment.confidence < 0.8) {
   *   console.log('Low confidence, alternatives:', sentiment.alternatives);
   * }
   * ```
   */
  readonly alternatives: readonly Alternative<T>[];

  /**
   * The LLM's reasoning or explanation for choosing this value.
   *
   * This field captures why the LLM selected the primary value over alternatives.
   * Useful for:
   * - Debugging unexpected results
   * - Auditing LLM decisions
   * - Providing explanations to end users
   * - Training and improving prompts
   *
   * @example
   * ```typescript
   * const category: SemanticValue<Category, 'content-moderation'> = {
   *   value: 'spam',
   *   confidence: 0.92,
   *   __scope: 'content-moderation',
   *   traceId: 'trace-789',
   *   alternatives: [
   *     { value: 'promotional', confidence: 0.45 }
   *   ],
   *   reasoning: 'Message contains multiple spam indicators: ' +
   *              'misleading subject line, excessive links, and urgent language'
   * };
   *
   * // Log reasoning for audit trail
   * console.log(`Classified as ${category.value}: ${category.reasoning}`);
   * ```
   */
  readonly reasoning: string;
}

/**
 * Represents an alternative interpretation with its confidence score.
 *
 * @template T - The type of the alternative value
 */
export interface Alternative<T> {
  /**
   * The alternative value.
   */
  readonly value: T;

  /**
   * Confidence score for this alternative (0-1).
   *
   * Typically lower than the primary value's confidence.
   */
  readonly confidence: number;
}

/**
 * Configuration options for creating a SemanticValue.
 *
 * @template T - The type of the value
 * @template S - The scope identifier
 */
export interface CreateSemanticValueOptions<T, S extends string> {
  /**
   * The primary value chosen by the LLM.
   */
  value: T;

  /**
   * The scope that owns this value.
   */
  scope: S;

  /**
   * Confidence score for the primary value (0-1). Defaults to 1.0 if not provided.
   */
  confidence?: number;

  /**
   * Alternative interpretations the LLM considered. Defaults to empty array.
   */
  alternatives?: readonly Alternative<T>[];

  /**
   * The LLM's reasoning for choosing this value. Defaults to empty string.
   */
  reasoning?: string;

  /**
   * Optional trace ID. Auto-generated if not provided.
   */
  traceId?: string;
}

/**
 * Creates a SemanticValue with the specified configuration.
 *
 * Factory function that wraps a value with semantic metadata including
 * alternatives and reasoning. Validates confidence scores and ensures
 * alternatives are properly ordered.
 *
 * @template T - The type of the value
 * @template S - The scope identifier
 * @param options - Configuration for creating the SemanticValue
 * @returns A SemanticValue with all required metadata
 * @throws {Error} If confidence is not between 0 and 1
 * @throws {Error} If any alternative confidence is not between 0 and 1
 *
 * @example
 * ```typescript
 * const classification = createSemanticValue({
 *   value: 'technical-support',
 *   scope: 'ticket-routing',
 *   confidence: 0.88,
 *   alternatives: [
 *     { value: 'billing', confidence: 0.65 },
 *     { value: 'general-inquiry', confidence: 0.45 }
 *   ],
 *   reasoning: 'Customer mentioned "server error" and "API timeout"'
 * });
 *
 * console.log(classification.value); // 'technical-support'
 * console.log(classification.alternatives.length); // 2
 * console.log(classification.reasoning); // 'Customer mentioned...'
 * ```
 *
 * @example
 * ```typescript
 * // Simple case with minimal options
 * const simpleValue = createSemanticValue({
 *   value: { intent: 'greeting' },
 *   scope: 'chatbot',
 *   reasoning: 'User said "hello"'
 * });
 * // confidence defaults to 1.0, alternatives defaults to []
 * ```
 */
export function createSemanticValue<T, S extends string>(
  options: CreateSemanticValueOptions<T, S>
): SemanticValue<T, S> {
  const {
    value,
    scope,
    confidence = 1.0,
    alternatives = [],
    reasoning = '',
    traceId,
  } = options;

  // Validate primary confidence range
  if (confidence < 0 || confidence > 1) {
    throw new Error(`Confidence must be between 0 and 1, got ${confidence}`);
  }

  // Validate alternative confidence ranges
  for (const alt of alternatives) {
    if (alt.confidence < 0 || alt.confidence > 1) {
      throw new Error(
        `Alternative confidence must be between 0 and 1, got ${alt.confidence}`
      );
    }
  }

  return {
    value,
    confidence,
    __scope: scope,
    traceId: traceId ?? generateTraceId(),
    alternatives,
    reasoning,
  };
}

/**
 * Type guard to check if a value is a SemanticValue type.
 *
 * Performs runtime validation to determine if an unknown value conforms
 * to the SemanticValue interface structure.
 *
 * @param value - The value to check
 * @returns True if the value is a SemanticValue type, false otherwise
 *
 * @example
 * ```typescript
 * function processResult(result: unknown) {
 *   if (isSemanticValue(result)) {
 *     // TypeScript knows result is SemanticValue<unknown, string>
 *     console.log(`Primary value: ${result.value}`);
 *     console.log(`Reasoning: ${result.reasoning}`);
 *     console.log(`Alternatives: ${result.alternatives.length}`);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * const apiResponse = await fetchFromLLM();
 *
 * if (isSemanticValue(apiResponse)) {
 *   // Safe to access SemanticValue properties
 *   if (apiResponse.confidence < 0.7 && apiResponse.alternatives.length > 0) {
 *     console.warn('Low confidence, consider alternatives');
 *     console.log('Reasoning:', apiResponse.reasoning);
 *   }
 * }
 * ```
 */
export function isSemanticValue(
  value: unknown
): value is SemanticValue<unknown, string> {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('value' in value) ||
    !('confidence' in value) ||
    typeof (value as Record<string, unknown>).confidence !== 'number' ||
    !('__scope' in value) ||
    typeof (value as Record<string, unknown>).__scope !== 'string' ||
    !('traceId' in value) ||
    typeof (value as Record<string, unknown>).traceId !== 'string'
  ) {
    return false;
  }

  // Check SemanticValue-specific fields
  const record = value as Record<string, unknown>;

  // Check alternatives
  if (!('alternatives' in record)) {
    return false;
  }
  if (!Array.isArray(record.alternatives)) {
    return false;
  }
  for (const alt of record.alternatives) {
    if (
      typeof alt !== 'object' ||
      alt === null ||
      !('value' in alt) ||
      !('confidence' in alt) ||
      typeof (alt as Record<string, unknown>).confidence !== 'number'
    ) {
      return false;
    }
  }

  // Check reasoning
  if (!('reasoning' in record) || typeof record.reasoning !== 'string') {
    return false;
  }

  return true;
}

/**
 * Generates a unique trace identifier.
 *
 * Creates a trace ID using timestamp and random values for uniqueness.
 * Format: `trace-{timestamp}-{random}`
 *
 * @returns A unique trace identifier string
 * @internal
 */
function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `trace-${timestamp}-${random}`;
}

/**
 * Zod schema for runtime validation of Alternative values.
 *
 * @template T - The Zod schema for the alternative value type
 * @param valueSchema - Zod schema for the value field
 * @returns A Zod schema for the Alternative type
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 *
 * const CategorySchema = z.enum(['spam', 'legitimate', 'promotional']);
 * const AlternativeSchema = alternativeSchema(CategorySchema);
 *
 * const result = AlternativeSchema.safeParse({
 *   value: 'spam',
 *   confidence: 0.85
 * });
 * ```
 */
export function alternativeSchema<T extends z.ZodTypeAny>(
  valueSchema: T
): z.ZodObject<{
  value: T;
  confidence: z.ZodNumber;
}> {
  return z.object({
    value: valueSchema,
    confidence: z.number().min(0).max(1),
  });
}

/**
 * Zod schema for runtime validation of SemanticValue instances.
 *
 * Useful for validating data from external sources or untrusted inputs.
 *
 * @template T - The Zod schema for the value type
 * @template S - The Zod schema for the scope type (typically z.string())
 * @param valueSchema - Zod schema for the value field
 * @param scopeSchema - Zod schema for the scope field (optional, defaults to z.string())
 * @returns A Zod schema for the SemanticValue type
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 *
 * const IntentSchema = z.object({
 *   action: z.enum(['refund', 'exchange', 'support']),
 *   priority: z.number()
 * });
 *
 * const SemanticIntentSchema = semanticValueSchema(
 *   IntentSchema,
 *   z.literal('customer-service')
 * );
 *
 * // Validate untrusted data
 * const result = SemanticIntentSchema.safeParse(untrustedData);
 * if (result.success) {
 *   const semanticIntent: SemanticValue<Intent, 'customer-service'> = result.data;
 *   console.log(semanticIntent.reasoning);
 * }
 * ```
 */
export function semanticValueSchema<
  T extends z.ZodTypeAny,
  S extends z.ZodTypeAny = z.ZodString,
>(
  valueSchema: T,
  scopeSchema?: S
): z.ZodObject<{
  value: T;
  confidence: z.ZodNumber;
  __scope: S extends undefined ? z.ZodString : S;
  traceId: z.ZodString;
  alternatives: z.ZodArray<
    z.ZodObject<{
      value: T;
      confidence: z.ZodNumber;
    }>
  >;
  reasoning: z.ZodString;
}> {
  // Get the base Owned schema fields
  const baseSchema = ownedSchema(valueSchema, scopeSchema);

  // Extend with SemanticValue-specific fields
  return baseSchema.extend({
    alternatives: z.array(alternativeSchema(valueSchema)),
    reasoning: z.string(),
  }) as z.ZodObject<{
    value: T;
    confidence: z.ZodNumber;
    __scope: S extends undefined ? z.ZodString : S;
    traceId: z.ZodString;
    alternatives: z.ZodArray<
      z.ZodObject<{
        value: T;
        confidence: z.ZodNumber;
      }>
    >;
    reasoning: z.ZodString;
  }>;
}
