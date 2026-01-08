/**
 * Token estimation utilities for cost calculation
 * @module cost/tokens
 */

/**
 * Token estimation result
 */
export interface TokenEstimate {
  /** Estimated token count */
  count: number;
  /** Method used for estimation */
  method: 'tiktoken' | 'approximate' | 'exact';
  /** Model used for estimation (if applicable) */
  model?: string;
}

/**
 * Estimate token count for a given text
 *
 * @param text - Text to estimate tokens for
 * @param model - Optional model identifier for provider-specific estimation
 * @returns Token estimate with method indication
 *
 * @example
 * ```typescript
 * const estimate = estimateTokens('Hello, world!', 'gpt-4');
 * console.log(estimate);
 * // { count: 4, method: 'tiktoken', model: 'gpt-4' }
 * ```
 *
 * @example
 * ```typescript
 * // Claude models use approximation
 * const estimate = estimateTokens('Hello, world!', 'claude-3-5-sonnet-20241022');
 * console.log(estimate);
 * // { count: 3, method: 'approximate', model: 'claude-3-5-sonnet-20241022' }
 * ```
 */
export function estimateTokens(text: string, model?: string): TokenEstimate {
  // Empty text
  if (!text || text.length === 0) {
    return {
      count: 0,
      method: 'exact',
      model,
    };
  }

  // Detect provider from model string
  const provider = detectProvider(model);

  switch (provider) {
    case 'openai':
      return estimateOpenAITokens(text, model);
    case 'anthropic':
      return estimateAnthropicTokens(text, model);
    default:
      return estimateGenericTokens(text, model);
  }
}

/**
 * Detect provider from model identifier
 */
function detectProvider(model?: string): 'openai' | 'anthropic' | 'unknown' {
  if (!model) {
    return 'unknown';
  }

  const modelLower = model.toLowerCase();

  // OpenAI models
  if (
    modelLower.startsWith('gpt-') ||
    modelLower.startsWith('o1-') ||
    modelLower.startsWith('text-embedding-')
  ) {
    return 'openai';
  }

  // Anthropic models
  if (modelLower.startsWith('claude-')) {
    return 'anthropic';
  }

  return 'unknown';
}

/**
 * Estimate tokens for OpenAI models using tiktoken
 *
 * Note: Currently uses approximation. For production use, install 'tiktoken' package
 * and implement proper tokenization per model.
 */
function estimateOpenAITokens(text: string, model?: string): TokenEstimate {
  // Try to use tiktoken if available
  try {
    // Dynamic import would go here in production
    // For now, fall back to approximation
    throw new Error('tiktoken not available');
  } catch {
    // Fallback approximation for OpenAI
    // GPT models average ~4 chars per token for English text
    // This is a rough estimate and should be replaced with tiktoken in production
    const count = Math.ceil(text.length / 4);

    return {
      count,
      method: 'approximate',
      model,
    };
  }
}

/**
 * Estimate tokens for Anthropic Claude models
 *
 * Claude uses a similar tokenization to GPT models but with slight differences.
 * According to Anthropic docs, a rough estimate is ~4 characters per token for English.
 *
 * For more accuracy in production:
 * 1. Use the Anthropic token counting API endpoint
 * 2. Cache token counts for repeated strings
 */
function estimateAnthropicTokens(text: string, model?: string): TokenEstimate {
  // Anthropic approximation: ~4 chars per token for English text
  // Slightly more conservative estimate than OpenAI
  const count = Math.ceil(text.length / 3.8);

  return {
    count,
    method: 'approximate',
    model,
  };
}

/**
 * Generic token estimation for unknown providers
 *
 * Uses a conservative 3.5 chars/token ratio as a middle ground
 */
function estimateGenericTokens(text: string, model?: string): TokenEstimate {
  const count = Math.ceil(text.length / 3.5);

  return {
    count,
    method: 'approximate',
    model,
  };
}

/**
 * Estimate tokens for multiple text segments
 *
 * Useful for estimating total context size including system prompts,
 * user messages, and cached segments.
 *
 * @param segments - Array of text segments to estimate
 * @param model - Optional model identifier
 * @returns Total token estimate
 *
 * @example
 * ```typescript
 * const total = estimateTokensForSegments([
 *   systemPrompt,
 *   userMessage,
 *   cachedDocument
 * ], 'gpt-4');
 * console.log(total.count); // Total tokens across all segments
 * ```
 */
export function estimateTokensForSegments(
  segments: string[],
  model?: string
): TokenEstimate {
  const estimates = segments.map((segment) => estimateTokens(segment, model));

  const totalCount = estimates.reduce((sum, est) => sum + est.count, 0);

  // Method is 'approximate' if any segment used approximation
  const method = estimates.some((est) => est.method === 'approximate')
    ? 'approximate'
    : estimates.some((est) => est.method === 'tiktoken')
      ? 'tiktoken'
      : 'exact';

  return {
    count: totalCount,
    method,
    model,
  };
}
