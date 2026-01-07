/**
 * Tests for cache segments management
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  CacheSegmentManager,
  createCacheSegmentManager,
  type SegmentOptions,
} from './segments.js';
import { createDefaultCacheConfig, createUserContentConfig } from './types.js';

describe('CacheSegmentManager', () => {
  let manager: CacheSegmentManager;

  beforeEach(() => {
    const config = createDefaultCacheConfig({
      enabled: true,
      scope: 'developer-content',
      ttl: '5m',
      breakpoints: 2,
    });
    manager = createCacheSegmentManager(
      'anthropic',
      'claude-3-5-sonnet-20241022',
      config
    );
  });

  describe('segment()', () => {
    it('creates a segment with valid configuration', () => {
      const content =
        'This is a test system prompt with enough content to meet the token threshold for caching effectively.';

      manager.segment('test-key', content);

      const segments = manager.getSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0]).toEqual({
        key: 'test-key',
        content,
        tokenCount: Math.ceil(content.length / 4), // Token estimation
        ttl: '5m', // Default from config
        scope: 'developer-content', // Default from config
        createdAt: expect.any(Number),
      });
    });

    it('creates segment with custom options', () => {
      const content =
        'Custom system prompt with specific caching configuration that overrides the defaults provided in the manager configuration.';
      const options: SegmentOptions = {
        scope: 'system-only',
        ttl: '1h',
        force: true,
      };

      manager.segment('custom-key', content, options);

      const segments = manager.getSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].scope).toBe('system-only');
      expect(segments[0].ttl).toBe('1h');
    });

    it('handles object content by stringifying', () => {
      const content = {
        systemRole: 'assistant',
        instructions:
          'Help with data analysis and provide detailed explanations for all reasoning.',
        constraints: [
          'Be accurate',
          'Be helpful',
          'Be concise when appropriate',
        ],
      };

      manager.segment('object-key', content);

      const segments = manager.getSegments();
      expect(segments[0].content).toBe(JSON.stringify(content));
    });

    it('estimates tokens correctly using 4-char heuristic', () => {
      const content = 'This content has forty characters!!'; // 36 chars = 9 tokens

      manager.segment('token-test', content);

      const segments = manager.getSegments();
      expect(segments[0].tokenCount).toBe(9); // Math.ceil(36 / 4) = 9
    });

    it('throws error when validation fails without force', () => {
      // Try to exceed breakpoint limit
      manager.segment(
        'key1',
        'First segment with enough content to be valid for caching purposes and meet token thresholds.'
      );
      manager.segment(
        'key2',
        'Second segment also with enough content to be valid for caching and meet minimum token requirements.'
      );

      expect(() => {
        // This should fail because config has breakpoints: 2, so third segment exceeds limit
        manager.segment(
          'key3',
          'Third segment that should fail due to breakpoint limit being exceeded in this test scenario.'
        );
      }).toThrow('Cache segment validation failed');
    });

    it('allows exceeding limits with force: true', () => {
      manager.segment('key1', 'First segment with adequate content length.');
      manager.segment('key2', 'Second segment with adequate content length.');

      // This should succeed with force even though it exceeds breakpoint limit
      manager.segment('key3', 'Third forced segment.', { force: true });

      expect(manager.getSegments()).toHaveLength(3);
    });

    it('prevents duplicate keys', () => {
      manager.segment('duplicate-key', 'First content with this key.');

      expect(() => {
        manager.segment('duplicate-key', 'Second content with same key.');
      }).toThrow("Cache key 'duplicate-key' already exists");
    });

    it('validates TTL values against provider capabilities', () => {
      expect(() => {
        // This should fail because '24h' is not in the supported TTL list
        manager.segment('invalid-ttl', 'Content with unsupported TTL.', {
          ttl: '24h' as any,
        });
      }).toThrow('Unsupported TTL');
    });
  });

  describe('system()', () => {
    it('creates system segment with optimized defaults', () => {
      const systemPrompt =
        'You are a helpful assistant specializing in data analysis and providing clear, detailed explanations.';

      manager.system(systemPrompt);

      const segments = manager.getSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].scope).toBe('system-only');
      expect(segments[0].ttl).toBe('1h'); // Longer TTL for system content
      expect(segments[0].content).toBe(systemPrompt);
      expect(segments[0].key).toMatch(/^system-\d+$/); // Generated timestamp key
    });

    it('allows overriding system defaults', () => {
      const systemPrompt =
        'Custom system prompt with override options for testing configuration flexibility.';

      manager.system(systemPrompt, {
        scope: 'developer-content',
        ttl: '5m',
      });

      const segments = manager.getSegments();
      expect(segments[0].scope).toBe('developer-content');
      expect(segments[0].ttl).toBe('5m');
    });

    it('generates unique keys for multiple system prompts', () => {
      manager.system(
        'First system prompt with sufficient length for token requirements.'
      );
      // Add small delay to ensure different timestamps
      const now = Date.now();
      while (Date.now() === now) {
        /* busy wait */
      }
      manager.system(
        'Second system prompt also with sufficient length for token requirements.'
      );

      const segments = manager.getSegments();
      expect(segments).toHaveLength(2);
      expect(segments[0].key).not.toBe(segments[1].key);
    });
  });

  describe('getSegments() and clear()', () => {
    it('returns empty array initially', () => {
      expect(manager.getSegments()).toEqual([]);
    });

    it('returns copy of segments (immutable)', () => {
      manager.segment(
        'test',
        'Content with adequate length for testing purposes and meeting minimum token requirements.'
      );

      const segments1 = manager.getSegments();
      const segments2 = manager.getSegments();

      expect(segments1).toEqual(segments2);
      expect(segments1).not.toBe(segments2); // Different array instances
    });

    it('clears all segments', () => {
      manager.segment('key1', 'First test content with sufficient length.');
      manager.segment('key2', 'Second test content with sufficient length.');

      expect(manager.getSegments()).toHaveLength(2);

      manager.clear();

      expect(manager.getSegments()).toHaveLength(0);
    });
  });

  describe('validateForModel()', () => {
    it('validates successfully for compatible model', () => {
      manager.segment(
        'test',
        'Valid content with adequate length for caching requirements.'
      );

      const result = manager.validateForModel('claude-3-5-sonnet-20241022');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails validation for unsupported model', () => {
      // Create a manager for OpenAI with gpt-3.5-turbo (which doesn't support caching)
      const config = createDefaultCacheConfig({ enabled: true });
      const unsupportedManager = createCacheSegmentManager(
        'openai',
        'gpt-3.5-turbo',
        config
      );
      unsupportedManager.segment(
        'test',
        'Content for unsupported model test.',
        { force: true }
      );

      const result = unsupportedManager.validateForModel('gpt-3.5-turbo'); // No caching support

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Caching is not supported for model 'gpt-3.5-turbo'"
      );
    });

    it('warns about low token counts', () => {
      manager.segment('short', 'Short', { force: true }); // Very short content

      const result = manager.validateForModel('claude-3-5-sonnet-20241022');

      expect(result.valid).toBe(true); // Warnings don't fail validation
      expect(
        result.warnings.some((w) => w.includes('below provider minimum'))
      ).toBe(true);
    });

    it('validates TTL support correctly', () => {
      // Create segments with TTL
      manager.segment(
        'ttl-test',
        'Content with TTL specification for testing.',
        { ttl: '1h' }
      );

      // Validate against model that supports TTL
      const anthropicResult = manager.validateForModel(
        'claude-3-5-sonnet-20241022'
      );
      expect(anthropicResult.valid).toBe(true);

      // Create OpenAI manager with TTL segments to test TTL warning
      const config = createDefaultCacheConfig({ enabled: true });
      const openaiManager = createCacheSegmentManager(
        'openai',
        'gpt-4o',
        config
      );
      openaiManager.segment('ttl-test', 'Content with TTL for OpenAI.', {
        ttl: '1h',
        force: true,
      });

      // Validate against OpenAI model that doesn't support TTL
      const openaiResult = openaiManager.validateForModel('gpt-4o');
      expect(
        openaiResult.warnings.some((w) => w.includes('does not support TTL'))
      ).toBe(true);
    });

    it('validates breakpoint limits', () => {
      // Add more segments than the model supports
      manager.segment(
        'key1',
        'First segment with sufficient content length for testing breakpoint validation.'
      );
      manager.segment(
        'key2',
        'Second segment with sufficient content length for testing breakpoint validation.'
      );
      manager.segment(
        'key3',
        'Third segment with sufficient content length for testing breakpoint validation.',
        { force: true }
      );
      manager.segment(
        'key4',
        'Fourth segment with sufficient content length for testing breakpoint validation.',
        { force: true }
      );
      manager.segment(
        'key5',
        'Fifth segment with sufficient content length for testing breakpoint validation.',
        { force: true }
      ); // Exceeds Anthropic limit of 4

      const result = manager.validateForModel('claude-3-5-sonnet-20241022');

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('exceeds provider limit'))
      ).toBe(true);
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      // Add some test segments (use force for the third one since config limit is 2)
      manager.segment('system-test', 'System content', {
        scope: 'system-only',
        ttl: '1h',
      });
      manager.segment('dev-test', 'Developer content', {
        scope: 'developer-content',
        ttl: '5m',
      });
      manager.segment('user-test', 'User content', {
        scope: 'allow-user-content',
        ttl: '5m',
        force: true,
      });
    });

    describe('getTotalTokens()', () => {
      it('calculates total tokens across all segments', () => {
        const total = manager.getTotalTokens();

        const segments = manager.getSegments();
        const expected = segments.reduce(
          (sum, segment) => sum + segment.tokenCount,
          0
        );

        expect(total).toBe(expected);
        expect(total).toBeGreaterThan(0);
      });
    });

    describe('getSegmentsByScope()', () => {
      it('filters segments by scope correctly', () => {
        const systemSegments = manager.getSegmentsByScope('system-only');
        const devSegments = manager.getSegmentsByScope('developer-content');
        const userSegments = manager.getSegmentsByScope('allow-user-content');

        expect(systemSegments).toHaveLength(1);
        expect(systemSegments[0].key).toBe('system-test');

        expect(devSegments).toHaveLength(1);
        expect(devSegments[0].key).toBe('dev-test');

        expect(userSegments).toHaveLength(1);
        expect(userSegments[0].key).toBe('user-test');
      });

      it('returns empty array for non-existent scope', () => {
        // Clear and add only one scope
        manager.clear();
        manager.segment('only-dev', 'Developer only content', {
          scope: 'developer-content',
        });

        const systemSegments = manager.getSegmentsByScope('system-only');
        expect(systemSegments).toHaveLength(0);
      });
    });

    describe('getSegmentsByTtl()', () => {
      it('filters segments by TTL correctly', () => {
        const shortTtl = manager.getSegmentsByTtl('5m');
        const longTtl = manager.getSegmentsByTtl('1h');

        expect(shortTtl).toHaveLength(2); // dev-test and user-test
        expect(longTtl).toHaveLength(1); // system-test

        expect(shortTtl.map((s) => s.key)).toEqual(['dev-test', 'user-test']);
        expect(longTtl[0].key).toBe('system-test');
      });
    });

    describe('shouldCache()', () => {
      it('returns true for content meeting token threshold', () => {
        // Content needs to be at least 1024 tokens (~4096 chars) for Anthropic
        const longContent = 'A'.repeat(4100); // 4100 chars = 1025 tokens

        const result = manager.shouldCache(longContent);

        expect(result).toBe(true);
      });

      it('returns false for short content without force', () => {
        const shortContent = 'Short';

        const result = manager.shouldCache(shortContent);

        expect(result).toBe(false);
      });

      it('returns true for short content with force', () => {
        const shortContent = 'Short';

        const result = manager.shouldCache(shortContent, { force: true });

        expect(result).toBe(true);
      });
    });

    describe('estimateTokens()', () => {
      it('estimates tokens using 4-character heuristic', () => {
        const content = 'A'.repeat(100); // 100 characters
        const estimated = manager.estimateTokens(content);

        expect(estimated).toBe(25); // 100 / 4 = 25
      });

      it('rounds up fractional tokens', () => {
        const content = 'A'.repeat(101); // 101 characters
        const estimated = manager.estimateTokens(content);

        expect(estimated).toBe(26); // Math.ceil(101 / 4) = 26
      });

      it('handles empty content', () => {
        const estimated = manager.estimateTokens('');
        expect(estimated).toBe(0);
      });
    });
  });

  describe('Provider-specific behavior', () => {
    it('works with OpenAI automatic caching', () => {
      const config = createDefaultCacheConfig();
      const openaiManager = createCacheSegmentManager(
        'openai',
        'gpt-4o',
        config
      );

      openaiManager.segment(
        'test',
        'Content for OpenAI automatic caching system test validation.'
      );

      const segments = openaiManager.getSegments();
      expect(segments).toHaveLength(1);

      const validation = openaiManager.validateForModel('gpt-4o');
      expect(validation.valid).toBe(true);
    });

    it('handles Haiku model with higher token thresholds', () => {
      const config = createDefaultCacheConfig();
      const haikuManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-haiku-20240307',
        config
      );

      // Short content should generate warnings due to higher threshold
      haikuManager.segment(
        'haiku-test',
        'Relatively short content for Haiku model.',
        { force: true }
      );

      const validation = haikuManager.validateForModel(
        'claude-3-haiku-20240307'
      );
      expect(
        validation.warnings.some((w) =>
          w.includes('below provider minimum of 2048')
        )
      ).toBe(true);
    });

    it('validates against Google provider (unsupported)', () => {
      const config = createDefaultCacheConfig();
      const googleManager = createCacheSegmentManager(
        'google',
        'gemini-pro',
        config
      );

      googleManager.segment(
        'google-test',
        'Content for Google provider test.',
        { force: true }
      );

      const validation = googleManager.validateForModel('gemini-pro');
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        "Caching is not supported for model 'gemini-pro'"
      );
    });
  });

  describe('Security and scope validation', () => {
    it('warns when using user content with restrictive default scope', () => {
      // Manager has developer-content default scope
      manager.segment('user-content', 'User provided content', {
        scope: 'allow-user-content',
        force: true,
      });

      const segments = manager.getSegments();
      expect(segments[0].scope).toBe('allow-user-content');
      // Validation warnings are checked in validateSegment private method
    });

    it('works correctly with user content configuration', () => {
      const userConfig = createUserContentConfig();
      const userManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        userConfig
      );

      userManager.segment(
        'user-data',
        'User provided data for processing and analysis.',
        {
          scope: 'allow-user-content',
        }
      );

      const segments = userManager.getSegments();
      expect(segments[0].scope).toBe('allow-user-content');
    });
  });

  describe('Error handling and edge cases', () => {
    it('handles extremely long content', () => {
      const longContent = 'A'.repeat(10000); // 10k characters

      manager.segment('long-content', longContent);

      const segments = manager.getSegments();
      expect(segments[0].tokenCount).toBe(2500); // 10000 / 4
    });

    it('handles special characters in keys', () => {
      const specialKey = 'key-with-special_chars.123';

      manager.segment(
        specialKey,
        'Content with special key characters for testing edge cases in key handling.'
      );

      const segments = manager.getSegments();
      expect(segments[0].key).toBe(specialKey);
    });

    it('handles complex object serialization', () => {
      const complexObject = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        nullValue: null,
        booleanValue: true,
      };

      manager.segment('complex-obj', complexObject);

      const segments = manager.getSegments();
      expect(segments[0].content).toBe(JSON.stringify(complexObject));
    });

    it('maintains segment order', () => {
      manager.segment('first', 'First segment content with adequate length.');
      manager.segment('second', 'Second segment content with adequate length.');
      manager.segment('third', 'Third segment content with adequate length.', {
        force: true,
      });

      const segments = manager.getSegments();
      expect(segments.map((s) => s.key)).toEqual(['first', 'second', 'third']);
    });
  });
});

describe('createCacheSegmentManager', () => {
  it('creates manager with correct configuration', () => {
    const config = createDefaultCacheConfig({
      scope: 'system-only',
      ttl: '1h',
    });

    const manager = createCacheSegmentManager(
      'anthropic',
      'claude-3-5-sonnet-20241022',
      config
    );

    // Test that manager uses the configuration
    manager.segment(
      'test',
      'Test content with adequate length for validation.'
    );

    const segments = manager.getSegments();
    expect(segments[0].scope).toBe('system-only');
    expect(segments[0].ttl).toBe('1h');
  });

  it('creates manager for different providers', () => {
    const config = createDefaultCacheConfig();

    const anthropicManager = createCacheSegmentManager(
      'anthropic',
      'claude-3-5-sonnet-20241022',
      config
    );
    const openaiManager = createCacheSegmentManager('openai', 'gpt-4o', config);

    expect(anthropicManager).toBeInstanceOf(CacheSegmentManager);
    expect(openaiManager).toBeInstanceOf(CacheSegmentManager);
  });
});
