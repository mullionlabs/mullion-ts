import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  clearModelCatalogOverrides,
  getCatalogCapabilityOverride,
  getCatalogPricingModelKeys,
  getCatalogPricingOverride,
  getModelCatalogOverrides,
  inferCatalogProviderFromModel,
  loadModelCatalog,
  ModelCatalogLoadError,
  ModelCatalogValidationError,
  setModelCatalogOverrides,
  type ModelCatalog,
} from './model-catalog.js';

const TEST_CATALOG: ModelCatalog = {
  schemaVersion: 1,
  snapshotDate: '2026-02-09',
  generatedAt: '2026-02-09T12:00:00.000Z',
  sources: ['https://example.com/catalog.json'],
  pricing: {
    default: {
      inputPer1M: 10,
      outputPer1M: 30,
      asOfDate: '2026-02-09',
    },
    providers: {
      openai: {
        default: {
          outputPer1M: 9,
        },
        models: {
          'gpt-5': {
            inputPer1M: 1.25,
            outputPer1M: 10,
            cachedInputPer1M: 0.125,
            cacheWritePer1M: 1.25,
            asOfDate: '2026-02-09',
          },
        },
      },
      google: {
        models: {
          'gemini-2.5-pro': {
            inputPer1M: 1.1,
            outputPer1M: 9,
            asOfDate: '2026-02-09',
          },
        },
      },
    },
    models: {
      'claude-opus-4-5-20260101': {
        provider: 'anthropic',
        inputPer1M: 18,
        outputPer1M: 90,
        asOfDate: '2026-02-09',
      },
    },
  },
  capabilities: {
    providers: {
      openai: {
        default: {
          supported: true,
          minTokens: 1024,
          maxBreakpoints: 100,
          supportsTtl: false,
          supportedTtl: [],
          supportsToolCaching: true,
          isAutomatic: true,
        },
      },
      google: {
        models: {
          'gemini-2.5-pro': {
            supported: true,
            minTokens: 1024,
            maxBreakpoints: 1,
            supportsTtl: true,
            supportedTtl: ['5m', '1h'],
            supportsToolCaching: false,
            isAutomatic: false,
          },
        },
      },
    },
  },
};

describe('model-catalog', () => {
  beforeEach(() => {
    clearModelCatalogOverrides();
  });

  afterEach(() => {
    clearModelCatalogOverrides();
  });

  it('sets and retrieves validated catalog overrides', () => {
    const parsed = setModelCatalogOverrides(TEST_CATALOG);

    expect(parsed.schemaVersion).toBe(1);
    expect(getModelCatalogOverrides()?.snapshotDate).toBe('2026-02-09');
  });

  it('throws validation errors for malformed catalogs', () => {
    expect(() =>
      setModelCatalogOverrides({
        ...TEST_CATALOG,
        schemaVersion: 2,
      } as unknown as ModelCatalog),
    ).toThrow(ModelCatalogValidationError);
  });

  it('merges runtime pricing overrides using default > provider > model precedence', () => {
    setModelCatalogOverrides(TEST_CATALOG);

    const pricing = getCatalogPricingOverride('openai', 'gpt-5');

    expect(pricing).toEqual({
      inputPer1M: 1.25,
      outputPer1M: 10,
      cachedInputPer1M: 0.125,
      cacheWritePer1M: 1.25,
      asOfDate: '2026-02-09',
    });
  });

  it('supports normalized model matching for runtime overrides', () => {
    setModelCatalogOverrides(TEST_CATALOG);

    const pricing = getCatalogPricingOverride(
      'google',
      'models/gemini-2.5-pro-latest',
    );

    expect(pricing?.inputPer1M).toBe(1.1);
    expect(pricing?.outputPer1M).toBe(9);
  });

  it('resolves runtime capability overrides', () => {
    setModelCatalogOverrides(TEST_CATALOG);

    const capabilities = getCatalogCapabilityOverride(
      'google',
      'gemini-2.5-pro',
    );

    expect(capabilities).toEqual({
      supported: true,
      minTokens: 1024,
      maxBreakpoints: 1,
      supportsTtl: true,
      supportedTtl: ['5m', '1h'],
      supportsToolCaching: false,
      isAutomatic: false,
    });
  });

  it('returns pricing model keys by provider', () => {
    setModelCatalogOverrides(TEST_CATALOG);

    expect(getCatalogPricingModelKeys('openai')).toContain('gpt-5');
    expect(getCatalogPricingModelKeys('anthropic')).toContain(
      'claude-opus-4-5-20260101',
    );
  });

  it('loads catalog from inline JSON payload', async () => {
    const result = await loadModelCatalog({
      json: JSON.stringify(TEST_CATALOG),
    });

    expect(result.usedFallback).toBe(false);
    expect(result.catalog?.schemaVersion).toBe(1);
  });

  it('loads catalog from file path', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'mullion-catalog-'));
    const catalogPath = join(tempDir, 'catalog.json');
    await writeFile(catalogPath, JSON.stringify(TEST_CATALOG), 'utf8');

    const result = await loadModelCatalog({
      filePath: catalogPath,
    });

    expect(result.source).toBe('file');
    expect(result.catalog?.snapshotDate).toBe('2026-02-09');
  });

  it('loads catalog from URL using injected fetch', async () => {
    const fetchFn = vi.fn(async () => {
      return new Response(JSON.stringify(TEST_CATALOG), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    });

    const result = await loadModelCatalog({
      url: 'https://example.com/catalog.json',
      fetchFn,
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.source).toBe('url');
    expect(result.catalog?.schemaVersion).toBe(1);
  });

  it('uses TTL cache unless forceRefresh is enabled', async () => {
    const fetchFn = vi.fn(async () => {
      return new Response(JSON.stringify(TEST_CATALOG), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    });

    await loadModelCatalog({
      url: 'https://example.com/catalog.json',
      fetchFn,
      ttlMs: 60_000,
    });

    const cachedResult = await loadModelCatalog({
      url: 'https://example.com/catalog.json',
      fetchFn,
      ttlMs: 60_000,
    });

    await loadModelCatalog({
      url: 'https://example.com/catalog.json',
      fetchFn,
      ttlMs: 60_000,
      forceRefresh: true,
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(cachedResult.fromCache).toBe(true);
  });

  it('returns fallback result and keeps previous catalog on validation failure', async () => {
    setModelCatalogOverrides(TEST_CATALOG);

    const result = await loadModelCatalog({
      json: '{"schemaVersion":2}',
    });

    expect(result.usedFallback).toBe(true);
    expect(result.error).toBeInstanceOf(ModelCatalogValidationError);
    expect(getModelCatalogOverrides()?.snapshotDate).toBe('2026-02-09');
  });

  it('throws catalog loading errors when throwOnError=true', async () => {
    await expect(
      loadModelCatalog({
        url: '',
        throwOnError: true,
      }),
    ).rejects.toThrow(ModelCatalogLoadError);
  });

  it('infers provider from model names', () => {
    expect(inferCatalogProviderFromModel('gpt-5')).toBe('openai');
    expect(inferCatalogProviderFromModel('claude-sonnet-4-5')).toBe(
      'anthropic',
    );
    expect(inferCatalogProviderFromModel('gemini-2.5-pro')).toBe('google');
    expect(inferCatalogProviderFromModel('custom-model')).toBe('unknown');
  });
});
