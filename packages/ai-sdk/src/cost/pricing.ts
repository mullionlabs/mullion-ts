/**
 * Model pricing data for cost calculation
 * @module cost/pricing
 */

import {
  getCatalogPricingModelKeys,
  getCatalogPricingOverride,
  inferCatalogProviderFromModel,
} from '../catalog/model-catalog.js';

/**
 * Pricing information for a specific model
 */
export interface ModelPricing {
  /** Model identifier */
  model: string;
  /** Provider name */
  provider: 'anthropic' | 'openai' | 'google' | 'unknown';
  /** USD per 1M input tokens */
  inputPer1M: number;
  /** USD per 1M output tokens */
  outputPer1M: number;
  /** USD per 1M cached input tokens (cache read) */
  cachedInputPer1M?: number;
  /** USD per 1M cache write tokens */
  cacheWritePer1M?: number;
  /** Date when pricing was last updated (ISO format) */
  asOfDate: string;
}

type KnownProvider = Exclude<ModelPricing['provider'], 'unknown'>;

const BASELINE_AS_OF_DATE = '2026-02-09';

/**
 * Complete baseline pricing database (snapshot as of 2026-02-09).
 */
export const PRICING_DATA: Record<string, ModelPricing> = {
  // OpenAI GPT-5 family
  'gpt-5': {
    model: 'gpt-5',
    provider: 'openai',
    inputPer1M: 1.25,
    outputPer1M: 10.0,
    cachedInputPer1M: 0.125,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-5-mini': {
    model: 'gpt-5-mini',
    provider: 'openai',
    inputPer1M: 0.25,
    outputPer1M: 2.0,
    cachedInputPer1M: 0.025,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-5-nano': {
    model: 'gpt-5-nano',
    provider: 'openai',
    inputPer1M: 0.05,
    outputPer1M: 0.4,
    cachedInputPer1M: 0.005,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-5-pro': {
    model: 'gpt-5-pro',
    provider: 'openai',
    inputPer1M: 15.0,
    outputPer1M: 120.0,
    cachedInputPer1M: 1.5,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-5.2': {
    model: 'gpt-5.2',
    provider: 'openai',
    inputPer1M: 1.75,
    outputPer1M: 14.0,
    cachedInputPer1M: 0.175,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-5.2-pro': {
    model: 'gpt-5.2-pro',
    provider: 'openai',
    inputPer1M: 20.0,
    outputPer1M: 160.0,
    cachedInputPer1M: 2.0,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },

  // OpenAI GPT-4.1 and GPT-4o families
  'gpt-4.1': {
    model: 'gpt-4.1',
    provider: 'openai',
    inputPer1M: 2.0,
    outputPer1M: 8.0,
    cachedInputPer1M: 0.5,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-4.1-mini': {
    model: 'gpt-4.1-mini',
    provider: 'openai',
    inputPer1M: 0.4,
    outputPer1M: 1.6,
    cachedInputPer1M: 0.1,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-4.1-nano': {
    model: 'gpt-4.1-nano',
    provider: 'openai',
    inputPer1M: 0.1,
    outputPer1M: 0.4,
    cachedInputPer1M: 0.025,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-4o': {
    model: 'gpt-4o',
    provider: 'openai',
    inputPer1M: 2.5,
    outputPer1M: 10.0,
    cachedInputPer1M: 1.25,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    provider: 'openai',
    inputPer1M: 0.15,
    outputPer1M: 0.6,
    cachedInputPer1M: 0.075,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },

  // OpenAI reasoning family
  o1: {
    model: 'o1',
    provider: 'openai',
    inputPer1M: 15.0,
    outputPer1M: 60.0,
    cachedInputPer1M: 7.5,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'o1-mini': {
    model: 'o1-mini',
    provider: 'openai',
    inputPer1M: 3.0,
    outputPer1M: 12.0,
    cachedInputPer1M: 1.5,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  o3: {
    model: 'o3',
    provider: 'openai',
    inputPer1M: 2.0,
    outputPer1M: 8.0,
    cachedInputPer1M: 1.0,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'o3-mini': {
    model: 'o3-mini',
    provider: 'openai',
    inputPer1M: 1.1,
    outputPer1M: 4.4,
    cachedInputPer1M: 0.55,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'o4-mini': {
    model: 'o4-mini',
    provider: 'openai',
    inputPer1M: 1.1,
    outputPer1M: 4.4,
    cachedInputPer1M: 0.55,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },

  // OpenAI legacy compatibility entries
  'gpt-4': {
    model: 'gpt-4',
    provider: 'openai',
    inputPer1M: 30.0,
    outputPer1M: 60.0,
    cachedInputPer1M: 0.0,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-4-turbo': {
    model: 'gpt-4-turbo',
    provider: 'openai',
    inputPer1M: 10.0,
    outputPer1M: 30.0,
    cachedInputPer1M: 0.0,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-4-turbo-preview': {
    model: 'gpt-4-turbo-preview',
    provider: 'openai',
    inputPer1M: 10.0,
    outputPer1M: 30.0,
    cachedInputPer1M: 0.0,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gpt-3.5-turbo': {
    model: 'gpt-3.5-turbo',
    provider: 'openai',
    inputPer1M: 0.5,
    outputPer1M: 1.5,
    cachedInputPer1M: 0.0,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'o1-preview': {
    model: 'o1-preview',
    provider: 'openai',
    inputPer1M: 15.0,
    outputPer1M: 60.0,
    cachedInputPer1M: 0.0,
    cacheWritePer1M: 0.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },

  // Anthropic Claude 4.x and legacy lines
  'claude-opus-4-1-20250805': {
    model: 'claude-opus-4-1-20250805',
    provider: 'anthropic',
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    cachedInputPer1M: 1.5,
    cacheWritePer1M: 18.75,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'claude-opus-4-20250514': {
    model: 'claude-opus-4-20250514',
    provider: 'anthropic',
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    cachedInputPer1M: 1.5,
    cacheWritePer1M: 18.75,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'claude-sonnet-4-5-20250929': {
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cachedInputPer1M: 0.3,
    cacheWritePer1M: 3.75,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'claude-sonnet-4-20250514': {
    model: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cachedInputPer1M: 0.3,
    cacheWritePer1M: 3.75,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'claude-3-5-sonnet-20241022': {
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cachedInputPer1M: 0.3,
    cacheWritePer1M: 3.75,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'claude-3-5-sonnet-20240620': {
    model: 'claude-3-5-sonnet-20240620',
    provider: 'anthropic',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cachedInputPer1M: 0.3,
    cacheWritePer1M: 3.75,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'claude-3-5-haiku-20241022': {
    model: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    inputPer1M: 0.8,
    outputPer1M: 4.0,
    cachedInputPer1M: 0.08,
    cacheWritePer1M: 1.0,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'claude-3-opus-20240229': {
    model: 'claude-3-opus-20240229',
    provider: 'anthropic',
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    cachedInputPer1M: 1.5,
    cacheWritePer1M: 18.75,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'claude-3-haiku-20240307': {
    model: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    inputPer1M: 0.25,
    outputPer1M: 1.25,
    cachedInputPer1M: 0.025,
    cacheWritePer1M: 0.3125,
    asOfDate: BASELINE_AS_OF_DATE,
  },

  // Google Gemini models (baseline)
  'gemini-3-pro-preview': {
    model: 'gemini-3-pro-preview',
    provider: 'google',
    inputPer1M: 2.0,
    outputPer1M: 12.0,
    cachedInputPer1M: 0.2,
    cacheWritePer1M: 2.5,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gemini-3-flash-preview': {
    model: 'gemini-3-flash-preview',
    provider: 'google',
    inputPer1M: 0.6,
    outputPer1M: 3.5,
    cachedInputPer1M: 0.06,
    cacheWritePer1M: 0.75,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gemini-2.5-pro': {
    model: 'gemini-2.5-pro',
    provider: 'google',
    inputPer1M: 1.25,
    outputPer1M: 10.0,
    cachedInputPer1M: 0.31,
    cacheWritePer1M: 1.25,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gemini-2.5-flash': {
    model: 'gemini-2.5-flash',
    provider: 'google',
    inputPer1M: 0.3,
    outputPer1M: 2.5,
    cachedInputPer1M: 0.075,
    cacheWritePer1M: 0.3,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gemini-2.5-flash-lite': {
    model: 'gemini-2.5-flash-lite',
    provider: 'google',
    inputPer1M: 0.1,
    outputPer1M: 0.4,
    cachedInputPer1M: 0.025,
    cacheWritePer1M: 0.1,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gemini-2.0-flash': {
    model: 'gemini-2.0-flash',
    provider: 'google',
    inputPer1M: 0.1,
    outputPer1M: 0.4,
    cachedInputPer1M: 0.025,
    cacheWritePer1M: 0.1,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gemini-2.0-flash-lite': {
    model: 'gemini-2.0-flash-lite',
    provider: 'google',
    inputPer1M: 0.075,
    outputPer1M: 0.3,
    cachedInputPer1M: 0.01875,
    cacheWritePer1M: 0.075,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gemini-1.5-pro': {
    model: 'gemini-1.5-pro',
    provider: 'google',
    inputPer1M: 1.25,
    outputPer1M: 5.0,
    cachedInputPer1M: 0.3125,
    cacheWritePer1M: 1.25,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gemini-1.5-flash': {
    model: 'gemini-1.5-flash',
    provider: 'google',
    inputPer1M: 0.075,
    outputPer1M: 0.3,
    cachedInputPer1M: 0.01875,
    cacheWritePer1M: 0.075,
    asOfDate: BASELINE_AS_OF_DATE,
  },
  'gemini-1.5-flash-8b': {
    model: 'gemini-1.5-flash-8b',
    provider: 'google',
    inputPer1M: 0.0375,
    outputPer1M: 0.15,
    cachedInputPer1M: 0.01,
    cacheWritePer1M: 0.04,
    asOfDate: BASELINE_AS_OF_DATE,
  },
};

/**
 * Default pricing for unknown models.
 */
const DEFAULT_PRICING: ModelPricing = {
  model: 'unknown',
  provider: 'unknown',
  inputPer1M: 10.0,
  outputPer1M: 30.0,
  cachedInputPer1M: 1.0,
  cacheWritePer1M: 12.5,
  asOfDate: BASELINE_AS_OF_DATE,
};

/**
 * Get pricing for a specific model.
 *
 * Precedence: runtime catalog override > user overrides > baseline pricing.
 */
export function getPricing(
  model: string,
  overrides?: Partial<ModelPricing>,
): ModelPricing {
  const baselineMatch = resolveBaselinePricing(model);
  const inferredProvider = inferCatalogProviderFromModel(model);
  const providerHint =
    overrides?.provider ?? baselineMatch?.provider ?? inferredProvider;

  const runtimeOverride = getCatalogPricingOverride(providerHint, model);
  const resolvedProvider =
    runtimeOverride?.provider ??
    overrides?.provider ??
    baselineMatch?.provider ??
    (runtimeOverride ? providerHint : 'unknown');

  const providerDefault = createProviderDefaultPricing(model, resolvedProvider);

  const resolvedPricing: ModelPricing = {
    ...DEFAULT_PRICING,
    ...providerDefault,
    ...(baselineMatch ?? {}),
    ...(overrides ?? {}),
    ...(runtimeOverride ?? {}),
    model,
    provider: resolvedProvider,
    asOfDate:
      runtimeOverride?.asOfDate ??
      overrides?.asOfDate ??
      baselineMatch?.asOfDate ??
      providerDefault.asOfDate,
  };

  return resolvedPricing;
}

/**
 * Get all available model pricing data (baseline + runtime catalog models).
 */
export function getAllPricing(): ModelPricing[] {
  const modelNames = new Set<string>(Object.keys(PRICING_DATA));

  for (const runtimeModel of getCatalogPricingModelKeys()) {
    modelNames.add(runtimeModel);
  }

  return [...modelNames].sort().map((model) => getPricing(model));
}

/**
 * Get pricing for all models from a specific provider.
 */
export function getPricingByProvider(provider: KnownProvider): ModelPricing[] {
  const modelNames = new Set<string>(
    Object.entries(PRICING_DATA)
      .filter(([, pricing]) => pricing.provider === provider)
      .map(([model]) => model),
  );

  for (const runtimeModel of getCatalogPricingModelKeys(provider)) {
    modelNames.add(runtimeModel);
  }

  return [...modelNames]
    .sort()
    .map((model) => getPricing(model))
    .filter((pricing) => pricing.provider === provider);
}

/**
 * Calculate cache write pricing for a specific TTL.
 */
export function calculateCacheWritePricing(
  basePricing: ModelPricing,
  ttl: '5m' | '1h',
): number {
  if (basePricing.provider === 'openai') {
    // OpenAI prompt caching is automatic; no explicit cache write API.
    return 0.0;
  }

  if (basePricing.provider === 'anthropic') {
    const baseInput = basePricing.inputPer1M;
    if (ttl === '5m') {
      return baseInput * 1.25;
    }

    return baseInput * 2.0;
  }

  if (basePricing.provider === 'google') {
    return basePricing.cacheWritePer1M ?? basePricing.inputPer1M;
  }

  return basePricing.inputPer1M * 1.25;
}

/**
 * Export effective pricing data as JSON string.
 */
export function exportPricingAsJSON(pretty = true): string {
  const effectivePricing = getAllPricing().reduce<Record<string, ModelPricing>>(
    (accumulator, pricing) => {
      accumulator[pricing.model] = pricing;
      return accumulator;
    },
    {},
  );

  return JSON.stringify(effectivePricing, null, pretty ? 2 : 0);
}

/**
 * Import pricing data from JSON.
 */
export function importPricingFromJSON(
  json: string,
): Record<string, ModelPricing> {
  return JSON.parse(json) as Record<string, ModelPricing>;
}

function resolveBaselinePricing(model: string): ModelPricing | null {
  const exactMatch = PRICING_DATA[model];
  if (exactMatch) {
    return exactMatch;
  }

  return findFuzzyMatch(model);
}

function findFuzzyMatch(model: string): ModelPricing | null {
  const normalizedModel = normalizeModelName(model);

  const entriesBySpecificity = Object.entries(PRICING_DATA).sort(
    ([leftKey], [rightKey]) =>
      normalizeModelName(rightKey).length - normalizeModelName(leftKey).length,
  );

  for (const [key, pricing] of entriesBySpecificity) {
    const normalizedKey = normalizeModelName(key);

    if (
      normalizedModel === normalizedKey ||
      normalizedModel.startsWith(normalizedKey) ||
      normalizedKey.startsWith(normalizedModel)
    ) {
      return pricing;
    }
  }

  const familyFallbacks: [RegExp, string][] = [
    [/^gpt-5\.2/, 'gpt-5.2'],
    [/^gpt-5/, 'gpt-5'],
    [/^gpt-4\.1/, 'gpt-4.1'],
    [/^gpt-4o/, 'gpt-4o'],
    [/^gpt-4-turbo/, 'gpt-4-turbo'],
    [/^gpt-4/, 'gpt-4'],
    [/^gpt-3\.5/, 'gpt-3.5-turbo'],
    [/^o4/, 'o4-mini'],
    [/^o3/, 'o3'],
    [/^o1/, 'o1'],
    [/claude.*opus.*4-1/, 'claude-opus-4-1-20250805'],
    [/claude.*opus.*4/, 'claude-opus-4-20250514'],
    [/claude.*opus/, 'claude-opus-4-1-20250805'],
    [/claude.*sonnet.*4-5/, 'claude-sonnet-4-5-20250929'],
    [/claude.*sonnet.*4/, 'claude-sonnet-4-20250514'],
    [/claude.*sonnet/, 'claude-sonnet-4-5-20250929'],
    [/claude.*haiku.*3-5/, 'claude-3-5-haiku-20241022'],
    [/claude.*haiku/, 'claude-3-5-haiku-20241022'],
    [/gemini.*3.*pro/, 'gemini-3-pro-preview'],
    [/gemini.*3.*flash/, 'gemini-3-flash-preview'],
    [/gemini.*2\.5.*pro/, 'gemini-2.5-pro'],
    [/gemini.*2\.5.*flash.*lite/, 'gemini-2.5-flash-lite'],
    [/gemini.*2\.5.*flash/, 'gemini-2.5-flash'],
    [/gemini.*2\.0.*flash.*lite/, 'gemini-2.0-flash-lite'],
    [/gemini.*2\.0.*flash/, 'gemini-2.0-flash'],
    [/gemini.*1\.5.*pro/, 'gemini-1.5-pro'],
    [/gemini.*1\.5.*flash.*8b/, 'gemini-1.5-flash-8b'],
    [/gemini.*1\.5.*flash/, 'gemini-1.5-flash'],
  ];

  for (const [pattern, modelKey] of familyFallbacks) {
    if (pattern.test(normalizedModel) && PRICING_DATA[modelKey]) {
      return PRICING_DATA[modelKey];
    }
  }

  return null;
}

function createProviderDefaultPricing(
  model: string,
  provider: ModelPricing['provider'],
): ModelPricing {
  switch (provider) {
    case 'openai':
      return {
        model,
        provider,
        inputPer1M: 2.0,
        outputPer1M: 8.0,
        cachedInputPer1M: 0.5,
        cacheWritePer1M: 0.0,
        asOfDate: BASELINE_AS_OF_DATE,
      };

    case 'anthropic':
      return {
        model,
        provider,
        inputPer1M: 3.0,
        outputPer1M: 15.0,
        cachedInputPer1M: 0.3,
        cacheWritePer1M: 3.75,
        asOfDate: BASELINE_AS_OF_DATE,
      };

    case 'google':
      return {
        model,
        provider,
        inputPer1M: 0.3,
        outputPer1M: 2.5,
        cachedInputPer1M: 0.075,
        cacheWritePer1M: 0.3,
        asOfDate: BASELINE_AS_OF_DATE,
      };

    default:
      return {...DEFAULT_PRICING, model};
  }
}

function normalizeModelName(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/^models\//, '');
}
