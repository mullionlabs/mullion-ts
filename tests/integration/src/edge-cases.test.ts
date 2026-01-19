import {describe, it, expect} from 'vitest';
import {createMullionClient} from '@mullion/ai-sdk';
import {createOpenAI} from '@ai-sdk/openai';
import {z} from 'zod';
import type {Owned} from '@mullion/core';
import {OPENAI_INVALID_MODEL, OPENAI_MODEL} from './test-config.js';

const openaiApiKey = process.env.OPENAI_API_KEY;
const itOpenAI = openaiApiKey ? it : it.skip;
function createClient(model = OPENAI_MODEL, apiKey = openaiApiKey) {
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is required to run edge case integration tests.',
    );
  }

  const provider = createOpenAI({apiKey});
  const modelInstance = provider(model);
  return createMullionClient(modelInstance, {
    provider: 'openai',
    model,
  });
}

describe('Edge cases', () => {
  itOpenAI('flags ambiguous input with low confidence', async () => {
    const client = createClient();

    const AmbiguitySchema = z.object({
      intent: z.literal('unknown'),
      confidence: z.number().min(0).max(0.4),
      reason: z.string(),
    });

    const input =
      'The user says they might need help with something, but the request is vague and could be billing or support.';

    const result = await client.scope('edge-ambiguous', async (ctx) => {
      return await ctx.infer(AmbiguitySchema, input, {
        temperature: 0,
        systemPrompt:
          'Classify the intent. The input is ambiguous. ' +
          'Set intent to "unknown" and confidence between 0 and 0.4. ' +
          'Keep the reason to one short sentence.',
      });
    });

    const parsed = AmbiguitySchema.safeParse(result.value);
    if (!parsed.success) {
      throw parsed.error;
    }

    expect(parsed.data.intent).toBe('unknown');
    expect(parsed.data.confidence).toBeGreaterThanOrEqual(0);
    expect(parsed.data.confidence).toBeLessThanOrEqual(0.4);
  });

  itOpenAI(
    'throws on scope mismatch when using values across scopes',
    async () => {
      const client = createClient();

      const TicketSchema = z.object({
        category: z.enum(['billing', 'support', 'sales']),
        summary: z.string(),
      });

      const input =
        'The customer is unsure who to contact about a charge they do not recognize.';

      await client.scope('edge-source', async (sourceCtx) => {
        const owned = await sourceCtx.infer(TicketSchema, input, {
          temperature: 0,
        });

        await client.scope('edge-target', async (targetCtx) => {
          expect(() =>
            targetCtx.use(owned as unknown as Owned<unknown, 'edge-target'>),
          ).toThrow(/Scope mismatch/);
        });
      });
    },
  );

  itOpenAI('surfaces API errors as exceptions', async () => {
    const invalidClient = createClient(OPENAI_INVALID_MODEL);

    const StatusSchema = z.object({
      status: z.literal('ok'),
    });

    await invalidClient.scope('edge-api-error', async (ctx) => {
      await expect(
        ctx.infer(StatusSchema, 'Return status "ok".', {temperature: 0}),
      ).rejects.toBeInstanceOf(Error);
    });
  });
});
