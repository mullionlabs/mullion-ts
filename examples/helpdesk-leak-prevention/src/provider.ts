/**
 * Provider Selection Utility
 *
 * Allows choosing between:
 * - Mock provider (default, no API key needed)
 * - OpenAI (via OPENAI_API_KEY)
 * - Anthropic (via ANTHROPIC_API_KEY)
 */

import {openai} from '@ai-sdk/openai';
import {anthropic} from '@ai-sdk/anthropic';
import type {LanguageModel} from 'ai';

export type ProviderType = 'mock' | 'openai' | 'anthropic';

export interface ProviderConfig {
  type: ProviderType;
  model?: string;
}

/**
 * Get the appropriate language model based on provider selection
 */
export function getLanguageModel(
  config?: ProviderConfig,
): LanguageModel | null {
  const providerType = config?.type || detectProviderFromEnv();

  switch (providerType) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        console.warn(
          '⚠️  OpenAI selected but OPENAI_API_KEY not set. Using mock.',
        );
        return null;
      }
      return openai(config?.model || 'gpt-4o-mini');

    case 'anthropic':
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn(
          '⚠️  Anthropic selected but ANTHROPIC_API_KEY not set. Using mock.',
        );
        return null;
      }
      return anthropic(config?.model || 'claude-3-5-haiku-20241022');

    case 'mock':
    default:
      return null;
  }
}

/**
 * Auto-detect provider from environment variables
 */
function detectProviderFromEnv(): ProviderType {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'mock';
}

/**
 * Get provider name for display
 */
export function getProviderName(config?: ProviderConfig): string {
  const providerType = config?.type || detectProviderFromEnv();
  const model = config?.model;

  switch (providerType) {
    case 'openai':
      return `OpenAI (${model || 'gpt-4o-mini'})`;
    case 'anthropic':
      return `Anthropic (${model || 'claude-3-5-haiku-20241022'})`;
    case 'mock':
    default:
      return 'Mock Provider';
  }
}
