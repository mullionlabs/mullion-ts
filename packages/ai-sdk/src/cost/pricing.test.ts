import {describe, it, expect} from 'vitest';
import {
  getPricing,
  getAllPricing,
  getPricingByProvider,
  calculateCacheWritePricing,
  exportPricingAsJSON,
  importPricingFromJSON,
  PRICING_DATA,
} from './pricing.js';

describe('getPricing', () => {
  describe('exact matches', () => {
    it('should return pricing for GPT-4', () => {
      const pricing = getPricing('gpt-4');

      expect(pricing.model).toBe('gpt-4');
      expect(pricing.provider).toBe('openai');
      expect(pricing.inputPer1M).toBe(30.0);
      expect(pricing.outputPer1M).toBe(60.0);
      expect(pricing.cachedInputPer1M).toBe(0.0);
      expect(pricing.cacheWritePer1M).toBe(0.0);
    });

    it('should return pricing for GPT-4-turbo', () => {
      const pricing = getPricing('gpt-4-turbo');

      expect(pricing.model).toBe('gpt-4-turbo');
      expect(pricing.provider).toBe('openai');
      expect(pricing.inputPer1M).toBe(10.0);
      expect(pricing.outputPer1M).toBe(30.0);
    });

    it('should return pricing for GPT-3.5-turbo', () => {
      const pricing = getPricing('gpt-3.5-turbo');

      expect(pricing.model).toBe('gpt-3.5-turbo');
      expect(pricing.inputPer1M).toBe(0.5);
      expect(pricing.outputPer1M).toBe(1.5);
    });

    it('should return pricing for Claude 3.5 Sonnet', () => {
      const pricing = getPricing('claude-3-5-sonnet-20241022');

      expect(pricing.model).toBe('claude-3-5-sonnet-20241022');
      expect(pricing.provider).toBe('anthropic');
      expect(pricing.inputPer1M).toBe(3.0);
      expect(pricing.outputPer1M).toBe(15.0);
      expect(pricing.cachedInputPer1M).toBe(0.3);
      expect(pricing.cacheWritePer1M).toBe(3.75);
    });

    it('should return pricing for Claude Opus 4.5', () => {
      const pricing = getPricing('claude-opus-4-5-20251101');

      expect(pricing.model).toBe('claude-opus-4-5-20251101');
      expect(pricing.provider).toBe('anthropic');
      expect(pricing.inputPer1M).toBe(15.0);
      expect(pricing.outputPer1M).toBe(75.0);
      expect(pricing.cachedInputPer1M).toBe(1.5);
    });

    it('should return pricing for Claude Haiku', () => {
      const pricing = getPricing('claude-haiku-4-5-20241022');

      expect(pricing.model).toBe('claude-haiku-4-5-20241022');
      expect(pricing.provider).toBe('anthropic');
      expect(pricing.inputPer1M).toBe(0.8);
      expect(pricing.outputPer1M).toBe(4.0);
    });

    it('should return pricing for O1 models', () => {
      const o1Preview = getPricing('o1-preview');
      expect(o1Preview.inputPer1M).toBe(15.0);
      expect(o1Preview.outputPer1M).toBe(60.0);

      const o1Mini = getPricing('o1-mini');
      expect(o1Mini.inputPer1M).toBe(3.0);
      expect(o1Mini.outputPer1M).toBe(12.0);
    });

    it('should return pricing for Gemini models', () => {
      const geminiPro = getPricing('gemini-2.5-pro');
      expect(geminiPro.provider).toBe('google');
      expect(geminiPro.inputPer1M).toBe(1.25);
      expect(geminiPro.outputPer1M).toBe(10.0);

      const geminiFlash = getPricing('gemini-2.5-flash');
      expect(geminiFlash.provider).toBe('google');
      expect(geminiFlash.cachedInputPer1M).toBe(0.03);
    });
  });

  describe('fuzzy matching', () => {
    it('should match GPT-4 variants', () => {
      const pricing = getPricing('gpt-4-0613');
      expect(pricing.provider).toBe('openai');
      expect(pricing.inputPer1M).toBeGreaterThan(0);
    });

    it('should match GPT-3.5 variants', () => {
      const pricing = getPricing('gpt-3.5-turbo-0125');
      expect(pricing.provider).toBe('openai');
      expect(pricing.inputPer1M).toBe(0.5);
    });

    it('should match Claude Sonnet variants', () => {
      const pricing = getPricing('claude-sonnet-latest');
      expect(pricing.provider).toBe('anthropic');
      expect(pricing.model).toContain('sonnet');
    });

    it('should match Claude Opus variants', () => {
      const pricing = getPricing('claude-opus-latest');
      expect(pricing.provider).toBe('anthropic');
      expect(pricing.model).toContain('opus');
    });

    it('should match Claude Haiku variants', () => {
      const pricing = getPricing('claude-haiku-latest');
      expect(pricing.provider).toBe('anthropic');
      expect(pricing.model).toContain('haiku');
    });

    it('should match Gemini variants', () => {
      const pricing = getPricing('models/gemini-2.5-pro-latest');
      expect(pricing.provider).toBe('google');
      expect(pricing.model).toContain('gemini');
    });
  });

  describe('unknown models', () => {
    it('should return default pricing for unknown model', () => {
      const pricing = getPricing('unknown-model-xyz');

      expect(pricing.model).toBe('unknown-model-xyz');
      expect(pricing.provider).toBe('unknown');
      expect(pricing.inputPer1M).toBe(10.0);
      expect(pricing.outputPer1M).toBe(30.0);
    });

    it('should return default pricing for custom deployment', () => {
      const pricing = getPricing('my-custom-gpt');

      expect(pricing.provider).toBe('unknown');
      expect(pricing.inputPer1M).toBeGreaterThan(0);
    });
  });

  describe('overrides', () => {
    it('should override input pricing', () => {
      const pricing = getPricing('gpt-4', {
        inputPer1M: 25.0,
      });

      expect(pricing.inputPer1M).toBe(25.0);
      expect(pricing.outputPer1M).toBe(60.0); // Original
    });

    it('should override output pricing', () => {
      const pricing = getPricing('gpt-4', {
        outputPer1M: 50.0,
      });

      expect(pricing.inputPer1M).toBe(30.0); // Original
      expect(pricing.outputPer1M).toBe(50.0);
    });

    it('should override multiple fields', () => {
      const pricing = getPricing('claude-3-5-sonnet-20241022', {
        inputPer1M: 2.5,
        outputPer1M: 12.0,
        cachedInputPer1M: 0.25,
      });

      expect(pricing.inputPer1M).toBe(2.5);
      expect(pricing.outputPer1M).toBe(12.0);
      expect(pricing.cachedInputPer1M).toBe(0.25);
      expect(pricing.cacheWritePer1M).toBe(3.75); // Original
    });

    it('should override provider', () => {
      const pricing = getPricing('custom-model', {
        provider: 'openai',
        inputPer1M: 5.0,
        outputPer1M: 15.0,
      });

      expect(pricing.provider).toBe('openai');
    });

    it('should work with unknown models and overrides', () => {
      const pricing = getPricing('unknown-xyz', {
        inputPer1M: 20.0,
        outputPer1M: 80.0,
      });

      expect(pricing.model).toBe('unknown-xyz');
      expect(pricing.inputPer1M).toBe(20.0);
      expect(pricing.outputPer1M).toBe(80.0);
    });
  });

  describe('pricing data integrity', () => {
    it('should have asOfDate for all models', () => {
      const allPricing = getAllPricing();
      allPricing.forEach((pricing) => {
        expect(pricing.asOfDate).toBeDefined();
        expect(pricing.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should have positive prices for all models', () => {
      const allPricing = getAllPricing();
      allPricing.forEach((pricing) => {
        expect(pricing.inputPer1M).toBeGreaterThan(0);
        expect(pricing.outputPer1M).toBeGreaterThan(0);
      });
    });

    it('should have cache pricing for Anthropic models', () => {
      const anthropicModels = getPricingByProvider('anthropic');
      anthropicModels.forEach((pricing) => {
        expect(pricing.cachedInputPer1M).toBeDefined();
        expect(pricing.cacheWritePer1M).toBeDefined();
        expect(pricing.cachedInputPer1M).toBeGreaterThanOrEqual(0);
        expect(pricing.cacheWritePer1M).toBeGreaterThan(0);
      });
    });

    it('should have zero cache pricing for OpenAI models', () => {
      const openaiModels = getPricingByProvider('openai');
      openaiModels.forEach((pricing) => {
        expect(pricing.cachedInputPer1M).toBe(0.0);
        expect(pricing.cacheWritePer1M).toBe(0.0);
      });
    });
  });
});

describe('getAllPricing', () => {
  it('should return all pricing data', () => {
    const allPricing = getAllPricing();

    expect(allPricing.length).toBeGreaterThan(0);
    expect(allPricing.length).toBe(Object.keys(PRICING_DATA).length);
  });

  it('should return array of ModelPricing', () => {
    const allPricing = getAllPricing();

    allPricing.forEach((pricing) => {
      expect(pricing).toHaveProperty('model');
      expect(pricing).toHaveProperty('provider');
      expect(pricing).toHaveProperty('inputPer1M');
      expect(pricing).toHaveProperty('outputPer1M');
    });
  });
});

describe('getPricingByProvider', () => {
  it('should return OpenAI models only', () => {
    const openaiPricing = getPricingByProvider('openai');

    expect(openaiPricing.length).toBeGreaterThan(0);
    openaiPricing.forEach((pricing) => {
      expect(pricing.provider).toBe('openai');
    });
  });

  it('should return Anthropic models only', () => {
    const anthropicPricing = getPricingByProvider('anthropic');

    expect(anthropicPricing.length).toBeGreaterThan(0);
    anthropicPricing.forEach((pricing) => {
      expect(pricing.provider).toBe('anthropic');
    });
  });

  it('should include all major OpenAI models', () => {
    const openaiPricing = getPricingByProvider('openai');
    const models = openaiPricing.map((p) => p.model);

    expect(models).toContain('gpt-4');
    expect(models).toContain('gpt-4-turbo');
    expect(models).toContain('gpt-3.5-turbo');
  });

  it('should include all major Anthropic models', () => {
    const anthropicPricing = getPricingByProvider('anthropic');
    const models = anthropicPricing.map((p) => p.model);

    expect(models.some((m) => m.includes('sonnet'))).toBe(true);
    expect(models.some((m) => m.includes('opus'))).toBe(true);
    expect(models.some((m) => m.includes('haiku'))).toBe(true);
  });

  it('should return Gemini models only', () => {
    const googlePricing = getPricingByProvider('google');

    expect(googlePricing.length).toBeGreaterThan(0);
    googlePricing.forEach((pricing) => {
      expect(pricing.provider).toBe('google');
      expect(pricing.model).toContain('gemini');
    });
  });
});

describe('calculateCacheWritePricing', () => {
  describe('Anthropic models', () => {
    it('should calculate 5m TTL cache write (+25%)', () => {
      const pricing = getPricing('claude-3-5-sonnet-20241022');
      const write5m = calculateCacheWritePricing(pricing, '5m');

      expect(write5m).toBe(3.75); // 3.0 * 1.25
    });

    it('should calculate 1h TTL cache write (+100%)', () => {
      const pricing = getPricing('claude-3-5-sonnet-20241022');
      const write1h = calculateCacheWritePricing(pricing, '1h');

      expect(write1h).toBe(6.0); // 3.0 * 2.0
    });

    it('should work for Claude Opus', () => {
      const pricing = getPricing('claude-opus-4-5-20251101');
      const write5m = calculateCacheWritePricing(pricing, '5m');
      const write1h = calculateCacheWritePricing(pricing, '1h');

      expect(write5m).toBe(18.75); // 15.0 * 1.25
      expect(write1h).toBe(30.0); // 15.0 * 2.0
    });

    it('should work for Claude Haiku', () => {
      const pricing = getPricing('claude-haiku-4-5-20241022');
      const write5m = calculateCacheWritePricing(pricing, '5m');
      const write1h = calculateCacheWritePricing(pricing, '1h');

      expect(write5m).toBe(1.0); // 0.8 * 1.25
      expect(write1h).toBe(1.6); // 0.8 * 2.0
    });
  });

  describe('OpenAI models', () => {
    it('should return 0 for GPT-4 (free caching)', () => {
      const pricing = getPricing('gpt-4');
      const write5m = calculateCacheWritePricing(pricing, '5m');
      const write1h = calculateCacheWritePricing(pricing, '1h');

      expect(write5m).toBe(0.0);
      expect(write1h).toBe(0.0);
    });

    it('should return 0 for GPT-3.5 (free caching)', () => {
      const pricing = getPricing('gpt-3.5-turbo');
      const write5m = calculateCacheWritePricing(pricing, '5m');

      expect(write5m).toBe(0.0);
    });
  });

  describe('unknown models', () => {
    it('should use conservative estimate', () => {
      const pricing = getPricing('unknown-model');
      const write5m = calculateCacheWritePricing(pricing, '5m');

      expect(write5m).toBe(12.5); // 10.0 * 1.25
    });
  });

  describe('Google models', () => {
    it('should use baseline cache write pricing', () => {
      const pricing = getPricing('gemini-2.5-pro');
      const write5m = calculateCacheWritePricing(pricing, '5m');
      const write1h = calculateCacheWritePricing(pricing, '1h');

      expect(write5m).toBe(1.25);
      expect(write1h).toBe(1.25);
    });
  });
});

describe('exportPricingAsJSON', () => {
  it('should export valid JSON', () => {
    const json = exportPricingAsJSON();

    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should export all pricing data', () => {
    const json = exportPricingAsJSON();
    const parsed = JSON.parse(json);

    expect(Object.keys(parsed).length).toBe(Object.keys(PRICING_DATA).length);
  });

  it('should export pretty JSON by default', () => {
    const json = exportPricingAsJSON();

    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });

  it('should export compact JSON when pretty=false', () => {
    const json = exportPricingAsJSON(false);

    expect(json).not.toContain('\n  ');
  });

  it('should include all required fields', () => {
    const json = exportPricingAsJSON();
    const parsed = JSON.parse(json);

    Object.values(parsed).forEach((pricing: any) => {
      expect(pricing).toHaveProperty('model');
      expect(pricing).toHaveProperty('provider');
      expect(pricing).toHaveProperty('inputPer1M');
      expect(pricing).toHaveProperty('outputPer1M');
      expect(pricing).toHaveProperty('asOfDate');
    });
  });
});

describe('importPricingFromJSON', () => {
  it('should import valid JSON', () => {
    const json = exportPricingAsJSON();
    const imported = importPricingFromJSON(json);

    expect(Object.keys(imported).length).toBeGreaterThan(0);
  });

  it('should preserve pricing data', () => {
    const json = exportPricingAsJSON();
    const imported = importPricingFromJSON(json);

    expect(imported['gpt-4'].inputPer1M).toBe(PRICING_DATA['gpt-4'].inputPer1M);
    expect(imported['claude-3-5-sonnet-20241022'].outputPer1M).toBe(
      PRICING_DATA['claude-3-5-sonnet-20241022'].outputPer1M,
    );
  });

  it('should work with custom pricing', () => {
    const customPricing = {
      'custom-model': {
        model: 'custom-model',
        provider: 'openai' as const,
        inputPer1M: 5.0,
        outputPer1M: 10.0,
        cachedInputPer1M: 0.0,
        cacheWritePer1M: 0.0,
        asOfDate: '2025-01-01',
      },
    };

    const json = JSON.stringify(customPricing);
    const imported = importPricingFromJSON(json);

    expect(imported['custom-model'].inputPer1M).toBe(5.0);
    expect(imported['custom-model'].outputPer1M).toBe(10.0);
  });

  it('should throw on invalid JSON', () => {
    expect(() => importPricingFromJSON('invalid json')).toThrow();
  });
});

describe('cache economics', () => {
  it('should validate Anthropic cache read is ~10% of input', () => {
    const anthropicModels = getPricingByProvider('anthropic');

    anthropicModels.forEach((pricing) => {
      const cacheRead = pricing.cachedInputPer1M!;
      const input = pricing.inputPer1M;

      expect(cacheRead).toBeCloseTo(input * 0.1, 5);
    });
  });

  it('should validate Anthropic 5m cache write is ~+25% of input', () => {
    const anthropicModels = getPricingByProvider('anthropic');

    anthropicModels.forEach((pricing) => {
      const cacheWrite = pricing.cacheWritePer1M!;
      const input = pricing.inputPer1M;

      expect(cacheWrite).toBeCloseTo(input * 1.25, 5);
    });
  });

  it('should show cache read savings vs no cache', () => {
    const pricing = getPricing('claude-3-5-sonnet-20241022');
    const cacheRead = pricing.cachedInputPer1M!;
    const input = pricing.inputPer1M;

    const savings = input - cacheRead;
    const savingsPercent = (savings / input) * 100;

    expect(savingsPercent).toBeCloseTo(90, 0);
  });
});
