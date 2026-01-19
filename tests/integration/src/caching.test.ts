import {describe, it, expect} from 'vitest';
import {createMullionClient} from '@mullion/ai-sdk';
import {createAnthropic} from '@ai-sdk/anthropic';
import {z} from 'zod';
import {
  ANTHROPIC_CACHE_MIN_TOKENS,
  ANTHROPIC_MODEL,
  buildLongDocument,
} from './test-config.js';

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const itAnthropic = anthropicApiKey ? it : it.skip;
const longDocument = buildLongDocument('validate Anthropic cache behavior');

function createClient() {
  if (!anthropicApiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required to run Anthropic caching integration tests.',
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

describe('Anthropic caching', () => {
  itAnthropic('creates cache segments and records cache metrics', async () => {
    const client = createClient();

    const SummarySchema = z.object({
      summary: z.string(),
    });
    const prompt = 'Summarize the cached document in one short sentence.';

    await client.scope('anthropic-cache', async (ctx) => {
      ctx.cache.segment('cached-document', longDocument, {
        ttl: '5m',
        scope: 'developer-content',
      });

      const segments = ctx.cache.getSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].tokenCount).toBeGreaterThanOrEqual(
        ANTHROPIC_CACHE_MIN_TOKENS,
      );

      const first = await ctx.infer(SummarySchema, prompt, {
        temperature: 0,
        maxTokens: 64,
        cache: 'use-segments',
      });

      const firstParsed = SummarySchema.safeParse(first.value);
      if (!firstParsed.success) {
        throw firstParsed.error;
      }

      const statsAfterFirst = ctx.getCacheStats();

      const rawAfterFirst = statsAfterFirst.raw as
        | {
            individualMetrics?: {
              cache_creation_input_tokens?: number;
              cache_read_input_tokens?: number;
            }[];
          }
        | undefined;

      expect(statsAfterFirst.provider).toBe('anthropic');
      expect(statsAfterFirst.cacheWriteTokens).toBeGreaterThan(0);
      const firstRaw = rawAfterFirst?.individualMetrics?.[0];

      expect(typeof firstRaw?.cache_creation_input_tokens).toBe('number');
      expect(firstRaw?.cache_creation_input_tokens ?? 0).toBeGreaterThan(0);

      await ctx.infer(SummarySchema, prompt, {
        temperature: 0,
        maxTokens: 64,
        cache: 'use-segments',
      });

      const statsAfterSecond = ctx.getCacheStats();
      const readDelta =
        statsAfterSecond.cacheReadTokens - statsAfterFirst.cacheReadTokens;

      expect(statsAfterSecond.cacheWriteTokens).toBeGreaterThanOrEqual(
        statsAfterFirst.cacheWriteTokens,
      );
      expect(readDelta).toBeGreaterThan(0);

      const rawAfterSecond = statsAfterSecond.raw as
        | {
            individualMetrics?: {
              cache_creation_input_tokens?: number;
              cache_read_input_tokens?: number;
            }[];
          }
        | undefined;
      const secondRaw = rawAfterSecond?.individualMetrics?.[1];

      expect(typeof secondRaw?.cache_read_input_tokens).toBe('number');
      expect(secondRaw?.cache_read_input_tokens ?? 0).toBeGreaterThan(0);
    });
  });
});
