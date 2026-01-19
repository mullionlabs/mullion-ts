import {describe, it, expect} from 'vitest';
import {createMullionClient} from '@mullion/ai-sdk';
import {createOpenAI} from '@ai-sdk/openai';
import {z} from 'zod';
import type {Owned} from '@mullion/core';
import {OPENAI_MODEL} from './test-config.js';

const openaiApiKey = process.env.OPENAI_API_KEY;
const itOpenAI = openaiApiKey ? it : it.skip;
function createClient() {
  if (!openaiApiKey) {
    throw new Error(
      'OPENAI_API_KEY is required to run scope-bridging integration tests.',
    );
  }

  const provider = createOpenAI({apiKey: openaiApiKey});
  const model = provider(OPENAI_MODEL);
  return createMullionClient(model, {
    provider: 'openai',
    model: OPENAI_MODEL,
  });
}

describe('Scope bridging', () => {
  itOpenAI(
    'bridges values between scopes and enforces boundaries',
    async () => {
      const client = createClient();

      const TicketSchema = z.object({
        category: z.enum(['billing', 'access', 'bug', 'general']),
        priority: z.enum(['low', 'medium', 'high']),
        summary: z.string(),
      });

      const input =
        'User cannot access their account after resetting the password. They need help urgently.';

      const result = await client.scope('source', async (sourceCtx) => {
        const owned = await sourceCtx.infer(TicketSchema, input, {
          temperature: 0,
        });

        return await client.scope('target', async (targetCtx) => {
          expect(() =>
            targetCtx.use(owned as unknown as Owned<unknown, 'target'>),
          ).toThrow(/Scope mismatch/);

          const bridged = targetCtx.bridge(owned);
          expect(bridged.__scope).toBe('target');
          expect(bridged.traceId).toBe(owned.traceId);
          expect(bridged.value).toEqual(owned.value);

          const unwrapped = targetCtx.use(bridged);
          expect(unwrapped).toEqual(owned.value);

          return bridged;
        });
      });

      expect(result.__scope).toBe('target');
    },
  );
});
