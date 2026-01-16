/**
 * Model pricing data for cost calculation
 * @module cost/pricing
 */

/**
 * Pricing information for a specific model
 */
export interface ModelPricing {
  /** Model identifier */
  model: string;
  /** Provider name */
  provider: 'anthropic' | 'openai' | 'unknown';
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

/**
 * Complete pricing database
 *
 * Prices are as of January 2025. For the most current pricing:
 * - OpenAI: https://openai.com/pricing
 * - Anthropic: https://www.anthropic.com/pricing
 */
export const PRICING_DATA: Record<string, ModelPricing> = {
  // OpenAI GPT-4 models
  'gpt-4': {
    model: 'gpt-4',
    provider: 'openai',
    inputPer1M: 30.0,
    outputPer1M: 60.0,
    // OpenAI has automatic prompt caching (free)
    cachedInputPer1M: 0.0,
    cacheWritePer1M: 0.0,
    asOfDate: '2025-01-01',
  },
  'gpt-4-turbo': {
    model: 'gpt-4-turbo',
    provider: 'openai',
    inputPer1M: 10.0,
    outputPer1M: 30.0,
    cachedInputPer1M: 0.0,
    cacheWritePer1M: 0.0,
    asOfDate: '2025-01-01',
  },
  'gpt-4-turbo-preview': {
    model: 'gpt-4-turbo-preview',
    provider: 'openai',
    inputPer1M: 10.0,
    outputPer1M: 30.0,
    cachedInputPer1M: 0.0,
    cacheWritePer1M: 0.0,
    asOfDate: '2025-01-01',
  },

  // OpenAI GPT-3.5 models
  'gpt-3.5-turbo': {
    model: 'gpt-3.5-turbo',
    provider: 'openai',
    inputPer1M: 0.5,
    outputPer1M: 1.5,
    cachedInputPer1M: 0.0,
    cacheWritePer1M: 0.0,
    asOfDate: '2025-01-01',
  },

  // OpenAI O1 models
  'o1-preview': {
    model: 'o1-preview',
    provider: 'openai',
    inputPer1M: 15.0,
    outputPer1M: 60.0,
    cachedInputPer1M: 0.0,
    cacheWritePer1M: 0.0,
    asOfDate: '2025-01-01',
  },
  'o1-mini': {
    model: 'o1-mini',
    provider: 'openai',
    inputPer1M: 3.0,
    outputPer1M: 12.0,
    cachedInputPer1M: 0.0,
    cacheWritePer1M: 0.0,
    asOfDate: '2025-01-01',
  },

  // Anthropic Claude 3.5 models
  'claude-3-5-sonnet-20241022': {
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    // Cache read: 10% of input price
    cachedInputPer1M: 0.3,
    // Cache write: +25% for 5min TTL, +100% for 1h TTL (using 5min as default)
    cacheWritePer1M: 3.75,
    asOfDate: '2025-01-01',
  },
  'claude-3-5-sonnet-20240620': {
    model: 'claude-3-5-sonnet-20240620',
    provider: 'anthropic',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cachedInputPer1M: 0.3,
    cacheWritePer1M: 3.75,
    asOfDate: '2025-01-01',
  },

  // Anthropic Claude 4.5 models
  'claude-opus-4-5-20251101': {
    model: 'claude-opus-4-5-20251101',
    provider: 'anthropic',
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    cachedInputPer1M: 1.5,
    cacheWritePer1M: 18.75,
    asOfDate: '2025-01-01',
  },
  'claude-sonnet-4-5-20241022': {
    model: 'claude-sonnet-4-5-20241022',
    provider: 'anthropic',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cachedInputPer1M: 0.3,
    cacheWritePer1M: 3.75,
    asOfDate: '2025-01-01',
  },
  'claude-haiku-4-5-20241022': {
    model: 'claude-haiku-4-5-20241022',
    provider: 'anthropic',
    inputPer1M: 0.8,
    outputPer1M: 4.0,
    cachedInputPer1M: 0.08,
    cacheWritePer1M: 1.0,
    asOfDate: '2025-01-01',
  },

  // Anthropic Claude 3 Opus
  'claude-3-opus-20240229': {
    model: 'claude-3-opus-20240229',
    provider: 'anthropic',
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    cachedInputPer1M: 1.5,
    cacheWritePer1M: 18.75,
    asOfDate: '2025-01-01',
  },

  // Anthropic Claude 3 Haiku
  'claude-3-haiku-20240307': {
    model: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    inputPer1M: 0.25,
    outputPer1M: 1.25,
    cachedInputPer1M: 0.025,
    cacheWritePer1M: 0.3125,
    asOfDate: '2025-01-01',
  },
  'claude-3-5-haiku-20241022': {
    model: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    inputPer1M: 0.8,
    outputPer1M: 4.0,
    cachedInputPer1M: 0.08,
    cacheWritePer1M: 1.0,
    asOfDate: '2025-01-01',
  },
};

/**
 * Default pricing for unknown models
 */
const DEFAULT_PRICING: ModelPricing = {
  model: 'unknown',
  provider: 'unknown',
  inputPer1M: 10.0, // Conservative estimate
  outputPer1M: 30.0, // Conservative estimate
  cachedInputPer1M: 1.0,
  cacheWritePer1M: 12.5,
  asOfDate: '2025-01-01',
};

/**
 * Get pricing for a specific model
 *
 * @param model - Model identifier
 * @param overrides - Optional partial pricing to override defaults
 * @returns Model pricing information
 *
 * @example
 * ```typescript
 * const pricing = getPricing('gpt-4');
 * console.log(pricing.inputPer1M); // 30.0
 * ```
 *
 * @example
 * ```typescript
 * // Override pricing for custom deployment
 * const pricing = getPricing('gpt-4', {
 *   inputPer1M: 25.0,
 *   outputPer1M: 50.0,
 * });
 * ```
 */
export function getPricing(
  model: string,
  overrides?: Partial<ModelPricing>,
): ModelPricing {
  // Try exact match first
  const exactMatch = PRICING_DATA[model];
  if (exactMatch) {
    return overrides ? {...exactMatch, ...overrides} : exactMatch;
  }

  // Try fuzzy match for model families
  const fuzzyMatch = findFuzzyMatch(model);
  if (fuzzyMatch) {
    return overrides ? {...fuzzyMatch, ...overrides} : fuzzyMatch;
  }

  // Fall back to default pricing
  const defaultWithModel = {...DEFAULT_PRICING, model};
  return overrides ? {...defaultWithModel, ...overrides} : defaultWithModel;
}

/**
 * Find fuzzy match for model name
 *
 * Handles cases like:
 * - 'gpt-4-0613' -> 'gpt-4'
 * - 'claude-3-5-sonnet-latest' -> 'claude-3-5-sonnet-20241022'
 */
function findFuzzyMatch(model: string): ModelPricing | null {
  const modelLower = model.toLowerCase();

  // Try prefix matching
  for (const [key, pricing] of Object.entries(PRICING_DATA)) {
    const keyLower = key.toLowerCase();

    // Check if the model starts with a known model prefix
    if (modelLower.startsWith(keyLower) || keyLower.startsWith(modelLower)) {
      return pricing;
    }

    // Check for common patterns
    if (
      modelLower.includes('gpt-4-turbo') &&
      keyLower.includes('gpt-4-turbo')
    ) {
      return pricing;
    }
    if (modelLower.includes('gpt-4') && keyLower === 'gpt-4') {
      return pricing;
    }
    if (modelLower.includes('gpt-3.5') && keyLower.includes('gpt-3.5')) {
      return pricing;
    }
    if (
      modelLower.includes('claude') &&
      modelLower.includes('opus') &&
      keyLower.includes('opus')
    ) {
      return pricing;
    }
    if (
      modelLower.includes('claude') &&
      modelLower.includes('sonnet') &&
      keyLower.includes('sonnet')
    ) {
      return pricing;
    }
    if (
      modelLower.includes('claude') &&
      modelLower.includes('haiku') &&
      keyLower.includes('haiku')
    ) {
      return pricing;
    }
  }

  return null;
}

/**
 * Get all available model pricing data
 *
 * @returns Array of all model pricing information
 *
 * @example
 * ```typescript
 * const allPricing = getAllPricing();
 * const openaiModels = allPricing.filter(p => p.provider === 'openai');
 * ```
 */
export function getAllPricing(): ModelPricing[] {
  return Object.values(PRICING_DATA);
}

/**
 * Get pricing for all models from a specific provider
 *
 * @param provider - Provider name
 * @returns Array of model pricing for the provider
 *
 * @example
 * ```typescript
 * const anthropicPricing = getPricingByProvider('anthropic');
 * console.log(anthropicPricing.length); // Number of Anthropic models
 * ```
 */
export function getPricingByProvider(
  provider: 'anthropic' | 'openai',
): ModelPricing[] {
  return Object.values(PRICING_DATA).filter((p) => p.provider === provider);
}

/**
 * Calculate cache write pricing for a specific TTL
 *
 * Anthropic cache economics:
 * - 5min TTL: +25% of input price
 * - 1h TTL: +100% of input price
 *
 * @param basePricing - Base model pricing
 * @param ttl - Cache TTL ('5m' or '1h')
 * @returns Cache write price per 1M tokens
 *
 * @example
 * ```typescript
 * const pricing = getPricing('claude-3-5-sonnet-20241022');
 * const write5m = calculateCacheWritePricing(pricing, '5m'); // 3.75
 * const write1h = calculateCacheWritePricing(pricing, '1h'); // 6.0
 * ```
 */
export function calculateCacheWritePricing(
  basePricing: ModelPricing,
  ttl: '5m' | '1h',
): number {
  if (basePricing.provider === 'openai') {
    // OpenAI has free automatic caching
    return 0.0;
  }

  if (basePricing.provider === 'anthropic') {
    const baseInput = basePricing.inputPer1M;
    if (ttl === '5m') {
      return baseInput * 1.25; // +25%
    } else {
      return baseInput * 2.0; // +100%
    }
  }

  // Unknown provider - use conservative estimate
  return basePricing.inputPer1M * 1.25;
}

/**
 * Export pricing data as JSON string
 *
 * Useful for:
 * - Saving pricing to file for easy updates
 * - Integration with external systems
 * - Debugging pricing data
 *
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string of all pricing data
 *
 * @example
 * ```typescript
 * const json = exportPricingAsJSON();
 * fs.writeFileSync('pricing.json', json);
 * ```
 */
export function exportPricingAsJSON(pretty = true): string {
  return JSON.stringify(PRICING_DATA, null, pretty ? 2 : 0);
}

/**
 * Import pricing data from JSON
 *
 * Allows loading custom pricing from external sources
 *
 * @param json - JSON string of pricing data
 * @returns Record of model pricing
 *
 * @example
 * ```typescript
 * const customPricing = importPricingFromJSON(jsonString);
 * const pricing = getPricing('gpt-4', customPricing['gpt-4']);
 * ```
 */
export function importPricingFromJSON(
  json: string,
): Record<string, ModelPricing> {
  return JSON.parse(json) as Record<string, ModelPricing>;
}
