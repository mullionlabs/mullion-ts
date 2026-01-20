/**
 * Provider Selection Utility
 *
 * Allows choosing between:
 * - Mock provider (default, no API key needed)
 * - OpenAI (via NUXT_OPENAI_API_KEY)
 * - Anthropic (via NUXT_ANTHROPIC_API_KEY)
 */

import type {H3Event} from 'h3';
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
 * Get the appropriate language model based on provider selection
 * @param event - H3 event from the API route (required for accessing runtime config)
 * @param config - Optional provider configuration
 */
export function getLanguageModel(
  event: H3Event,
  config?: ProviderConfig,
): LanguageModel | null {
  const runtimeConfig = useRuntimeConfig(event);
  const providerType = config?.type || detectProviderFromConfig(runtimeConfig);
  const openaiProvider = runtimeConfig.openaiApiKey
    ? createOpenAI({apiKey: runtimeConfig.openaiApiKey})
    : null;
  const anthropicProvider = runtimeConfig.anthropicApiKey
    ? createAnthropic({apiKey: runtimeConfig.anthropicApiKey})
    : null;

  switch (providerType) {
    case 'openai':
      if (!openaiProvider) {
        console.warn(
          '⚠️  OpenAI selected but NUXT_OPENAI_API_KEY not set. Using mock.',
        );
        return null;
      }
      return openaiProvider(config?.model || 'gpt-4o-mini');

    case 'anthropic':
      if (!anthropicProvider) {
        console.warn(
          '⚠️  Anthropic selected but NUXT_ANTHROPIC_API_KEY not set. Using mock.',
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
 * Auto-detect provider from runtime configuration
 */
function detectProviderFromConfig(
  runtimeConfig: ReturnType<typeof useRuntimeConfig>,
): ProviderType {
  if (runtimeConfig.anthropicApiKey) return 'anthropic';
  if (runtimeConfig.openaiApiKey) return 'openai';
  return 'mock';
}

/**
 * Get provider name for display
 * @param event - H3 event from the API route (required for accessing runtime config)
 * @param config - Optional provider configuration
 */
export function getProviderName(
  event: H3Event,
  config?: ProviderConfig,
): string {
  const runtimeConfig = useRuntimeConfig(event);
  const providerType = config?.type || detectProviderFromConfig(runtimeConfig);
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
 * Build Mullion client options based on runtime config.
 */
export function getMullionClientOptions(
  event: H3Event,
  config?: ProviderConfig,
): MullionClientOptionsWithProvider {
  const runtimeConfig = useRuntimeConfig(event);
  const providerType = config?.type || detectProviderFromConfig(runtimeConfig);

  if (providerType !== 'openai') {
    return {};
  }

  const strictJsonSchema = resolveStrictJsonSchema(
    runtimeConfig.openaiStrictJsonSchema,
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
 * Check if running in mock mode (no API keys configured)
 * @param event - H3 event from the API route (required for accessing runtime config)
 */
export function isMockMode(event: H3Event): boolean {
  const runtimeConfig = useRuntimeConfig(event);
  return !runtimeConfig.openaiApiKey && !runtimeConfig.anthropicApiKey;
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
