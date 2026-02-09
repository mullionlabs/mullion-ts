/**
 * Provider Selection Utility
 *
 * Allows choosing between:
 * - Mock provider (default, no API key needed)
 * - OpenAI (via OPENAI_API_KEY)
 * - Anthropic (via ANTHROPIC_API_KEY)
 */

import {createOpenAI} from '@ai-sdk/openai';
import {createAnthropic} from '@ai-sdk/anthropic';
import type {LanguageModel} from 'ai';
import type {MullionClientOptions} from '@mullion/ai-sdk';

type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | {[key: string]: JsonValue};

type ProviderOptions = Record<string, Record<string, JsonValue>>;

type MullionClientOptionsWithProvider = MullionClientOptions & {
  providerOptions?: ProviderOptions;
};

export type ProviderType = 'mock' | 'openai' | 'anthropic';

export interface ProviderConfig {
  type: ProviderType;
  model?: string;
  strictJsonSchema?: boolean;
}

/**
 * Get the appropriate language model based on provider selection.
 */
export function getLanguageModel(
  config?: ProviderConfig,
): LanguageModel | null {
  const providerType = config?.type || detectProviderFromEnv();
  const openaiProvider = process.env.OPENAI_API_KEY
    ? createOpenAI({apiKey: process.env.OPENAI_API_KEY})
    : null;
  const anthropicProvider = process.env.ANTHROPIC_API_KEY
    ? createAnthropic({apiKey: process.env.ANTHROPIC_API_KEY})
    : null;

  switch (providerType) {
    case 'openai':
      if (!openaiProvider) {
        console.warn(
          '⚠️  OpenAI selected but OPENAI_API_KEY not set. Using mock.',
        );
        return null;
      }
      return openaiProvider(config?.model || 'gpt-4o-mini');

    case 'anthropic':
      if (!anthropicProvider) {
        console.warn(
          '⚠️  Anthropic selected but ANTHROPIC_API_KEY not set. Using mock.',
        );
        return null;
      }
      return anthropicProvider(config?.model || 'claude-3-5-haiku-20241022');

    case 'mock':
    default:
      return null;
  }
}

/**
 * Auto-detect provider from environment variables.
 */
function detectProviderFromEnv(): ProviderType {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'mock';
}

/**
 * Get provider name for display.
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

/**
 * Build Mullion client options based on environment config.
 */
export function getMullionClientOptions(
  config?: ProviderConfig,
): MullionClientOptionsWithProvider {
  const providerType = config?.type || detectProviderFromEnv();

  if (providerType !== 'openai') {
    return {};
  }

  const strictJsonSchema = resolveStrictJsonSchema(
    process.env.OPENAI_STRICT_JSON_SCHEMA,
    config?.strictJsonSchema,
  );

  if (strictJsonSchema) {
    return {};
  }

  return {
    providerOptions: {
      openai: {
        strictJsonSchema: false,
      },
    },
  };
}

/**
 * Check if running in mock mode (no API keys configured).
 */
export function isMockMode(): boolean {
  return !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY;
}

function resolveStrictJsonSchema(value: unknown, override?: boolean): boolean {
  if (typeof override === 'boolean') return override;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  }
  return true;
}
