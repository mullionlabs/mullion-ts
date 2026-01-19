import {describe, it, expect} from 'vitest';
import {createMullionClient} from '@mullion/ai-sdk';
import {createOpenAI} from '@ai-sdk/openai';
import {createAnthropic} from '@ai-sdk/anthropic';
import {z} from 'zod';
import {
  ANTHROPIC_CACHE_MIN_TOKENS,
  ANTHROPIC_CACHE_STRICT,
  ANTHROPIC_MODEL,
  OPENAI_MODEL,
  buildLongDocument,
} from './test-config.js';

const openaiApiKey = process.env.OPENAI_API_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const itOpenAI = openaiApiKey ? it : it.skip;
const itAnthropic = anthropicApiKey ? it : it.skip;

const longDocument = buildLongDocument('validate cache savings calculations');

function createOpenAIClient() {
  if (!openaiApiKey) {
    throw new Error(
      'OPENAI_API_KEY is required to run cost integration tests.',
    );
  }

  const provider = createOpenAI({apiKey: openaiApiKey});
  const model = provider(OPENAI_MODEL);
  return createMullionClient(model, {
    provider: 'openai',
    model: OPENAI_MODEL,
  });
}

function createAnthropicClient() {
  if (!anthropicApiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required to run cost integration tests.',
    );
  }

  const provider = createAnthropic({apiKey: anthropicApiKey});
  const model = provider(ANTHROPIC_MODEL);
  return createMullionClient(model, {
    provider: 'anthropic',
    model: ANTHROPIC_MODEL,
    enableCache: true,
  });
}

describe('Cost estimation and tracking', () => {
  itOpenAI(
    'estimates cost before inference and tracks last call cost',
    async () => {
      const client = createOpenAIClient();

      const SummarySchema = z.object({
        summary: z.string(),
      });
      const prompt =
        'Summarize this update in one sentence: The system is operational.';

      await client.scope('openai-cost', async (ctx) => {
        const estimate = ctx.estimateNextCallCost(prompt, 64);

        expect(estimate.totalCost).toBeGreaterThan(0);
        expect(estimate.noCacheCost).toBeGreaterThan(0);
        expect(estimate.totalCost).toBeCloseTo(estimate.noCacheCost, 10);
        expect(estimate.savingsPercent).toBeCloseTo(0, 10);

        const result = await ctx.infer(SummarySchema, prompt, {
          temperature: 0,
          maxTokens: 64,
        });

        const parsed = SummarySchema.safeParse(result.value);
        if (!parsed.success) {
          throw parsed.error;
        }

        const actual = ctx.getLastCallCost();
        expect(actual).not.toBeNull();
        if (!actual) {
          return;
        }

        expect(actual.totalCost).toBeGreaterThan(0);
        expect(actual.noCacheCost).toBeGreaterThan(0);
        expect(actual.noCacheCost).toBeGreaterThanOrEqual(actual.totalCost);
        expect(actual.pricing.model).toBe(OPENAI_MODEL);
        expect(actual.pricing.provider).toBe('openai');
      });
    },
  );

  itAnthropic('calculates cache savings after cache hits', async () => {
    const client = createAnthropicClient();

    const SummarySchema = z.object({
      summary: z.string(),
    });
    const prompt = 'Provide a one-sentence summary of the cached document.';

    await client.scope('anthropic-cost-cache', async (ctx) => {
      ctx.cache.segment('cached-document', longDocument, {
        ttl: '5m',
        scope: 'developer-content',
      });

      const segments = ctx.cache.getSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].tokenCount).toBeGreaterThanOrEqual(
        ANTHROPIC_CACHE_MIN_TOKENS,
      );

      await ctx.infer(SummarySchema, prompt, {
        temperature: 0,
        maxTokens: 64,
        cache: 'use-segments',
      });

      const firstStats = ctx.getCacheStats();
      const hasCacheWrite = firstStats.cacheWriteTokens > 0;
      if (!hasCacheWrite) {
        if (ANTHROPIC_CACHE_STRICT) {
          expect(firstStats.cacheWriteTokens).toBeGreaterThan(0);
        }
        return;
      }

      await ctx.infer(SummarySchema, prompt, {
        temperature: 0,
        maxTokens: 64,
        cache: 'use-segments',
      });

      const secondStats = ctx.getCacheStats();
      const hasCacheRead =
        secondStats.cacheReadTokens > firstStats.cacheReadTokens;
      if (!hasCacheRead) {
        if (ANTHROPIC_CACHE_STRICT) {
          expect(secondStats.cacheReadTokens).toBeGreaterThan(
            firstStats.cacheReadTokens,
          );
        }
        return;
      }

      const actual = ctx.getLastCallCost();
      expect(actual).not.toBeNull();
      if (!actual) {
        return;
      }

      expect(actual.savings).toBeGreaterThan(0);
      expect(actual.savingsPercent).toBeGreaterThan(0);
      expect(actual.totalCost).toBeLessThan(actual.noCacheCost);
      expect(actual.pricing.model).toBe(ANTHROPIC_MODEL);
      expect(actual.pricing.provider).toBe('anthropic');
    });
  });
});
