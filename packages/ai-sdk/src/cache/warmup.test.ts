import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LanguageModel } from 'ai';
import { createOwned } from '@mullion/core';
import type { Context } from '@mullion/core';

import {
  explicitWarmup,
  firstBranchWarmup,
  createWarmupExecutor,
  estimateWarmupCost,
  shouldWarmup,
} from './warmup.js';
import type { WarmupConfig } from './warmup.js';
import { createCacheSegmentManager } from './segments.js';
import { createDefaultCacheConfig } from './types.js';

// Mock the generateText function from 'ai'
vi.mock('ai', async () => {
  const actual = (await vi.importActual('ai')) as Record<string, unknown>;
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

import { generateText } from 'ai';

const mockGenerateText = vi.mocked(generateText);

describe('warmup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('explicitWarmup', () => {
    it('should make a minimal API call for warmup', async () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        languageModel: mockModel,
      };

      mockGenerateText.mockResolvedValueOnce({
        text: 'ready',
        finishReason: 'stop',
        usage: { inputTokens: 100, outputTokens: 5 },
        response: {} as never,
        request: {} as never,
        warnings: undefined,
        providerMetadata: {
          anthropic: {
            cache_creation_input_tokens: 5000,
          },
        },
      } as never);

      const result = await explicitWarmup(config);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockModel,
          prompt: expect.stringContaining('ready'),
          maxOutputTokens: 10,
        })
      );

      expect(result.tokenCost).toBe(105);
      expect(result.cacheCreatedTokens).toBe(5000);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should return zero metrics for unsupported provider', async () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'other',
        model: 'some-model',
        languageModel: mockModel,
      };

      const result = await explicitWarmup(config);

      expect(mockGenerateText).not.toHaveBeenCalled();
      expect(result.tokenCost).toBe(0);
      expect(result.cacheCreatedTokens).toBe(0);
    });

    it('should include system prompt if provided', async () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        languageModel: mockModel,
        systemPrompt: 'You are a helpful assistant.',
      };

      mockGenerateText.mockResolvedValueOnce({
        text: 'ready',
        finishReason: 'stop',
        usage: { inputTokens: 150, outputTokens: 5 },
        response: {} as never,
        request: {} as never,
        warnings: undefined,
        providerMetadata: {},
      } as never);

      await explicitWarmup(config);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant.',
        })
      );
    });

    it('should use custom warmup prompt if provided', async () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        languageModel: mockModel,
        warmupPrompt: 'Say OK',
      };

      mockGenerateText.mockResolvedValueOnce({
        text: 'OK',
        finishReason: 'stop',
        usage: { inputTokens: 50, outputTokens: 2 },
        response: {} as never,
        request: {} as never,
        warnings: undefined,
        providerMetadata: {},
      } as never);

      await explicitWarmup(config);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Say OK',
        })
      );
    });

    it('should include cache control for segments with Anthropic', async () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        languageModel: mockModel,
      };

      const cacheManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDefaultCacheConfig({ enabled: true })
      );

      // Add a segment
      cacheManager.segment('doc', 'A'.repeat(5000), { force: true });

      mockGenerateText.mockResolvedValueOnce({
        text: 'ready',
        finishReason: 'stop',
        usage: { inputTokens: 100, outputTokens: 5 },
        response: {} as never,
        request: {} as never,
        warnings: undefined,
        providerMetadata: {},
      } as never);

      await explicitWarmup(config, cacheManager);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          providerOptions: {
            anthropic: {
              cacheControl: [{ type: 'ephemeral' }],
            },
          },
        })
      );
    });
  });

  describe('firstBranchWarmup', () => {
    it('should execute first branch and return result', async () => {
      const mockCtx: Context<'test'> = {
        scope: 'test',
        infer: vi.fn(),
        bridge: vi.fn(),
        use: vi.fn(),
      };

      const firstBranch = vi.fn().mockResolvedValue(
        createOwned({
          value: { data: 'result' },
          scope: 'test' as const,
          confidence: 0.9,
        })
      );

      const { firstResult, warmup } = await firstBranchWarmup(
        firstBranch,
        mockCtx
      );

      expect(firstBranch).toHaveBeenCalledWith(mockCtx);
      expect(firstResult.value).toEqual({ data: 'result' });
      expect(warmup.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should measure duration correctly', async () => {
      const mockCtx: Context<'test'> = {
        scope: 'test',
        infer: vi.fn(),
        bridge: vi.fn(),
        use: vi.fn(),
      };

      const firstBranch = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return createOwned({
          value: { data: 'delayed' },
          scope: 'test' as const,
        });
      });

      const { warmup } = await firstBranchWarmup(firstBranch, mockCtx);

      expect(warmup.durationMs).toBeGreaterThanOrEqual(45);
    });
  });

  describe('createWarmupExecutor', () => {
    it('should create executor that supports cache optimization for Anthropic', () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        languageModel: mockModel,
      };

      const executor = createWarmupExecutor(config);

      expect(executor.supportsCacheOptimization).toBe(true);
    });

    it('should create executor that does not support cache optimization for OpenAI', () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        languageModel: mockModel,
      };

      const executor = createWarmupExecutor(config);

      // OpenAI has automatic caching, so explicit warmup not needed
      expect(executor.supportsCacheOptimization).toBe(false);
    });

    it('should create executor that calls explicitWarmup', async () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        languageModel: mockModel,
      };

      mockGenerateText.mockResolvedValueOnce({
        text: 'ready',
        finishReason: 'stop',
        usage: { inputTokens: 100, outputTokens: 5 },
        response: {} as never,
        request: {} as never,
        warnings: undefined,
        providerMetadata: {},
      } as never);

      const executor = createWarmupExecutor(config);

      const mockCtx: Context<'test'> = {
        scope: 'test',
        infer: vi.fn(),
        bridge: vi.fn(),
        use: vi.fn(),
      };

      const result = await executor.explicitWarmup(mockCtx);

      expect(mockGenerateText).toHaveBeenCalled();
      expect(result.tokenCost).toBe(105);
    });
  });

  describe('estimateWarmupCost', () => {
    it('should estimate cost based on cache segments', () => {
      const cacheManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDefaultCacheConfig({ enabled: true })
      );

      // Add a segment with 1000 characters (~250 tokens)
      cacheManager.segment('doc', 'A'.repeat(1000), { force: true });

      const estimate = estimateWarmupCost(cacheManager);

      // Should include segment tokens + default warmup prompt + output
      expect(estimate).toBeGreaterThan(250);
    });

    it('should include system prompt in estimate', () => {
      const cacheManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDefaultCacheConfig({ enabled: true })
      );

      const withoutSystem = estimateWarmupCost(cacheManager);
      const withSystem = estimateWarmupCost(
        cacheManager,
        'You are a helpful assistant that answers questions about documents.'
      );

      expect(withSystem).toBeGreaterThan(withoutSystem);
    });

    it('should return minimal cost for no segments', () => {
      const estimate = estimateWarmupCost();

      // Just warmup prompt + output tokens
      expect(estimate).toBeLessThan(50);
    });
  });

  describe('shouldWarmup', () => {
    it('should return true for Anthropic with segments and multiple branches', () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        languageModel: mockModel,
      };

      const cacheManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDefaultCacheConfig({ enabled: true })
      );

      // Add segment that meets minimum threshold (1024 tokens = ~4096 chars)
      cacheManager.segment('doc', 'A'.repeat(5000), { force: true });

      const result = shouldWarmup(config, cacheManager, 3);

      expect(result).toBe(true);
    });

    it('should return false for OpenAI (automatic caching)', () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        languageModel: mockModel,
      };

      const cacheManager = createCacheSegmentManager(
        'openai',
        'gpt-4o',
        createDefaultCacheConfig({ enabled: true })
      );

      cacheManager.segment('doc', 'A'.repeat(5000), { force: true });

      const result = shouldWarmup(config, cacheManager, 3);

      expect(result).toBe(false);
    });

    it('should return false for single branch', () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        languageModel: mockModel,
      };

      const cacheManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDefaultCacheConfig({ enabled: true })
      );

      cacheManager.segment('doc', 'A'.repeat(5000), { force: true });

      const result = shouldWarmup(config, cacheManager, 1);

      expect(result).toBe(false);
    });

    it('should return false for no segments', () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        languageModel: mockModel,
      };

      const cacheManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDefaultCacheConfig({ enabled: true })
      );

      const result = shouldWarmup(config, cacheManager, 3);

      expect(result).toBe(false);
    });

    it('should return false for unsupported provider', () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'other',
        model: 'some-model',
        languageModel: mockModel,
      };

      const result = shouldWarmup(config, undefined, 3);

      expect(result).toBe(false);
    });

    it('should return false when segments below minimum tokens', () => {
      const mockModel = {} as LanguageModel;
      const config: WarmupConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        languageModel: mockModel,
      };

      const cacheManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDefaultCacheConfig({ enabled: true })
      );

      // Small segment that doesn't meet 1024 token minimum
      cacheManager.segment('doc', 'Hello world', { force: true });

      const result = shouldWarmup(config, cacheManager, 3);

      expect(result).toBe(false);
    });
  });
});
