import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  clearGeminiModelsCache,
  listGeminiModels,
  listGeminiModelsCached,
  normalizeGeminiModelName,
  supportsGenerateContent,
  type GeminiModel,
} from './gemini-models.js';

describe('normalizeGeminiModelName', () => {
  it('strips models/ prefix', () => {
    expect(normalizeGeminiModelName('models/gemini-2.0-flash')).toBe(
      'gemini-2.0-flash',
    );
  });

  it('keeps plain model names intact', () => {
    expect(normalizeGeminiModelName('gemini-2.5-pro')).toBe('gemini-2.5-pro');
  });
});

describe('supportsGenerateContent', () => {
  it('returns true when generateContent is present', () => {
    const model: GeminiModel = {
      name: 'models/gemini-2.5-pro',
      id: 'gemini-2.5-pro',
      supportedGenerationMethods: ['generateContent', 'countTokens'],
    };
    expect(supportsGenerateContent(model)).toBe(true);
  });

  it('returns false for non-inference models', () => {
    const model: GeminiModel = {
      name: 'models/text-embedding-004',
      id: 'text-embedding-004',
      supportedGenerationMethods: ['embedContent'],
    };
    expect(supportsGenerateContent(model)).toBe(false);
  });
});

describe('listGeminiModels', () => {
  const originalApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  beforeEach(() => {
    clearGeminiModelsCache();
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  afterEach(() => {
    if (typeof originalApiKey === 'string') {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalApiKey;
    } else {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    }
    vi.restoreAllMocks();
    clearGeminiModelsCache();
  });

  it('fails when API key is missing', async () => {
    await expect(
      listGeminiModels({
        fetcher: vi.fn(),
      }),
    ).rejects.toThrow('Gemini API key is required');
  });

  it('filters out deprecated and non-inference models by default', async () => {
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          models: [
            {
              name: 'models/gemini-2.5-pro',
              state: 'ACTIVE',
              supportedGenerationMethods: ['generateContent', 'countTokens'],
            },
            {
              name: 'models/text-embedding-004',
              state: 'ACTIVE',
              supportedGenerationMethods: ['embedContent'],
            },
            {
              name: 'models/gemini-1.5-pro-001',
              state: 'DEPRECATED',
              supportedGenerationMethods: ['generateContent'],
            },
          ],
        }),
        {
          status: 200,
          headers: {'content-type': 'application/json'},
        },
      );
    });

    const models = await listGeminiModels({
      apiKey: 'test-key',
      fetcher,
      pageSize: 50,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(models.map((model) => model.id)).toEqual(['gemini-2.5-pro']);

    const requestedUrl = String(fetcher.mock.calls[0][0]);
    expect(requestedUrl).toContain('pageSize=50');
    expect(requestedUrl).toContain('key=test-key');
  });

  it('supports pagination', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-2.0-flash',
                state: 'ACTIVE',
                supportedGenerationMethods: ['generateContent'],
              },
            ],
            nextPageToken: 'next-page',
          }),
          {status: 200, headers: {'content-type': 'application/json'}},
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-2.5-pro',
                state: 'ACTIVE',
                supportedGenerationMethods: ['generateContent'],
              },
            ],
          }),
          {status: 200, headers: {'content-type': 'application/json'}},
        ),
      );

    const models = await listGeminiModels({
      apiKey: 'test-key',
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(models.map((model) => model.id)).toEqual([
      'gemini-2.0-flash',
      'gemini-2.5-pro',
    ]);
    expect(String(fetcher.mock.calls[1][0])).toContain('pageToken=next-page');
  });

  it('can include deprecated and non-inference models when requested', async () => {
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          models: [
            {
              name: 'models/gemini-2.5-pro',
              state: 'ACTIVE',
              supportedGenerationMethods: ['generateContent'],
            },
            {
              name: 'models/text-embedding-004',
              state: 'ACTIVE',
              supportedGenerationMethods: ['embedContent'],
            },
            {
              name: 'models/gemini-1.5-pro-001',
              state: 'DEPRECATED',
              supportedGenerationMethods: ['generateContent'],
            },
          ],
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      );
    });

    const models = await listGeminiModels({
      apiKey: 'test-key',
      fetcher,
      includeDeprecated: true,
      includeNonInferenceModels: true,
    });

    expect(models.map((model) => model.id)).toEqual([
      'gemini-1.5-pro-001',
      'gemini-2.5-pro',
      'text-embedding-004',
    ]);
  });
});

describe('listGeminiModelsCached', () => {
  beforeEach(() => {
    clearGeminiModelsCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearGeminiModelsCache();
  });

  it('returns cached data until forceRefresh is used', async () => {
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          models: [
            {
              name: 'models/gemini-2.0-flash',
              state: 'ACTIVE',
              supportedGenerationMethods: ['generateContent'],
            },
          ],
        }),
        {status: 200, headers: {'content-type': 'application/json'}},
      );
    });

    const first = await listGeminiModelsCached({
      apiKey: 'test-key',
      fetcher,
      cacheTtlMs: 60_000,
    });
    const second = await listGeminiModelsCached({
      apiKey: 'test-key',
      fetcher,
      cacheTtlMs: 60_000,
    });

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await listGeminiModelsCached({
      apiKey: 'test-key',
      fetcher,
      forceRefresh: true,
      cacheTtlMs: 60_000,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
