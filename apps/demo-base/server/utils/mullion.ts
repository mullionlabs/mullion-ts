/**
 * Server-side Mullion client configuration
 *
 * This utility provides a configured Mullion client for use in server routes.
 * It uses the API key from environment variables (set in Vercel).
 *
 * TODO: Implementation will be completed when demo apps are created in Task 13.3/13.4
 * Each demo app will import and configure this with their specific LLM provider.
 */

/**
 * Get OpenAI API key from environment
 */
export function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

/**
 * Get Anthropic API key from environment
 */
export function getAnthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}

/**
 * Check if any API key is configured
 */
export function hasAPIKey(): boolean {
  return !!(getOpenAIKey() || getAnthropicKey());
}

/**
 * Get configured provider name
 */
export function getConfiguredProvider(): 'openai' | 'anthropic' | null {
  if (getOpenAIKey()) return 'openai';
  if (getAnthropicKey()) return 'anthropic';
  return null;
}

/**
 * Validate API keys are configured
 * Throws error if no keys found
 */
export function requireAPIKey(): void {
  if (!hasAPIKey()) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message:
        'No API key configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY.',
    });
  }
}

/**
 * Example: Create Mullion client factory
 *
 * This will be used by demo apps like:
 *
 * ```typescript
 * import { createMullionClient } from '@mullion/ai-sdk';
 * import { openai } from '@ai-sdk/openai';
 *
 * export function createServerMullionClient() {
 *   requireAPIKey();
 *   const apiKey = getOpenAIKey()!;
 *
 *   return createMullionClient({
 *     provider: openai('gpt-4o-mini', { apiKey }),
 *   });
 * }
 * ```
 */
