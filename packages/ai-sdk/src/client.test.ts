import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createMullionClient,
  extractConfidenceFromFinishReason,
} from './client.js';
import type { LanguageModel, FinishReason } from 'ai';

// Mock the generateObject function from 'ai'
vi.mock('ai', async () => {
  const actual = (await vi.importActual('ai')) as Record<string, unknown>;
  return {
    ...actual,
    generateObject: vi.fn(),
  };
});

import { generateObject } from 'ai';

const mockGenerateObject = vi.mocked(generateObject);

describe('createMullionClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a client with scope method', () => {
    const mockModel = {} as LanguageModel;
    const client = createMullionClient(mockModel);

    expect(client).toBeDefined();
    expect(typeof client.scope).toBe('function');
  });

  it('should execute scoped function with context', async () => {
    const mockModel = {} as LanguageModel;
    const client = createMullionClient(mockModel);

    const result = await client.scope('test-scope', async (ctx) => {
      expect(ctx.scope).toBe('test-scope');
      return 'success';
    });

    expect(result).toBe('success');
  });

  it('should call generateObject when ctx.infer is used', async () => {
    const mockModel = {} as LanguageModel;
    const client = createMullionClient(mockModel);

    const TestSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    mockGenerateObject.mockResolvedValueOnce({
      object: { name: 'Alice', age: 30 },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      warnings: undefined,
      request: {} as never,
      response: {} as never,
      rawResponse: {} as never,
    });

    const result = await client.scope('user-processing', async (ctx) => {
      const data = await ctx.infer(TestSchema, 'Extract user info');
      return data;
    });

    expect(mockGenerateObject).toHaveBeenCalledWith({
      model: mockModel,
      schema: TestSchema,
      prompt: 'Extract user info',
      temperature: undefined,
      maxTokens: undefined,
      system: undefined,
    });

    expect(result.value).toEqual({ name: 'Alice', age: 30 });
    expect(result.__scope).toBe('user-processing');
    expect(result.confidence).toBe(1.0);
    expect(result.traceId).toBeDefined();
  });

  it('should pass inference options to generateObject', async () => {
    const mockModel = {} as LanguageModel;
    const client = createMullionClient(mockModel);

    const TestSchema = z.object({
      category: z.string(),
    });

    mockGenerateObject.mockResolvedValueOnce({
      object: { category: 'support' },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      warnings: undefined,
      request: {} as never,
      response: {} as never,
      rawResponse: {} as never,
    });

    await client.scope('classification', async (ctx) => {
      await ctx.infer(TestSchema, 'Classify this', {
        temperature: 0.7,
        maxTokens: 100,
        systemPrompt: 'You are a classifier',
      });
    });

    expect(mockGenerateObject).toHaveBeenCalledWith({
      model: mockModel,
      schema: TestSchema,
      prompt: 'Classify this',
      temperature: 0.7,
      maxTokens: 100,
      system: 'You are a classifier',
    });
  });

  it('should bridge values between scopes', async () => {
    const mockModel = {} as LanguageModel;
    const client = createMullionClient(mockModel);

    const TestSchema = z.object({ data: z.string() });

    mockGenerateObject.mockResolvedValue({
      object: { data: 'test' },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      warnings: undefined,
      request: {} as never,
      response: {} as never,
      rawResponse: {} as never,
    });

    const result = await client.scope('source', async (sourceCtx) => {
      const sourceData = await sourceCtx.infer(TestSchema, 'Get data');

      return await client.scope('target', async (targetCtx) => {
        const bridged = targetCtx.bridge(sourceData);

        expect(bridged.value).toEqual({ data: 'test' });
        expect(bridged.__scope).toBe('target');
        expect(bridged.traceId).toBe(sourceData.traceId);

        return bridged;
      });
    });

    expect(result.value).toEqual({ data: 'test' });
  });

  it('should throw error when using value from wrong scope', async () => {
    const mockModel = {} as LanguageModel;
    const client = createMullionClient(mockModel);

    const TestSchema = z.object({ data: z.string() });

    mockGenerateObject.mockResolvedValue({
      object: { data: 'test' },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      warnings: undefined,
      request: {} as never,
      response: {} as never,
      rawResponse: {} as never,
    });

    await expect(async () => {
      await client.scope('scope1', async (ctx1) => {
        const data1 = await ctx1.infer(TestSchema, 'Get data');

        await client.scope('scope2', async (ctx2) => {
          // This should throw because data1 is from scope1, not scope2
          ctx2.use(data1 as never);
        });
      });
    }).rejects.toThrow(/Scope mismatch/);
  });

  it('should allow using value in correct scope', async () => {
    const mockModel = {} as LanguageModel;
    const client = createMullionClient(mockModel);

    const TestSchema = z.object({ data: z.string() });

    mockGenerateObject.mockResolvedValue({
      object: { data: 'test' },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      warnings: undefined,
      request: {} as never,
      response: {} as never,
      rawResponse: {} as never,
    });

    const result = await client.scope('my-scope', async (ctx) => {
      const data = await ctx.infer(TestSchema, 'Get data');
      const unwrapped = ctx.use(data);

      expect(unwrapped).toEqual({ data: 'test' });
      return unwrapped;
    });

    expect(result).toEqual({ data: 'test' });
  });

  describe('confidence extraction', () => {
    it('should extract confidence 1.0 for finishReason "stop"', async () => {
      const mockModel = {} as LanguageModel;
      const client = createMullionClient(mockModel);

      const TestSchema = z.object({ data: z.string() });

      mockGenerateObject.mockResolvedValueOnce({
        object: { data: 'test' },
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        warnings: undefined,
        request: {} as never,
        response: {} as never,
        rawResponse: {} as never,
      });

      const result = await client.scope('test', async (ctx) => {
        return await ctx.infer(TestSchema, 'input');
      });

      expect(result.confidence).toBe(1.0);
    });

    it('should extract confidence 0.75 for finishReason "length"', async () => {
      const mockModel = {} as LanguageModel;
      const client = createMullionClient(mockModel);

      const TestSchema = z.object({ data: z.string() });

      mockGenerateObject.mockResolvedValueOnce({
        object: { data: 'truncated' },
        finishReason: 'length',
        usage: { promptTokens: 10, completionTokens: 100, totalTokens: 110 },
        warnings: undefined,
        request: {} as never,
        response: {} as never,
        rawResponse: {} as never,
      });

      const result = await client.scope('test', async (ctx) => {
        return await ctx.infer(TestSchema, 'input');
      });

      expect(result.confidence).toBe(0.75);
    });

    it('should extract confidence 0.6 for finishReason "content-filter"', async () => {
      const mockModel = {} as LanguageModel;
      const client = createMullionClient(mockModel);

      const TestSchema = z.object({ data: z.string() });

      mockGenerateObject.mockResolvedValueOnce({
        object: { data: 'filtered' },
        finishReason: 'content-filter',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        warnings: undefined,
        request: {} as never,
        response: {} as never,
        rawResponse: {} as never,
      });

      const result = await client.scope('test', async (ctx) => {
        return await ctx.infer(TestSchema, 'input');
      });

      expect(result.confidence).toBe(0.6);
    });

    it('should extract confidence 0.3 for finishReason "error"', async () => {
      const mockModel = {} as LanguageModel;
      const client = createMullionClient(mockModel);

      const TestSchema = z.object({ data: z.string() });

      mockGenerateObject.mockResolvedValueOnce({
        object: { data: 'error-result' },
        finishReason: 'error',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        warnings: undefined,
        request: {} as never,
        response: {} as never,
        rawResponse: {} as never,
      });

      const result = await client.scope('test', async (ctx) => {
        return await ctx.infer(TestSchema, 'input');
      });

      expect(result.confidence).toBe(0.3);
    });
  });
});

describe('extractConfidenceFromFinishReason', () => {
  it.each<[FinishReason, number]>([
    ['stop', 1.0],
    ['tool-calls', 0.95],
    ['length', 0.75],
    ['content-filter', 0.6],
    ['other', 0.5],
    ['error', 0.3],
  ])('should return %f for finishReason "%s"', (finishReason, expected) => {
    expect(extractConfidenceFromFinishReason(finishReason)).toBe(expected);
  });
});
