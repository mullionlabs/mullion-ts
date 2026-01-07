import { describe, it, expect } from 'vitest';
import {
  validateCacheConfig,
  createCacheConfig,
  createUserContentCacheConfig,
  createDeveloperCacheConfig,
  adaptToAnthropicCache,
  adaptToOpenAICache,
  type CacheScope,
  type CacheTTL,
} from './cache-config.js';
import { getCacheCapabilities } from './cache-capabilities.js';

describe('Cache Config Types', () => {
  describe('CacheScope type', () => {
    it('should accept valid scope values', () => {
      const scopes: CacheScope[] = [
        'system-only',
        'developer-content',
        'allow-user-content',
      ];
      expect(scopes).toHaveLength(3);
    });
  });

  describe('CacheTTL type', () => {
    it('should accept valid TTL values', () => {
      const ttls: CacheTTL[] = ['5m', '1h', '24h', 'session'];
      expect(ttls).toHaveLength(4);
    });
  });
});

describe('createCacheConfig', () => {
  it('should create config with sensible defaults', () => {
    const config = createCacheConfig();

    expect(config).toEqual({
      defaultScope: 'developer-content',
      defaultTtl: '1h',
      maxBreakpoints: 2,
      segments: [],
      collectMetrics: true,
    });
  });

  it('should allow overriding defaults', () => {
    const config = createCacheConfig({
      defaultScope: 'system-only',
      maxBreakpoints: 4,
      segments: [{ scope: 'developer-content', ttl: '5m' }],
    });

    expect(config.defaultScope).toBe('system-only');
    expect(config.maxBreakpoints).toBe(4);
    expect(config.segments).toHaveLength(1);
    expect(config.segments[0].scope).toBe('developer-content');
  });
});

describe('createUserContentCacheConfig', () => {
  it('should create safe config for user content', () => {
    const config = createUserContentCacheConfig();

    expect(config).toEqual({
      defaultScope: 'allow-user-content',
      defaultTtl: '5m',
      maxBreakpoints: 1,
      segments: [],
      collectMetrics: false,
    });
  });

  it('should allow overriding user content defaults', () => {
    const config = createUserContentCacheConfig({
      defaultTtl: '1h',
      collectMetrics: true,
    });

    expect(config.defaultScope).toBe('allow-user-content');
    expect(config.defaultTtl).toBe('1h');
    expect(config.collectMetrics).toBe(true);
  });
});

describe('createDeveloperCacheConfig', () => {
  it('should create optimized config for developer content', () => {
    const config = createDeveloperCacheConfig();

    expect(config).toEqual({
      defaultScope: 'developer-content',
      defaultTtl: '24h',
      maxBreakpoints: 4,
      segments: [],
      collectMetrics: true,
    });
  });

  it('should allow overriding developer config defaults', () => {
    const config = createDeveloperCacheConfig({
      defaultTtl: '1h',
      maxBreakpoints: 2,
    });

    expect(config.defaultScope).toBe('developer-content');
    expect(config.defaultTtl).toBe('1h');
    expect(config.maxBreakpoints).toBe(2);
  });
});

describe('validateCacheConfig', () => {
  describe('Anthropic validation', () => {
    it('should pass valid config', () => {
      const config = createCacheConfig({
        maxBreakpoints: 4,
        defaultTtl: '1h',
        segments: [{ scope: 'developer-content', ttl: '5m' }],
      });

      const result = validateCacheConfig(
        config,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject too many breakpoints', () => {
      const config = createCacheConfig({
        maxBreakpoints: 10, // Anthropic max is 4
      });

      const result = validateCacheConfig(
        config,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Max breakpoints (10) exceeds provider limit (4)'
      );
    });

    it('should allow TTL for Anthropic', () => {
      const config = createCacheConfig({
        defaultTtl: '1h',
        segments: [{ scope: 'developer-content', ttl: '5m' }],
      });

      const result = validateCacheConfig(
        config,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('OpenAI validation', () => {
    it('should reject TTL for OpenAI', () => {
      const config = createCacheConfig({
        defaultTtl: '1h', // OpenAI doesn't support TTL
      });

      const result = validateCacheConfig(config, 'openai', 'gpt-4o');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Provider 'openai' does not support TTL, but defaultTtl is set to '1h'"
      );
    });

    it('should pass session TTL for OpenAI', () => {
      const config = createCacheConfig({
        defaultTtl: 'session', // Session TTL is always allowed
      });

      const result = validateCacheConfig(config, 'openai', 'gpt-4o');

      expect(result.valid).toBe(true);
    });

    it('should allow unlimited breakpoints for OpenAI', () => {
      const config = createCacheConfig({
        maxBreakpoints: 100, // OpenAI has no limit
        defaultTtl: 'session', // Use session TTL for OpenAI compatibility
      });

      const result = validateCacheConfig(config, 'openai', 'gpt-4o');

      expect(result.valid).toBe(true);
    });
  });

  describe('TTL ordering validation', () => {
    it('should reject segment TTL longer than default', () => {
      const config = createCacheConfig({
        defaultTtl: '5m',
        segments: [
          { scope: 'developer-content', ttl: '1h' }, // Longer than default
        ],
      });

      const result = validateCacheConfig(
        config,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Segment 0 TTL '1h' is longer than default TTL '5m'"
      );
    });

    it('should allow segment TTL shorter than or equal to default', () => {
      const config = createCacheConfig({
        defaultTtl: '1h',
        segments: [
          { scope: 'developer-content', ttl: '5m' }, // Shorter than default
          { scope: 'developer-content', ttl: '1h' }, // Equal to default
        ],
      });

      const result = validateCacheConfig(
        config,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('Token threshold validation', () => {
    it('should reject segments below minimum tokens', () => {
      const config = createCacheConfig({
        segments: [
          { scope: 'developer-content', minTokens: 500 }, // Below Anthropic minimum of 1024
        ],
      });

      const result = validateCacheConfig(
        config,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Segment 0 minTokens (500) is below provider minimum (1024). Use force: true to override.'
      );
    });

    it('should allow force override for low token count', () => {
      const config = createCacheConfig({
        segments: [{ scope: 'developer-content', minTokens: 500, force: true }],
      });

      const result = validateCacheConfig(
        config,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('Scope security validation', () => {
    it('should reject user content in segments with restrictive default', () => {
      const config = createCacheConfig({
        defaultScope: 'developer-content',
        segments: [
          { scope: 'allow-user-content' }, // More permissive than default
        ],
      });

      const result = validateCacheConfig(
        config,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Cannot use allow-user-content scope in segments when defaultScope is more restrictive'
      );
    });

    it('should allow user content segments with permissive default', () => {
      const config = createCacheConfig({
        defaultScope: 'allow-user-content',
        segments: [
          { scope: 'allow-user-content' },
          { scope: 'developer-content' }, // More restrictive is OK
        ],
      });

      const result = validateCacheConfig(
        config,
        'anthropic',
        'claude-3-5-sonnet-20241022'
      );

      expect(result.valid).toBe(true);
    });
  });
});

describe('adaptToAnthropicCache', () => {
  it('should convert to Anthropic cache controls', () => {
    const config = createCacheConfig({
      maxBreakpoints: 3,
      segments: [
        { scope: 'developer-content', ttl: '5m' },
        { scope: 'system-only', ttl: '1h' },
      ],
    });

    const capabilities = getCacheCapabilities(
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );
    const anthropicConfig = adaptToAnthropicCache(config, capabilities);

    expect(anthropicConfig).toEqual({
      cacheControls: [
        { type: 'ephemeral', ttl: '5m' },
        { type: 'ephemeral', ttl: '1h' },
      ],
      maxBreakpoints: 3,
      collectMetrics: true,
    });
  });

  it('should limit breakpoints to Anthropic maximum', () => {
    const config = createCacheConfig({
      maxBreakpoints: 10, // Will be limited to 4
      segments: Array(6)
        .fill(null)
        .map(() => ({ scope: 'developer-content' as CacheScope })),
    });

    const capabilities = getCacheCapabilities(
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );
    const anthropicConfig = adaptToAnthropicCache(config, capabilities);

    expect(anthropicConfig.maxBreakpoints).toBe(4);
    expect(anthropicConfig.cacheControls).toHaveLength(4); // Only first 4 segments
  });

  it('should omit TTL when not supported', () => {
    const config = createCacheConfig({
      segments: [{ scope: 'developer-content', ttl: '5m' }],
    });

    // Mock capabilities without TTL support
    const capabilities = {
      ...getCacheCapabilities('anthropic', 'claude-3-5-sonnet-20241022'),
      supportsTtl: false,
    };
    const anthropicConfig = adaptToAnthropicCache(config, capabilities);

    expect(anthropicConfig.cacheControls[0]).toEqual({
      type: 'ephemeral',
      // No ttl field
    });
  });
});

describe('adaptToOpenAICache', () => {
  it('should convert to OpenAI auto-cache config', () => {
    const config = createCacheConfig({
      collectMetrics: false,
    });

    const capabilities = getCacheCapabilities('openai', 'gpt-4o');
    const openaiConfig = adaptToOpenAICache(config, capabilities);

    expect(openaiConfig).toEqual({
      enableAutoCaching: true,
      toolCaching: {
        enabled: true, // GPT-4o supports tool caching
      },
      collectMetrics: false,
    });
  });

  it('should disable tool caching for models that dont support it', () => {
    const config = createCacheConfig();

    const capabilities = getCacheCapabilities('openai', 'gpt-3.5-turbo');
    const openaiConfig = adaptToOpenAICache(config, capabilities);

    expect(openaiConfig.toolCaching.enabled).toBe(false);
  });
});

describe('Integration scenarios', () => {
  it('should create valid config for system prompts', () => {
    const config = createDeveloperCacheConfig({
      segments: [
        {
          scope: 'system-only',
          ttl: '24h',
          key: 'system-prompt-v1',
        },
      ],
    });

    const anthropicResult = validateCacheConfig(
      config,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );
    expect(anthropicResult.valid).toBe(true);

    const openaiResult = validateCacheConfig(config, 'openai', 'gpt-4o');
    expect(openaiResult.valid).toBe(false); // TTL not supported
  });

  it('should create valid config for user conversations', () => {
    const config = createUserContentCacheConfig({
      segments: [
        {
          scope: 'allow-user-content',
          ttl: '5m',
          key: 'user-conversation',
        },
      ],
    });

    const anthropicResult = validateCacheConfig(
      config,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );
    expect(anthropicResult.valid).toBe(true);

    const openaiResult = validateCacheConfig(config, 'openai', 'gpt-4o');
    expect(openaiResult.valid).toBe(false); // TTL not supported
  });

  it('should create valid cross-provider config', () => {
    const config = createCacheConfig({
      defaultScope: 'developer-content',
      defaultTtl: 'session', // Works with all providers
      maxBreakpoints: 1, // Safe minimum for all providers
      segments: [
        {
          scope: 'developer-content',
          ttl: 'session',
          minTokens: 2048, // Safe for all providers
        },
      ],
    });

    const anthropicResult = validateCacheConfig(
      config,
      'anthropic',
      'claude-3-5-sonnet-20241022'
    );
    expect(anthropicResult.valid).toBe(true);

    const openaiResult = validateCacheConfig(config, 'openai', 'gpt-4o');
    expect(openaiResult.valid).toBe(true);

    const googleResult = validateCacheConfig(config, 'google', 'gemini-pro');
    expect(googleResult.valid).toBe(true);
  });
});
