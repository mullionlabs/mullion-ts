/**
 * Tests for cache capabilities module
 */

import {describe, expect, it} from 'vitest';
import {
  getCacheCapabilities,
  supportsCacheFeature,
  getEffectiveBreakpointLimit,
  isValidTtl,
  getRecommendedCacheStrategy,
  type CacheCapabilities,
  type Provider,
} from './capabilities.js';

describe('getCacheCapabilities', () => {
  describe('Anthropic models', () => {
    it('returns correct capabilities for Claude 3.5 Sonnet', () => {
      const caps = getCacheCapabilities(
        'anthropic',
        'claude-3-5-sonnet-20241022',
      );

      expect(caps).toEqual({
        supported: true,
        minTokens: 1024,
        maxBreakpoints: 4,
        supportsTtl: true,
        supportedTtl: ['5m', '1h'],
        supportsToolCaching: false,
        isAutomatic: false,
      });
    });

    it('returns correct capabilities for Claude 3.5 Haiku (higher token threshold)', () => {
      const caps = getCacheCapabilities(
        'anthropic',
        'claude-3-5-haiku-20241022',
      );

      expect(caps).toEqual({
        supported: true,
        minTokens: 2048, // Haiku uses higher threshold
        maxBreakpoints: 4,
        supportsTtl: true,
        supportedTtl: ['5m', '1h'],
        supportsToolCaching: false,
        isAutomatic: false,
      });
    });

    it('returns correct capabilities for Claude 3 Haiku (higher token threshold)', () => {
      const caps = getCacheCapabilities('anthropic', 'claude-3-haiku-20240307');

      expect(caps).toEqual({
        supported: true,
        minTokens: 2048, // Haiku 3 also uses higher threshold
        maxBreakpoints: 4,
        supportsTtl: true,
        supportedTtl: ['5m', '1h'],
        supportsToolCaching: false,
        isAutomatic: false,
      });
    });

    it('returns correct capabilities for future Claude 4.5 models', () => {
      const caps = getCacheCapabilities('anthropic', 'claude-opus-4-5');

      expect(caps).toEqual({
        supported: true,
        minTokens: 4096, // Future models have higher thresholds
        maxBreakpoints: 4,
        supportsTtl: true,
        supportedTtl: ['5m', '1h'],
        supportsToolCaching: false,
        isAutomatic: false,
      });
    });

    it('returns fallback capabilities for unknown Anthropic models', () => {
      const caps = getCacheCapabilities('anthropic', 'claude-future-model-xyz');

      expect(caps).toEqual({
        supported: true,
        minTokens: 1024, // Default to Sonnet-like behavior
        maxBreakpoints: 4,
        supportsTtl: true,
        supportedTtl: ['5m', '1h'],
        supportsToolCaching: false,
        isAutomatic: false,
      });
    });

    it('validates all Anthropic models have isAutomatic: false', () => {
      const models = [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
      ];

      for (const model of models) {
        const caps = getCacheCapabilities('anthropic', model);
        expect(caps.isAutomatic).toBe(false);
        expect(caps.supported).toBe(true);
        expect(caps.maxBreakpoints).toBe(4);
        expect(caps.supportsTtl).toBe(true);
        expect(caps.supportsToolCaching).toBe(false);
      }
    });
  });

  describe('OpenAI models', () => {
    it('returns correct capabilities for GPT-4o', () => {
      const caps = getCacheCapabilities('openai', 'gpt-4o');

      expect(caps).toEqual({
        supported: true,
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportedTtl: [],
        supportsToolCaching: true,
        isAutomatic: true,
      });
    });

    it('returns correct capabilities for GPT-4o-mini', () => {
      const caps = getCacheCapabilities('openai', 'gpt-4o-mini');

      expect(caps).toEqual({
        supported: true,
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportedTtl: [],
        supportsToolCaching: true,
        isAutomatic: true,
      });
    });

    it('returns correct capabilities for GPT-4 (no tool caching)', () => {
      const caps = getCacheCapabilities('openai', 'gpt-4');

      expect(caps).toEqual({
        supported: true,
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportedTtl: [],
        supportsToolCaching: false, // Classic GPT-4 doesn't support tool caching
        isAutomatic: true,
      });
    });

    it('returns correct capabilities for GPT-3.5-turbo (no caching)', () => {
      const caps = getCacheCapabilities('openai', 'gpt-3.5-turbo');

      expect(caps).toEqual({
        supported: false, // GPT-3.5 doesn't support caching
        minTokens: 1024,
        maxBreakpoints: 0,
        supportsTtl: false,
        supportedTtl: [],
        supportsToolCaching: false,
        isAutomatic: false,
      });
    });

    it('returns fallback capabilities for unknown OpenAI models', () => {
      const caps = getCacheCapabilities('openai', 'gpt-future-model-xyz');

      expect(caps).toEqual({
        supported: true,
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportedTtl: [],
        supportsToolCaching: true, // Assume modern capabilities
        isAutomatic: true,
      });
    });

    it('validates all supported OpenAI models have isAutomatic: true', () => {
      const models = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4-turbo-preview',
        'gpt-4',
      ];

      for (const model of models) {
        const caps = getCacheCapabilities('openai', model);
        expect(caps.isAutomatic).toBe(true);
        expect(caps.maxBreakpoints).toBe(Infinity);
        expect(caps.supportsTtl).toBe(false);
        expect(caps.supportedTtl).toEqual([]);
      }
    });
  });

  describe('Google provider', () => {
    it('returns not-yet-implemented capabilities for Google models', () => {
      const caps = getCacheCapabilities('google', 'gemini-pro');

      expect(caps).toEqual({
        supported: false, // Not implemented yet
        minTokens: 2048,
        maxBreakpoints: 1,
        supportsTtl: true,
        supportedTtl: ['5m', '1h'],
        supportsToolCaching: false,
        isAutomatic: false,
      });
    });
  });

  describe('Other/unknown providers', () => {
    it('returns default capabilities for other provider', () => {
      const caps = getCacheCapabilities('other', 'some-model');

      expect(caps).toEqual({
        supported: false,
        minTokens: 2048,
        maxBreakpoints: 1,
        supportsTtl: false,
        supportedTtl: [],
        supportsToolCaching: false,
        isAutomatic: false,
      });
    });

    it('returns default capabilities for unknown provider string', () => {
      const caps = getCacheCapabilities('unknown' as Provider, 'some-model');

      expect(caps).toEqual({
        supported: false,
        minTokens: 2048,
        maxBreakpoints: 1,
        supportsTtl: false,
        supportedTtl: [],
        supportsToolCaching: false,
        isAutomatic: false,
      });
    });
  });
});

describe('supportsCacheFeature', () => {
  it('correctly identifies TTL support', () => {
    expect(
      supportsCacheFeature('anthropic', 'claude-3-5-sonnet-20241022', 'ttl'),
    ).toBe(true);
    expect(supportsCacheFeature('openai', 'gpt-4o', 'ttl')).toBe(false);
  });

  it('correctly identifies tool caching support', () => {
    expect(
      supportsCacheFeature(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        'toolCaching',
      ),
    ).toBe(false);
    expect(supportsCacheFeature('openai', 'gpt-4o', 'toolCaching')).toBe(true);
    expect(supportsCacheFeature('openai', 'gpt-4', 'toolCaching')).toBe(false);
  });

  it('correctly identifies automatic caching support', () => {
    expect(
      supportsCacheFeature(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        'automatic',
      ),
    ).toBe(false);
    expect(supportsCacheFeature('openai', 'gpt-4o', 'automatic')).toBe(true);
  });

  it('returns false for unknown features', () => {
    expect(
      supportsCacheFeature(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        'unknown' as any,
      ),
    ).toBe(false);
  });
});

describe('getEffectiveBreakpointLimit', () => {
  it('returns actual limit for Anthropic models', () => {
    const limit = getEffectiveBreakpointLimit(
      'anthropic',
      'claude-3-5-sonnet-20241022',
    );
    expect(limit).toBe(4);
  });

  it('returns practical limit for OpenAI models (converts Infinity)', () => {
    const limit = getEffectiveBreakpointLimit('openai', 'gpt-4o');
    expect(limit).toBe(10); // default maxPractical
  });

  it('respects custom maxPractical parameter', () => {
    const limit = getEffectiveBreakpointLimit('openai', 'gpt-4o', 5);
    expect(limit).toBe(5);
  });

  it('returns actual limit when not Infinity', () => {
    const limit = getEffectiveBreakpointLimit(
      'anthropic',
      'claude-3-opus-20240229',
      100,
    );
    expect(limit).toBe(4); // ignores maxPractical when not Infinity
  });
});

describe('isValidTtl', () => {
  it('validates TTL for Anthropic models', () => {
    expect(isValidTtl('anthropic', 'claude-3-5-sonnet-20241022', '5m')).toBe(
      true,
    );
    expect(isValidTtl('anthropic', 'claude-3-5-sonnet-20241022', '1h')).toBe(
      true,
    );
  });

  it('rejects TTL for OpenAI models', () => {
    expect(isValidTtl('openai', 'gpt-4o', '5m')).toBe(false);
    expect(isValidTtl('openai', 'gpt-4o', '1h')).toBe(false);
  });

  it('rejects TTL for unsupported providers', () => {
    expect(isValidTtl('other', 'some-model', '5m')).toBe(false);
    expect(isValidTtl('other', 'some-model', '1h')).toBe(false);
  });
});

describe('getRecommendedCacheStrategy', () => {
  it('recommends explicit segments for Anthropic models', () => {
    const strategy = getRecommendedCacheStrategy(
      'anthropic',
      'claude-3-5-sonnet-20241022',
    );
    expect(strategy).toBe('explicit-segments');
  });

  it('recommends automatic optimization for OpenAI models', () => {
    const strategy = getRecommendedCacheStrategy('openai', 'gpt-4o');
    expect(strategy).toBe('automatic-optimization');
  });

  it('recommends disabled for unsupported models', () => {
    const strategy = getRecommendedCacheStrategy('openai', 'gpt-3.5-turbo');
    expect(strategy).toBe('disabled');

    const strategy2 = getRecommendedCacheStrategy('other', 'some-model');
    expect(strategy2).toBe('disabled');
  });

  it('recommends disabled for Google (not yet implemented)', () => {
    const strategy = getRecommendedCacheStrategy('google', 'gemini-pro');
    expect(strategy).toBe('disabled');
  });
});

describe('Model-specific token thresholds', () => {
  it('verifies Haiku models use higher thresholds', () => {
    const haiku3 = getCacheCapabilities('anthropic', 'claude-3-haiku-20240307');
    const haiku35 = getCacheCapabilities(
      'anthropic',
      'claude-3-5-haiku-20241022',
    );
    const haiku45 = getCacheCapabilities('anthropic', 'claude-4-5-haiku');

    expect(haiku3.minTokens).toBe(2048);
    expect(haiku35.minTokens).toBe(2048);
    expect(haiku45.minTokens).toBe(4096); // Future model has even higher threshold
  });

  it('verifies Sonnet models use standard thresholds', () => {
    const sonnet3 = getCacheCapabilities(
      'anthropic',
      'claude-3-sonnet-20240229',
    );
    const sonnet35 = getCacheCapabilities(
      'anthropic',
      'claude-3-5-sonnet-20241022',
    );

    expect(sonnet3.minTokens).toBe(1024);
    expect(sonnet35.minTokens).toBe(1024);
  });

  it('verifies Opus models use correct thresholds', () => {
    const opus3 = getCacheCapabilities('anthropic', 'claude-3-opus-20240229');
    const opus45 = getCacheCapabilities('anthropic', 'claude-opus-4-5');

    expect(opus3.minTokens).toBe(1024); // Current Opus
    expect(opus45.minTokens).toBe(4096); // Future Opus
  });

  it('verifies all OpenAI models use 1024 minimum', () => {
    const models = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ];

    for (const model of models) {
      const caps = getCacheCapabilities('openai', model);
      expect(caps.minTokens).toBe(1024);
    }
  });
});

describe('Type safety', () => {
  it('validates CacheCapabilities interface structure', () => {
    const caps: CacheCapabilities = getCacheCapabilities(
      'anthropic',
      'claude-3-5-sonnet-20241022',
    );

    // Ensure all required properties exist
    expect(typeof caps.supported).toBe('boolean');
    expect(typeof caps.minTokens).toBe('number');
    expect(typeof caps.maxBreakpoints).toBe('number');
    expect(typeof caps.supportsTtl).toBe('boolean');
    expect(Array.isArray(caps.supportedTtl)).toBe(true);
    expect(typeof caps.supportsToolCaching).toBe('boolean');
    expect(typeof caps.isAutomatic).toBe('boolean');
  });

  it('validates supportedTtl array types', () => {
    const anthropicCaps = getCacheCapabilities(
      'anthropic',
      'claude-3-5-sonnet-20241022',
    );
    const openaiCaps = getCacheCapabilities('openai', 'gpt-4o');

    expect(anthropicCaps.supportedTtl).toEqual(['5m', '1h']);
    expect(openaiCaps.supportedTtl).toEqual([]);

    // Type-level verification that only specific TTL values are allowed
    for (const ttl of anthropicCaps.supportedTtl) {
      expect(['5m', '1h'].includes(ttl)).toBe(true);
    }
  });
});
