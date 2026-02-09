/**
 * Provider capability matrix for cache optimization.
 */

import {
  getCatalogCapabilityOverride,
  type CatalogCapabilityEntry,
} from '../catalog/model-catalog.js';

/**
 * Cache capabilities for a specific provider/model combination.
 */
export interface CacheCapabilities {
  /** Whether caching is supported at all for this provider/model */
  readonly supported: boolean;

  /** Minimum number of tokens required for cache to be effective */
  readonly minTokens: number;

  /** Maximum number of cache breakpoints supported */
  readonly maxBreakpoints: number;

  /** Whether the provider supports TTL (time-to-live) for cache entries */
  readonly supportsTtl: boolean;

  /** Specific TTL values supported by this provider/model */
  readonly supportedTtl: readonly ('5m' | '1h')[];

  /** Whether the provider supports caching tool/function calls */
  readonly supportsToolCaching: boolean;

  /** Whether caching is automatic (like OpenAI) vs explicit */
  readonly isAutomatic: boolean;
}

/**
 * Supported LLM providers for cache optimization.
 */
export type Provider = 'anthropic' | 'openai' | 'google' | 'other';

type CacheTtl = '5m' | '1h';

const VALID_TTLS: CacheTtl[] = ['5m', '1h'];

/**
 * Anthropic model defaults.
 */
const ANTHROPIC_MODELS = {
  'claude-opus-4-1-20250805': {
    supported: true,
    minTokens: 4096,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-opus-4-20250514': {
    supported: true,
    minTokens: 4096,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-sonnet-4-5-20250929': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-sonnet-4-20250514': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-3-5-sonnet-20241022': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-3-5-sonnet-20240620': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-3-5-haiku-20241022': {
    supported: true,
    minTokens: 2048,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-3-opus-20240229': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-3-sonnet-20240229': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
  'claude-3-haiku-20240307': {
    supported: true,
    minTokens: 2048,
    maxBreakpoints: 4,
    supportsTtl: true,
    supportedTtl: ['5m', '1h'] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
} as const;

/**
 * OpenAI model defaults.
 */
const OPENAI_MODELS = {
  'gpt-5': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-5-mini': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-5-nano': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-5-pro': {
    supported: true,
    minTokens: 2048,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-5.2': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-5.2-pro': {
    supported: true,
    minTokens: 2048,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-4.1': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-4.1-mini': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-4.1-nano': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-4o': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-4o-mini': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  o1: {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'o1-mini': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  o3: {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'o3-mini': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'o4-mini': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-4-turbo': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-4-turbo-preview': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: true,
    isAutomatic: true,
  },
  'gpt-4': {
    supported: true,
    minTokens: 1024,
    maxBreakpoints: Infinity,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: false,
    isAutomatic: true,
  },
  'gpt-3.5-turbo': {
    supported: false,
    minTokens: 1024,
    maxBreakpoints: 0,
    supportsTtl: false,
    supportedTtl: [] as const,
    supportsToolCaching: false,
    isAutomatic: false,
  },
} as const;

const GOOGLE_DEFAULT_CAPABILITIES: CacheCapabilities = {
  supported: true,
  minTokens: 1024,
  maxBreakpoints: 1,
  supportsTtl: true,
  supportedTtl: ['5m', '1h'],
  supportsToolCaching: false,
  isAutomatic: false,
} as const;

const GOOGLE_CACHE_UNSUPPORTED_PATTERNS = [
  'embedding',
  'image-preview',
  'flash-image',
  'preview-tts',
  'native-audio',
  'live',
] as const;

const DEFAULT_CAPABILITIES: CacheCapabilities = {
  supported: false,
  minTokens: 2048,
  maxBreakpoints: 1,
  supportsTtl: false,
  supportedTtl: [],
  supportsToolCaching: false,
  isAutomatic: false,
} as const;

/**
 * Get cache capabilities for a specific provider and model combination.
 */
export function getCacheCapabilities(
  provider: Provider,
  model: string,
): CacheCapabilities {
  const baseline = getBaselineCacheCapabilities(provider, model);
  const runtimeOverride =
    provider === 'other' ? null : getCatalogCapabilityOverride(provider, model);

  const merged = runtimeOverride
    ? mergeCapabilities(baseline, runtimeOverride)
    : baseline;

  return applyCapabilitySafetyRules(provider, model, merged, baseline);
}

/**
 * Check if a specific caching feature is supported by a provider/model.
 */
export function supportsCacheFeature(
  provider: Provider,
  model: string,
  feature: 'ttl' | 'toolCaching' | 'automatic',
): boolean {
  const caps = getCacheCapabilities(provider, model);

  switch (feature) {
    case 'ttl':
      return caps.supportsTtl;
    case 'toolCaching':
      return caps.supportsToolCaching;
    case 'automatic':
      return caps.isAutomatic;
    default:
      return false;
  }
}

/**
 * Get the effective cache breakpoint limit for a provider/model.
 */
export function getEffectiveBreakpointLimit(
  provider: Provider,
  model: string,
  maxPractical = 10,
): number {
  const caps = getCacheCapabilities(provider, model);
  return caps.maxBreakpoints === Infinity ? maxPractical : caps.maxBreakpoints;
}

/**
 * Validate if a TTL value is supported by a provider/model.
 */
export function isValidTtl(
  provider: Provider,
  model: string,
  ttl: '5m' | '1h',
): boolean {
  const caps = getCacheCapabilities(provider, model);
  return caps.supportsTtl && caps.supportedTtl.includes(ttl);
}

/**
 * Get the recommended cache strategy for a provider/model combination.
 */
export function getRecommendedCacheStrategy(
  provider: Provider,
  model: string,
): 'explicit-segments' | 'automatic-optimization' | 'disabled' {
  const caps = getCacheCapabilities(provider, model);

  if (!caps.supported) {
    return 'disabled';
  }

  if (caps.isAutomatic) {
    return 'automatic-optimization';
  }

  return 'explicit-segments';
}

function getBaselineCacheCapabilities(
  provider: Provider,
  model: string,
): CacheCapabilities {
  switch (provider) {
    case 'anthropic': {
      const anthropicModel = model as keyof typeof ANTHROPIC_MODELS;
      const modelConfig = ANTHROPIC_MODELS[anthropicModel];

      if (modelConfig) {
        return modelConfig;
      }

      return {
        supported: true,
        minTokens: 1024,
        maxBreakpoints: 4,
        supportsTtl: true,
        supportedTtl: ['5m', '1h'],
        supportsToolCaching: false,
        isAutomatic: false,
      };
    }

    case 'openai': {
      const openaiModel = model as keyof typeof OPENAI_MODELS;
      const modelConfig = OPENAI_MODELS[openaiModel];

      if (modelConfig) {
        return modelConfig;
      }

      return {
        supported: true,
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportedTtl: [],
        supportsToolCaching: true,
        isAutomatic: true,
      };
    }

    case 'google':
      return getGoogleModelCapabilities(model);

    case 'other':
    default:
      return DEFAULT_CAPABILITIES;
  }
}

function getGoogleModelCapabilities(model: string): CacheCapabilities {
  const normalizedModel = normalizeModelName(model);

  if (!normalizedModel.startsWith('gemini-')) {
    return DEFAULT_CAPABILITIES;
  }

  if (isGooglePromptCachingUnsupported(normalizedModel)) {
    return disableCapabilities(GOOGLE_DEFAULT_CAPABILITIES);
  }

  return GOOGLE_DEFAULT_CAPABILITIES;
}

function mergeCapabilities(
  baseline: CacheCapabilities,
  runtimeOverride: CatalogCapabilityEntry,
): CacheCapabilities {
  const merged: CacheCapabilities = {
    supported: runtimeOverride.supported ?? baseline.supported,
    minTokens: runtimeOverride.minTokens ?? baseline.minTokens,
    maxBreakpoints: runtimeOverride.maxBreakpoints ?? baseline.maxBreakpoints,
    supportsTtl: runtimeOverride.supportsTtl ?? baseline.supportsTtl,
    supportedTtl: runtimeOverride.supportedTtl ?? baseline.supportedTtl,
    supportsToolCaching:
      runtimeOverride.supportsToolCaching ?? baseline.supportsToolCaching,
    isAutomatic: runtimeOverride.isAutomatic ?? baseline.isAutomatic,
  };

  const normalizedTtl = sanitizeTtlValues(
    [...merged.supportedTtl],
    [...baseline.supportedTtl],
  );

  return {
    ...merged,
    supportedTtl: normalizedTtl,
  };
}

function applyCapabilitySafetyRules(
  provider: Provider,
  model: string,
  candidate: CacheCapabilities,
  baseline: CacheCapabilities,
): CacheCapabilities {
  let safeCapabilities = normalizeCapabilities(candidate, baseline);

  switch (provider) {
    case 'anthropic': {
      safeCapabilities = {
        ...safeCapabilities,
        isAutomatic: false,
        supportsToolCaching: false,
        maxBreakpoints:
          safeCapabilities.maxBreakpoints === Infinity
            ? 4
            : Math.min(4, safeCapabilities.maxBreakpoints),
      };
      break;
    }

    case 'openai': {
      safeCapabilities = {
        ...safeCapabilities,
        supportsTtl: false,
        supportedTtl: [],
      };
      break;
    }

    case 'google': {
      safeCapabilities = {
        ...safeCapabilities,
        isAutomatic: false,
        supportsToolCaching: false,
        maxBreakpoints:
          safeCapabilities.maxBreakpoints === Infinity
            ? 1
            : Math.min(1, safeCapabilities.maxBreakpoints),
      };

      if (isGooglePromptCachingUnsupported(normalizeModelName(model))) {
        safeCapabilities = disableCapabilities(safeCapabilities);
      }
      break;
    }

    case 'other':
    default:
      break;
  }

  if (!safeCapabilities.supported) {
    return disableCapabilities(safeCapabilities);
  }

  return safeCapabilities;
}

function normalizeCapabilities(
  candidate: CacheCapabilities,
  baseline: CacheCapabilities,
): CacheCapabilities {
  const minTokens = Math.max(0, Math.floor(candidate.minTokens));

  const maxBreakpoints =
    candidate.maxBreakpoints === Infinity
      ? Infinity
      : Math.max(0, Math.floor(candidate.maxBreakpoints));

  const supportsTtl = Boolean(candidate.supportsTtl);
  const supportedTtl = supportsTtl
    ? sanitizeTtlValues(candidate.supportedTtl, baseline.supportedTtl)
    : [];

  return {
    supported: Boolean(candidate.supported),
    minTokens: Number.isFinite(minTokens) ? minTokens : baseline.minTokens,
    maxBreakpoints:
      maxBreakpoints === Infinity
        ? Infinity
        : Number.isFinite(maxBreakpoints)
          ? maxBreakpoints
          : baseline.maxBreakpoints,
    supportsTtl,
    supportedTtl,
    supportsToolCaching: Boolean(candidate.supportsToolCaching),
    isAutomatic: Boolean(candidate.isAutomatic),
  };
}

function sanitizeTtlValues(
  values: readonly ('5m' | '1h')[] = [],
  fallback: readonly ('5m' | '1h')[] = [],
): readonly ('5m' | '1h')[] {
  const valid = values.filter((ttl): ttl is CacheTtl =>
    VALID_TTLS.includes(ttl),
  );

  if (valid.length > 0) {
    return [...new Set(valid)];
  }

  return [...new Set(fallback.filter((ttl) => VALID_TTLS.includes(ttl)))];
}

function disableCapabilities(
  capabilities: CacheCapabilities,
): CacheCapabilities {
  return {
    ...capabilities,
    supported: false,
    maxBreakpoints: 0,
    supportsTtl: false,
    supportedTtl: [],
    supportsToolCaching: false,
    isAutomatic: false,
  };
}

function normalizeModelName(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/^models\//, '');
}

function isGooglePromptCachingUnsupported(normalizedModel: string): boolean {
  return GOOGLE_CACHE_UNSUPPORTED_PATTERNS.some((pattern) =>
    normalizedModel.includes(pattern),
  );
}
