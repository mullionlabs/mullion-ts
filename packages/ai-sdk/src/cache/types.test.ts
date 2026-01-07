/**
 * Tests for cache types and configuration
 */

import { describe, expect, it } from 'vitest';
import {
  validateTtlOrdering,
  validateBreakpointLimit,
  validateMinTokens,
  createAnthropicAdapter,
  createOpenAIAdapter,
  createDefaultCacheConfig,
  createUserContentConfig,
  createDeveloperContentConfig,
  type CacheConfig,
  type CacheTTL,
  type CacheScope,
  type ValidationResult,
} from './types.js';

describe('validateTtlOrdering', () => {
  it('validates correct TTL ordering (longest to shortest)', () => {
    const segments = [{ ttl: '1h' as CacheTTL }, { ttl: '5m' as CacheTTL }];

    const result = validateTtlOrdering(segments);

    expect(result).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
  });

  it('detects incorrect TTL ordering', () => {
    const segments = [
      { ttl: '5m' as CacheTTL },
      { ttl: '1h' as CacheTTL }, // Wrong order
    ];

    const result = validateTtlOrdering(segments);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(
      'TTL values must be ordered from longest to shortest'
    );
  });

  it('handles segments without TTL', () => {
    const segments = [
      { ttl: '1h' as CacheTTL },
      {}, // No TTL
      { ttl: '5m' as CacheTTL },
    ];

    const result = validateTtlOrdering(segments);

    expect(result.valid).toBe(true);
  });

  it('handles empty segments array', () => {
    const result = validateTtlOrdering([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('handles all same TTL values', () => {
    const segments = [
      { ttl: '5m' as CacheTTL },
      { ttl: '5m' as CacheTTL },
      { ttl: '5m' as CacheTTL },
    ];

    const result = validateTtlOrdering(segments);
    expect(result.valid).toBe(true);
  });
});

describe('validateBreakpointLimit', () => {
  it('validates breakpoint count within Anthropic limit', () => {
    const result = validateBreakpointLimit(
      3,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects breakpoint count exceeding Anthropic limit', () => {
    const result = validateBreakpointLimit(
      5,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('exceeds provider limit of 4');
  });

  it('validates breakpoint count for OpenAI (unlimited)', () => {
    const result = validateBreakpointLimit(100, 'openai', 'gpt-4o');

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates edge case of zero breakpoints', () => {
    const result = validateBreakpointLimit(
      0,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(result.valid).toBe(true);
  });
});

describe('validateMinTokens', () => {
  it('warns when token count is below Anthropic minimum', () => {
    const result = validateMinTokens(
      500,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(result.valid).toBe(true); // Warning, not error
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('below provider minimum of 1024');
  });

  it('passes when token count meets minimum requirement', () => {
    const result = validateMinTokens(
      2000,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('warns for Haiku model with higher threshold', () => {
    const result = validateMinTokens(
      1500,
      'anthropic',
      'claude-3-haiku-20240307'
    );

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('below provider minimum of 2048');
  });

  it('handles OpenAI minimum token requirement', () => {
    const result = validateMinTokens(800, 'openai', 'gpt-4o');

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('below provider minimum of 1024');
  });
});

describe('createAnthropicAdapter', () => {
  it('creates adapter with correct default configuration', () => {
    const adapter = createAnthropicAdapter('claude-3-5-sonnet-20241022');
    const config: CacheConfig = { enabled: true };

    const result = adapter.toProviderOptions(config);

    expect(result).toEqual({
      cache: {
        type: 'ephemeral',
        ttl: '5m', // default TTL
      },
      breakpoints: 1, // default breakpoints
    });
  });

  it('respects custom configuration values', () => {
    const adapter = createAnthropicAdapter('claude-3-5-sonnet-20241022');
    const config: CacheConfig = {
      enabled: true,
      scope: 'system-only',
      ttl: '1h',
      breakpoints: 3,
    };

    const result = adapter.toProviderOptions(config);

    expect(result).toEqual({
      cache: {
        type: 'ephemeral',
        ttl: '1h',
      },
      breakpoints: 3,
    });
  });

  it('disables cache when enabled: false', () => {
    const adapter = createAnthropicAdapter('claude-3-5-sonnet-20241022');
    const config: CacheConfig = { enabled: false };

    const result = adapter.toProviderOptions(config);

    expect(result).toEqual({
      cache: undefined,
      breakpoints: 1,
    });
  });

  it('limits breakpoints to provider maximum', () => {
    const adapter = createAnthropicAdapter('claude-3-5-sonnet-20241022');
    const config: CacheConfig = {
      enabled: true,
      breakpoints: 10, // Exceeds Anthropic limit of 4
    };

    const result = adapter.toProviderOptions(config);

    expect(result.breakpoints).toBe(4); // Clamped to provider limit
  });

  it('handles model with TTL support correctly', () => {
    // All Anthropic models support TTL, so this tests normal behavior
    const adapter = createAnthropicAdapter('claude-3-5-sonnet-20241022');
    const config: CacheConfig = {
      enabled: true,
      ttl: '1h',
    };

    const result = adapter.toProviderOptions(config);

    // Should create cache object with TTL since Anthropic supports it
    expect(result.cache).toEqual({
      type: 'ephemeral',
      ttl: '1h',
    });
  });

  it('handles unsupported model gracefully', () => {
    const adapter = createAnthropicAdapter('unknown-model');
    const config: CacheConfig = { enabled: true };

    const result = adapter.toProviderOptions(config);

    // Should use fallback capabilities
    expect(result).toEqual({
      cache: {
        type: 'ephemeral',
        ttl: '5m',
      },
      breakpoints: 1,
    });
  });
});

describe('createOpenAIAdapter', () => {
  it('creates adapter with correct default configuration', () => {
    const adapter = createOpenAIAdapter('gpt-4o');
    const config: CacheConfig = { enabled: true };

    const result = adapter.toProviderOptions(config);

    expect(result).toEqual({
      autoCaching: true,
      toolCaching: {
        enabled: true,
      },
    });
  });

  it('disables caching when enabled: false', () => {
    const adapter = createOpenAIAdapter('gpt-4o');
    const config: CacheConfig = { enabled: false };

    const result = adapter.toProviderOptions(config);

    expect(result).toEqual({
      autoCaching: false,
      toolCaching: {
        enabled: false,
      },
    });
  });

  it('handles model without tool caching support', () => {
    const adapter = createOpenAIAdapter('gpt-4'); // Classic GPT-4 without tool caching
    const config: CacheConfig = { enabled: true };

    const result = adapter.toProviderOptions(config);

    expect(result).toEqual({
      autoCaching: true,
      toolCaching: undefined, // Not supported
    });
  });

  it('handles unsupported model', () => {
    const adapter = createOpenAIAdapter('gpt-3.5-turbo'); // No caching support
    const config: CacheConfig = { enabled: true };

    const result = adapter.toProviderOptions(config);

    expect(result).toEqual({
      autoCaching: false, // Model doesn't support caching
      toolCaching: undefined,
    });
  });

  it('ignores scope and TTL parameters (not applicable to OpenAI)', () => {
    const adapter = createOpenAIAdapter('gpt-4o');
    const config: CacheConfig = {
      enabled: true,
      scope: 'allow-user-content',
      ttl: '1h',
      breakpoints: 5,
    };

    const result = adapter.toProviderOptions(config);

    // OpenAI adapter ignores these parameters
    expect(result).toEqual({
      autoCaching: true,
      toolCaching: {
        enabled: true,
      },
    });
  });
});

describe('Configuration Factories', () => {
  describe('createDefaultCacheConfig', () => {
    it('creates default configuration', () => {
      const config = createDefaultCacheConfig();

      expect(config).toEqual({
        enabled: true,
        scope: 'developer-content',
        ttl: '5m',
        breakpoints: 1,
      });
    });

    it('applies overrides to defaults', () => {
      const config = createDefaultCacheConfig({
        enabled: false,
        ttl: '1h',
      });

      expect(config).toEqual({
        enabled: false,
        scope: 'developer-content',
        ttl: '1h',
        breakpoints: 1,
      });
    });

    it('preserves all overridden values', () => {
      const overrides: CacheConfig = {
        enabled: false,
        scope: 'system-only',
        ttl: '1h',
        breakpoints: 3,
      };

      const config = createDefaultCacheConfig(overrides);

      expect(config).toEqual(overrides);
    });
  });

  describe('createUserContentConfig', () => {
    it('creates user-safe configuration', () => {
      const config = createUserContentConfig();

      expect(config).toEqual({
        enabled: true,
        scope: 'allow-user-content',
        ttl: '5m',
        breakpoints: 1,
      });
    });

    it('applies overrides while maintaining safe defaults', () => {
      const config = createUserContentConfig({
        breakpoints: 2,
      });

      expect(config).toEqual({
        enabled: true,
        scope: 'allow-user-content',
        ttl: '5m',
        breakpoints: 2,
      });
    });

    it('allows overriding scope (developer decision)', () => {
      const config = createUserContentConfig({
        scope: 'developer-content',
      });

      expect(config.scope).toBe('developer-content');
    });
  });

  describe('createDeveloperContentConfig', () => {
    it('creates developer-optimized configuration', () => {
      const config = createDeveloperContentConfig();

      expect(config).toEqual({
        enabled: true,
        scope: 'developer-content',
        ttl: '1h',
        breakpoints: 4,
      });
    });

    it('applies overrides to developer defaults', () => {
      const config = createDeveloperContentConfig({
        ttl: '5m',
        breakpoints: 2,
      });

      expect(config).toEqual({
        enabled: true,
        scope: 'developer-content',
        ttl: '5m',
        breakpoints: 2,
      });
    });

    it('allows switching to system-only scope', () => {
      const config = createDeveloperContentConfig({
        scope: 'system-only',
      });

      expect(config.scope).toBe('system-only');
    });
  });
});

describe('Type Safety', () => {
  it('validates CacheConfig interface structure', () => {
    const config: CacheConfig = {
      enabled: true,
      scope: 'developer-content',
      ttl: '5m',
      breakpoints: 1,
    };

    expect(typeof config.enabled).toBe('boolean');
    expect([
      'system-only',
      'developer-content',
      'allow-user-content',
    ]).toContain(config.scope);
    expect(['5m', '1h']).toContain(config.ttl);
    expect(typeof config.breakpoints).toBe('number');
  });

  it('validates CacheScope type constraints', () => {
    const scopes: CacheScope[] = [
      'system-only',
      'developer-content',
      'allow-user-content',
    ];

    for (const scope of scopes) {
      const config: CacheConfig = {
        enabled: true,
        scope,
      };
      expect(config.scope).toBe(scope);
    }
  });

  it('validates CacheTTL type constraints', () => {
    const ttls: CacheTTL[] = ['5m', '1h'];

    for (const ttl of ttls) {
      const config: CacheConfig = {
        enabled: true,
        ttl,
      };
      expect(config.ttl).toBe(ttl);
    }
  });

  it('validates ValidationResult interface', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

describe('Edge Cases and Error Handling', () => {
  it('handles undefined/null configurations gracefully in adapters', () => {
    const anthropicAdapter = createAnthropicAdapter(
      'claude-3-5-sonnet-20241022'
    );

    // Partial config should work with defaults
    const result = anthropicAdapter.toProviderOptions({} as CacheConfig);

    expect(result.cache).toBeUndefined(); // enabled defaults to undefined, so no cache
    expect(result.breakpoints).toBe(1);
  });

  it('handles extreme breakpoint values', () => {
    const anthropicAdapter = createAnthropicAdapter(
      'claude-3-5-sonnet-20241022'
    );

    const configNegative: CacheConfig = {
      enabled: true,
      breakpoints: -5,
    };

    const resultNegative = anthropicAdapter.toProviderOptions(configNegative);
    expect(resultNegative.breakpoints).toBe(0); // Math.max ensures non-negative

    const configHuge: CacheConfig = {
      enabled: true,
      breakpoints: 999999,
    };

    const resultHuge = anthropicAdapter.toProviderOptions(configHuge);
    expect(resultHuge.breakpoints).toBe(4); // Clamped to Anthropic max
  });

  it('handles all scope combinations correctly', () => {
    const scopes: CacheScope[] = [
      'system-only',
      'developer-content',
      'allow-user-content',
    ];

    for (const scope of scopes) {
      const config = createDefaultCacheConfig({ scope });
      expect(config.scope).toBe(scope);
    }
  });
});
