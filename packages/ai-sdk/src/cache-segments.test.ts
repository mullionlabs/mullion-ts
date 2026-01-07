import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCacheSegmentsAPI,
  type CacheSegmentsAPI,
  type CacheSegmentOptions,
} from './cache-segments.js';
import {
  createCacheConfig,
  createUserContentCacheConfig,
  createDeveloperCacheConfig,
} from './cache-config.js';
import type { CacheConfig } from './cache-config.js';

describe('Cache Segments API', () => {
  let api: CacheSegmentsAPI;
  let config: CacheConfig;

  // Helper to create content that meets token minimums (ensure >1024 tokens)
  const createLongContent = (baseText: string, multiplier = 300) => {
    return `${baseText} `.repeat(multiplier);
  };

  beforeEach(() => {
    config = createCacheConfig({
      defaultScope: 'developer-content',
      defaultTtl: '1h',
      maxBreakpoints: 3,
    });
    api = createCacheSegmentsAPI(
      'anthropic',
      'claude-3-5-sonnet-20241022',
      config
    );
  });

  describe('segment()', () => {
    it('should create a cache segment with default options', async () => {
      const content = createLongContent(
        'This is a test document with enough content to meet token minimums for caching purposes.'
      );
      const segment = await api.segment('test-doc', content);

      expect(segment).toMatchObject({
        key: 'test-doc',
        scope: 'developer-content',
        ttl: '1h',
        forced: false,
      });
      expect(segment.id).toMatch(/^test-doc-\d+$/);
      expect(segment.tokenCount).toBeGreaterThan(0);
      expect(segment.createdAt).toBeInstanceOf(Date);
    });

    it('should create segment with custom options', async () => {
      const content = 'Custom content for testing'.repeat(50);
      const options: CacheSegmentOptions = {
        scope: 'system-only',
        ttl: '5m',
        estimatedTokens: 2000,
      };

      const segment = await api.segment('custom-key', content, options);

      expect(segment).toMatchObject({
        key: 'custom-key',
        scope: 'system-only',
        ttl: '5m',
        tokenCount: 2000,
        forced: false,
      });
    });

    it('should reject user content scope with restrictive default', async () => {
      const content = 'User content'.repeat(50);

      await expect(
        api.segment('user-data', content, { scope: 'allow-user-content' })
      ).rejects.toThrow(
        'Cannot use allow-user-content scope when context defaultScope is more restrictive'
      );
    });

    it('should reject content below minimum tokens', async () => {
      const shortContent = 'Short'; // Well below 1024 token minimum

      await expect(api.segment('short-content', shortContent)).rejects.toThrow(
        'Content too short for caching'
      );
    });

    it('should allow forced caching below minimum tokens', async () => {
      const shortContent = 'Short content';

      const segment = await api.segment('forced-short', shortContent, {
        force: true,
        estimatedTokens: 100,
      });

      expect(segment.forced).toBe(true);
      expect(segment.tokenCount).toBe(100);
    });

    it('should reject when segment limit is reached', async () => {
      const content = createLongContent('Valid content for caching');

      // Create segments up to the limit
      await api.segment('segment-1', content);
      await api.segment('segment-2', content);
      await api.segment('segment-3', content);

      // Fourth segment should fail
      await expect(api.segment('segment-4', content)).rejects.toThrow(
        'Cannot create more cache segments'
      );
    });

    it('should reject TTL when provider does not support it', async () => {
      // Create API for OpenAI (no TTL support)
      const openaiAPI = createCacheSegmentsAPI('openai', 'gpt-4o', {
        ...config,
        defaultTtl: 'session',
      });

      const content = createLongContent('Content for OpenAI');

      await expect(
        openaiAPI.segment('openai-content', content, { ttl: '1h' })
      ).rejects.toThrow("Provider 'openai' does not support TTL");
    });

    it('should handle object content', async () => {
      const objectContent = {
        title: 'Test Document',
        content: createLongContent('Document content'),
        metadata: { type: 'test', version: 1 },
      };

      const segment = await api.segment('object-content', objectContent);

      expect(segment.key).toBe('object-content');
      expect(segment.tokenCount).toBeGreaterThan(0);
    });
  });

  describe('system()', () => {
    it('should create system prompt segment with defaults', async () => {
      const systemPrompt = createLongContent(
        'You are a helpful assistant specialized in data analysis.'
      );

      const segment = await api.system(systemPrompt);

      expect(segment).toMatchObject({
        scope: 'system-only',
        ttl: '24h', // Default for system prompts
        forced: false,
      });
      expect(segment.key).toMatch(/^system-prompt-\d+$/);
    });

    it('should create system prompt with custom key and options', async () => {
      const systemPrompt = createLongContent(
        'Custom system prompt for testing'
      );

      const segment = await api.system(systemPrompt, {
        key: 'data-analyst-v2',
        ttl: '1h',
        estimatedTokens: 1500,
      });

      expect(segment).toMatchObject({
        key: 'data-analyst-v2',
        scope: 'system-only',
        ttl: '1h',
        tokenCount: 1500,
      });
    });

    it('should always use system-only scope', async () => {
      const systemPrompt = createLongContent('System prompt');

      // Even if API has different default scope, system() should use system-only
      const userAPI = createCacheSegmentsAPI(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createUserContentCacheConfig()
      );

      const segment = await userAPI.system(systemPrompt);

      expect(segment.scope).toBe('system-only');
    });
  });

  describe('getMetadata()', () => {
    it('should return empty metadata initially', () => {
      const metadata = api.getMetadata();

      expect(metadata).toMatchObject({
        segments: [],
        config,
        totalEstimatedTokens: 0,
      });
      expect(metadata.capabilities).toBeDefined();
    });

    it('should track segments and total tokens', async () => {
      const content1 = createLongContent('First document');
      const content2 = createLongContent('Second document');

      await api.segment('doc-1', content1, { estimatedTokens: 1500 });
      await api.segment('doc-2', content2, { estimatedTokens: 2000 });

      const metadata = api.getMetadata();

      expect(metadata.segments).toHaveLength(2);
      expect(metadata.totalEstimatedTokens).toBe(3500);
      expect(metadata.segments[0].key).toBe('doc-1');
      expect(metadata.segments[1].key).toBe('doc-2');
    });

    it('should include provider metadata', async () => {
      const content = createLongContent('Test content');
      await api.segment('test', content, { estimatedTokens: 1500 });

      const metadata = api.getMetadata();
      const segment = metadata.segments[0];

      expect(segment.providerMetadata).toMatchObject({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      });
      expect(segment.providerMetadata?.capabilities).toBeDefined();
    });
  });

  describe('estimateTokens()', () => {
    it('should estimate tokens for string content', () => {
      const content =
        'This is a test string with about twenty words in it for token estimation purposes.';
      const tokens = api.estimateTokens(content);

      expect(tokens).toBeGreaterThan(15);
      expect(tokens).toBeLessThan(30);
    });

    it('should estimate tokens for object content', () => {
      const content = {
        title: 'Test',
        description: 'A test object for token estimation',
        tags: ['test', 'tokens', 'estimation'],
      };

      const tokens = api.estimateTokens(content);
      expect(tokens).toBeGreaterThan(10);
    });

    it('should handle empty content', () => {
      expect(api.estimateTokens('')).toBe(0);
      expect(api.estimateTokens({})).toBe(1); // JSON.stringify({}) = "{}"
    });
  });

  describe('shouldCache()', () => {
    it('should recommend caching for suitable content', () => {
      const content = createLongContent('This is suitable content for caching');

      const result = api.shouldCache(content);

      expect(result.shouldCache).toBe(true);
      expect(result.reason).toBe('Content suitable for caching');
      expect(result.meetsMinimum).toBe(true);
      expect(result.withinLimits).toBe(true);
      expect(result.estimatedTokens).toBeGreaterThan(1024);
    });

    it('should not recommend caching for short content', () => {
      const content = 'Too short';

      const result = api.shouldCache(content);

      expect(result.shouldCache).toBe(false);
      expect(result.reason).toContain('Content too short');
      expect(result.meetsMinimum).toBe(false);
      expect(result.estimatedTokens).toBeLessThan(1024);
    });

    it('should not recommend when segment limit reached', async () => {
      const content = createLongContent('Valid content');

      // Fill up to the limit
      await api.segment('seg-1', content);
      await api.segment('seg-2', content);
      await api.segment('seg-3', content);

      const result = api.shouldCache(content);

      expect(result.shouldCache).toBe(false);
      expect(result.reason).toContain('Segment limit reached');
      expect(result.withinLimits).toBe(false);
    });

    it('should check scope permissions', () => {
      const content = createLongContent('User content');

      const result = api.shouldCache(content, { scope: 'allow-user-content' });

      expect(result.shouldCache).toBe(false);
      expect(result.reason).toBe(
        'User content scope not allowed with current config'
      );
    });

    it('should check TTL support', () => {
      // Create OpenAI API (no TTL support)
      const openaiAPI = createCacheSegmentsAPI('openai', 'gpt-4o', {
        ...config,
        defaultTtl: 'session',
      });

      const content = createLongContent('Content for TTL test');

      const result = openaiAPI.shouldCache(content, { ttl: '1h' });

      expect(result.shouldCache).toBe(false);
      expect(result.reason).toBe("Provider 'openai' does not support TTL");
    });

    it('should allow forced caching', () => {
      const content = 'Short content';

      const result = api.shouldCache(content, { force: true });

      expect(result.shouldCache).toBe(true);
      expect(result.meetsMinimum).toBe(true); // Force overrides minimum
    });
  });

  describe('Provider-specific behavior', () => {
    it('should handle Anthropic-specific constraints', () => {
      const anthropicAPI = createCacheSegmentsAPI(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDeveloperCacheConfig()
      );

      const metadata = anthropicAPI.getMetadata();

      expect(metadata.capabilities).toMatchObject({
        minTokens: 1024,
        maxBreakpoints: 4,
        supportsTtl: true,
        supportsToolCaching: false,
      });
    });

    it('should handle OpenAI-specific constraints', () => {
      const openaiConfig = createCacheConfig({
        defaultTtl: 'session', // OpenAI requires session TTL
        maxBreakpoints: 10,
      });

      const openaiAPI = createCacheSegmentsAPI(
        'openai',
        'gpt-4o',
        openaiConfig
      );

      const metadata = openaiAPI.getMetadata();

      expect(metadata.capabilities).toMatchObject({
        minTokens: 1024,
        maxBreakpoints: Infinity,
        supportsTtl: false,
        supportsToolCaching: true,
      });
    });

    it('should handle unknown providers with conservative defaults', () => {
      const unknownConfig = createCacheConfig({
        defaultTtl: 'session',
        maxBreakpoints: 1,
      });

      const unknownAPI = createCacheSegmentsAPI(
        'other',
        'unknown-model',
        unknownConfig
      );

      const metadata = unknownAPI.getMetadata();

      expect(metadata.capabilities).toMatchObject({
        minTokens: 2048,
        maxBreakpoints: 1,
        supportsTtl: false,
        supportsToolCaching: false,
      });
    });
  });

  describe('Error handling', () => {
    it('should throw on invalid configuration', () => {
      const invalidConfig = createCacheConfig({
        maxBreakpoints: 10, // Exceeds Anthropic limit of 4
      });

      expect(() =>
        createCacheSegmentsAPI(
          'anthropic',
          'claude-3-5-sonnet-20241022',
          invalidConfig
        )
      ).toThrow('Invalid cache configuration');
    });

    it('should handle provider capability mismatches', () => {
      const incompatibleConfig = createCacheConfig({
        defaultTtl: '1h', // OpenAI doesn't support TTL
      });

      expect(() =>
        createCacheSegmentsAPI('openai', 'gpt-4o', incompatibleConfig)
      ).toThrow("Provider 'openai' does not support TTL");
    });
  });

  describe('Integration scenarios', () => {
    it('should support typical system prompt caching workflow', async () => {
      const systemPrompt = createLongContent(`
        You are an AI assistant specialized in data analysis.
        You have access to the following capabilities:
        - Statistical analysis
        - Data visualization recommendations
        - Trend identification
        Always provide detailed explanations and cite your reasoning.
      `);

      // Cache system prompt
      const systemSegment = await api.system(systemPrompt, {
        key: 'data-analyst-system-v1',
      });

      expect(systemSegment.scope).toBe('system-only');
      expect(systemSegment.ttl).toBe('24h');

      // Check metadata
      const metadata = api.getMetadata();
      expect(metadata.segments).toHaveLength(1);
      expect(metadata.segments[0].key).toBe('data-analyst-system-v1');
    });

    it('should support multi-segment document caching', async () => {
      const doc1 = createLongContent(
        'First document section with analysis context'
      );
      const doc2 = createLongContent(
        'Second document section with background info'
      );
      const doc3 = createLongContent('Third document section with conclusions');

      // Cache multiple document sections
      await api.segment('doc-section-1', doc1, { scope: 'developer-content' });
      await api.segment('doc-section-2', doc2, { scope: 'developer-content' });
      await api.segment('doc-section-3', doc3, { scope: 'developer-content' });

      const metadata = api.getMetadata();
      expect(metadata.segments).toHaveLength(3);
      expect(metadata.totalEstimatedTokens).toBeGreaterThan(1024);

      // All segments should be developer content
      metadata.segments.forEach((segment) => {
        expect(segment.scope).toBe('developer-content');
      });
    });

    it('should handle mixed TTL scenarios', async () => {
      // System prompt with long TTL
      const systemPrompt = createLongContent('System prompt for analysis');
      await api.system(systemPrompt, { key: 'system-v1' });

      // Short-lived user context
      const userContext = createLongContent('User context information');
      await api.segment('user-context', userContext, {
        ttl: '5m',
        scope: 'developer-content',
      });

      const metadata = api.getMetadata();
      expect(metadata.segments[0].ttl).toBe('24h'); // System prompt
      expect(metadata.segments[1].ttl).toBe('5m'); // User context
    });
  });
});
