import {afterEach, describe, expect, it} from 'vitest';
import {createMullionClient, setupWarmupExecutor} from '@mullion/ai-sdk';
import {
  fork,
  mergeResults,
  object as mergeObject,
  clearWarmupExecutor,
} from '@mullion/core';
import {createOpenAI} from '@ai-sdk/openai';
import {createAnthropic} from '@ai-sdk/anthropic';
import {z} from 'zod';
import {
  ANTHROPIC_CACHE_MIN_TOKENS,
  ANTHROPIC_MODEL,
  OPENAI_MODEL,
  buildLongDocument,
} from './test-config.js';

const openaiApiKey = process.env.OPENAI_API_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const itOpenAI = openaiApiKey ? it : it.skip;
const itAnthropic = anthropicApiKey ? it : it.skip;

const longDocument = buildLongDocument('validate fork cache warmup behavior');

function createOpenAIClient() {
  if (!openaiApiKey) {
    throw new Error(
      'OPENAI_API_KEY is required to run fork/merge integration tests.',
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
      'ANTHROPIC_API_KEY is required to run fork/merge integration tests.',
    );
  }

  const provider = createAnthropic({apiKey: anthropicApiKey});
  const model = provider(ANTHROPIC_MODEL);
  return {
    model,
    client: createMullionClient(model, {
      provider: 'anthropic',
      model: ANTHROPIC_MODEL,
      enableCache: true,
    }),
  };
}

afterEach(() => {
  clearWarmupExecutor();
});

describe('Fork and merge integration', () => {
  itOpenAI(
    'executes fast-parallel branches and merges with provenance',
    async () => {
      const client = createOpenAIClient();

      const StatusSchema = z.object({
        status: z.literal('ready'),
      });
      const prompt = 'Return status "ready".';

      await client.scope('openai-fork-merge', async (ctx) => {
        const forkResult = await fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            (branchCtx) =>
              branchCtx.infer(StatusSchema, prompt, {temperature: 0}),
            (branchCtx) =>
              branchCtx.infer(StatusSchema, prompt, {temperature: 0}),
            (branchCtx) =>
              branchCtx.infer(StatusSchema, prompt, {temperature: 0}),
          ],
        });

        expect(forkResult.results).toHaveLength(3);
        expect(forkResult.cacheStats.warmupCost).toBe(0);
        expect(forkResult.cacheStats.branchCacheHits).toHaveLength(3);

        const traceIds = new Set(
          forkResult.results.map((result) => result.traceId),
        );
        expect(traceIds.size).toBe(3);

        forkResult.results.forEach((result) => {
          expect(result.__scope).toBe('openai-fork-merge');
          expect(result.value.status).toBe('ready');
          expect(result.confidence).toBeGreaterThanOrEqual(0);
        });

        const mergeResult = mergeResults(
          forkResult.results,
          mergeObject.fieldwise<(typeof forkResult.results)[number]['value']>(),
        );

        expect(mergeResult.value.__scope).toBe('merged');
        expect(mergeResult.value.value.status).toBe('ready');
        expect(mergeResult.value.traceId).toMatch(/^merge-fieldwise-/);
        expect(mergeResult.provenance.contributingBranches).toEqual([0, 1, 2]);
        expect(mergeResult.provenance.rejectedValues).toHaveLength(0);
        expect(mergeResult.provenance.consensusLevel).toBeCloseTo(1, 4);
        expect(mergeResult.conflicts).toHaveLength(0);
      });
    },
  );

  itAnthropic('runs cache-optimized fork with explicit warmup', async () => {
    const {client, model} = createAnthropicClient();

    const SummarySchema = z.object({
      summary: z.string(),
    });
    const prompt =
      'Provide a very short summary of the cached document in one sentence.';

    await client.scope('anthropic-fork-cache', async (ctx) => {
      ctx.cache.segment('shared-document', longDocument, {
        ttl: '5m',
        scope: 'developer-content',
      });

      const segments = ctx.cache.getSegments();
      expect(segments).toHaveLength(1);
      expect(segments[0].tokenCount).toBeGreaterThanOrEqual(
        ANTHROPIC_CACHE_MIN_TOKENS,
      );

      setupWarmupExecutor(
        {
          provider: 'anthropic',
          model: ANTHROPIC_MODEL,
          languageModel: model,
        },
        ctx.cache,
      );

      const forkResult = await fork(ctx, {
        strategy: 'cache-optimized',
        warmup: 'explicit',
        branches: [
          (branchCtx) =>
            branchCtx.infer(SummarySchema, prompt, {
              temperature: 0,
              maxTokens: 64,
            }),
          (branchCtx) =>
            branchCtx.infer(SummarySchema, prompt, {
              temperature: 0,
              maxTokens: 64,
            }),
        ],
      });

      expect(forkResult.results).toHaveLength(2);
      expect(forkResult.cacheStats.warmupCost).toBeGreaterThan(0);
      expect(forkResult.cacheStats.branchCacheHits).toHaveLength(2);

      forkResult.results.forEach((result) => {
        const parsed = SummarySchema.safeParse(result.value);
        if (!parsed.success) {
          throw parsed.error;
        }
        expect(result.__scope).toBe('anthropic-fork-cache');
      });
    });
  });
});
