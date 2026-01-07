import { describe, it, expect } from 'vitest';
import {
  getCacheCapabilities,
  supportsCacheFeature,
  getEffectiveBreakpointLimit,
  type Provider,
} from './cache-capabilities.js';

describe('getCacheCapabilities', () => {
  describe('Anthropic models', () => {
    it('should return correct capabilities for Claude 3.5 Sonnet', () => {
      const caps = getCacheCapabilities(
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(caps).toEqual({
        minTokens: 1024,
        maxBreakpoints: 4,
        supportsTtl: true,
        supportsToolCaching: false,
      });
    });

    it('should return correct capabilities for Claude 3.5 Haiku', () => {
      const caps = getCacheCapabilities(
        'anthropic',
        'claude-3-5-haiku-20241022'
      );

      expect(caps).toEqual({
        minTokens: 1024,
        maxBreakpoints: 4,
        supportsTtl: true,
        supportsToolCaching: false,
      });
    });

    it('should return correct capabilities for Claude 3 Opus', () => {
      const caps = getCacheCapabilities('anthropic', 'claude-3-opus-20240229');

      expect(caps).toEqual({
        minTokens: 1024,
        maxBreakpoints: 4,
        supportsTtl: true,
        supportsToolCaching: false,
      });
    });

    it('should return fallback for unknown Anthropic model', () => {
      const caps = getCacheCapabilities('anthropic', 'claude-future-model');

      expect(caps).toEqual({
        minTokens: 1024,
        maxBreakpoints: 4,
        supportsTtl: true,
        supportsToolCaching: false,
      });
    });
  });

  describe('OpenAI models', () => {
    it('should return correct capabilities for GPT-4o', () => {
      const caps = getCacheCapabilities('openai', 'gpt-4o');

      expect(caps).toEqual({
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportsToolCaching: true,
      });
    });

    it('should return correct capabilities for GPT-4o Mini', () => {
      const caps = getCacheCapabilities('openai', 'gpt-4o-mini');

      expect(caps).toEqual({
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportsToolCaching: true,
      });
    });

    it('should return correct capabilities for GPT-4 Turbo', () => {
      const caps = getCacheCapabilities('openai', 'gpt-4-turbo');

      expect(caps).toEqual({
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportsToolCaching: true,
      });
    });

    it('should return correct capabilities for GPT-4 (legacy)', () => {
      const caps = getCacheCapabilities('openai', 'gpt-4');

      expect(caps).toEqual({
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportsToolCaching: false,
      });
    });

    it('should return correct capabilities for GPT-3.5 Turbo', () => {
      const caps = getCacheCapabilities('openai', 'gpt-3.5-turbo');

      expect(caps).toEqual({
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportsToolCaching: false,
      });
    });

    it('should return fallback for unknown OpenAI model', () => {
      const caps = getCacheCapabilities('openai', 'gpt-future-model');

      expect(caps).toEqual({
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportsToolCaching: true,
      });
    });
  });

  describe('Other providers', () => {
    it('should return default capabilities for Google', () => {
      const caps = getCacheCapabilities('google', 'gemini-pro');

      expect(caps).toEqual({
        minTokens: 2048,
        maxBreakpoints: 1,
        supportsTtl: false,
        supportsToolCaching: false,
      });
    });

    it('should return default capabilities for other providers', () => {
      const caps = getCacheCapabilities('other', 'some-model');

      expect(caps).toEqual({
        minTokens: 2048,
        maxBreakpoints: 1,
        supportsTtl: false,
        supportsToolCaching: false,
      });
    });
  });

  describe('Type safety', () => {
    it('should accept valid provider types', () => {
      const providers: Provider[] = ['anthropic', 'openai', 'google', 'other'];

      providers.forEach((provider) => {
        const caps = getCacheCapabilities(provider, 'test-model');
        expect(caps).toBeDefined();
        expect(typeof caps.minTokens).toBe('number');
        expect(typeof caps.maxBreakpoints).toBe('number');
        expect(typeof caps.supportsTtl).toBe('boolean');
        expect(typeof caps.supportsToolCaching).toBe('boolean');
      });
    });
  });
});

describe('supportsCacheFeature', () => {
  it('should correctly identify TTL support for Anthropic', () => {
    const supportsTtl = supportsCacheFeature(
      'anthropic',
      'claude-3-5-sonnet-20241022',
      'ttl'
    );
    expect(supportsTtl).toBe(true);
  });

  it('should correctly identify no TTL support for OpenAI', () => {
    const supportsTtl = supportsCacheFeature('openai', 'gpt-4o', 'ttl');
    expect(supportsTtl).toBe(false);
  });

  it('should correctly identify tool caching support for OpenAI', () => {
    const supportsToolCaching = supportsCacheFeature(
      'openai',
      'gpt-4o',
      'toolCaching'
    );
    expect(supportsToolCaching).toBe(true);
  });

  it('should correctly identify no tool caching support for Anthropic', () => {
    const supportsToolCaching = supportsCacheFeature(
      'anthropic',
      'claude-3-5-sonnet-20241022',
      'toolCaching'
    );
    expect(supportsToolCaching).toBe(false);
  });

  it('should return false for unknown features', () => {
    // @ts-expect-error - testing invalid feature
    const supportsUnknown = supportsCacheFeature(
      'anthropic',
      'claude-3-5-sonnet-20241022',
      'unknown'
    );
    expect(supportsUnknown).toBe(false);
  });
});

describe('getEffectiveBreakpointLimit', () => {
  it('should return actual limit for Anthropic models', () => {
    const limit = getEffectiveBreakpointLimit(
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );
    expect(limit).toBe(4);
  });

  it('should return practical limit for OpenAI models (default)', () => {
    const limit = getEffectiveBreakpointLimit('openai', 'gpt-4o');
    expect(limit).toBe(10);
  });

  it('should return custom practical limit for OpenAI models', () => {
    const limit = getEffectiveBreakpointLimit('openai', 'gpt-4o', 5);
    expect(limit).toBe(5);
  });

  it('should return actual limit when not infinity', () => {
    const limit = getEffectiveBreakpointLimit('google', 'gemini-pro');
    expect(limit).toBe(1);
  });

  it('should handle practical limit of 0', () => {
    const limit = getEffectiveBreakpointLimit('openai', 'gpt-4o', 0);
    expect(limit).toBe(0);
  });
});

describe('Integration scenarios', () => {
  it('should help determine optimal cache strategy for Anthropic', () => {
    const caps = getCacheCapabilities(
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    // Mock system prompt length
    const systemPromptTokens = 500;
    const documentTokens = 2000;

    // System prompt too short for caching
    expect(systemPromptTokens < caps.minTokens).toBe(true);

    // Document long enough for caching
    expect(documentTokens >= caps.minTokens).toBe(true);

    // Can use TTL
    expect(caps.supportsTtl).toBe(true);

    // Cannot use tool caching
    expect(caps.supportsToolCaching).toBe(false);

    // Can use up to 4 breakpoints
    expect(caps.maxBreakpoints).toBe(4);
  });

  it('should help determine optimal cache strategy for OpenAI', () => {
    const caps = getCacheCapabilities('openai', 'gpt-4o');

    // Mock content lengths
    const systemPromptTokens = 500;
    const documentTokens = 2000;

    // System prompt too short for caching
    expect(systemPromptTokens < caps.minTokens).toBe(true);

    // Document long enough for caching
    expect(documentTokens >= caps.minTokens).toBe(true);

    // Cannot use TTL (automatic caching)
    expect(caps.supportsTtl).toBe(false);

    // Can use tool caching
    expect(caps.supportsToolCaching).toBe(true);

    // No practical limit on breakpoints
    expect(caps.maxBreakpoints).toBe(Infinity);
    expect(getEffectiveBreakpointLimit('openai', 'gpt-4o')).toBe(10);
  });

  it('should provide conservative defaults for unknown providers', () => {
    const caps = getCacheCapabilities('other', 'mystery-model');

    // Conservative minimum token threshold
    expect(caps.minTokens).toBe(2048);

    // Safe minimum breakpoints
    expect(caps.maxBreakpoints).toBe(1);

    // No advanced features
    expect(caps.supportsTtl).toBe(false);
    expect(caps.supportsToolCaching).toBe(false);
  });
});
