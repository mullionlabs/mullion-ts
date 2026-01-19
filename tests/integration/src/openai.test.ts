import {describe, it, expect} from 'vitest';
import {createMullionClient} from '@mullion/ai-sdk';
import {createOpenAI} from '@ai-sdk/openai';
import {z} from 'zod';
import {OPENAI_MODEL} from './test-config.js';

const openaiApiKey = process.env.OPENAI_API_KEY;
const itOpenAI = openaiApiKey ? it : it.skip;
function createClient() {
  if (!openaiApiKey) {
    throw new Error(
      'OPENAI_API_KEY is required to run OpenAI integration tests.',
    );
  }

  const provider = createOpenAI({apiKey: openaiApiKey});
  const model = provider(OPENAI_MODEL);
  return createMullionClient(model, {
    provider: 'openai',
    model: OPENAI_MODEL,
  });
}

describe('OpenAI integration', () => {
  itOpenAI('creates a client and runs basic inference', async () => {
    const client = createClient();

    const EmailSchema = z.object({
      intent: z.enum(['support', 'sales', 'billing', 'general']),
      urgency: z.enum(['low', 'medium', 'high']),
      summary: z.string(),
    });

    const input =
      'Subject: Billing issue. The last invoice has an unexpected charge. Please help quickly.';

    const result = await client.scope('openai-basic', async (ctx) => {
      return await ctx.infer(EmailSchema, input, {temperature: 0});
    });

    const parsed = EmailSchema.safeParse(result.value);
    if (!parsed.success) {
      throw parsed.error;
    }

    expect(typeof client.scope).toBe('function');
    expect(result.__scope).toBe('openai-basic');
    expect(result.traceId).toMatch(/^openai-basic-/);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  itOpenAI(
    'handles complex schemas with nested objects, arrays, and enums',
    async () => {
      const client = createClient();

      const ComplexSchema = z.object({
        account: z.object({
          tier: z.enum(['free', 'pro', 'enterprise']),
          region: z.enum(['us', 'eu']),
        }),
        flags: z.array(z.enum(['billing', 'security', 'performance'])).min(1),
        summary: z.object({
          title: z.string(),
          bullets: z.array(z.string()).min(1),
        }),
      });

      const input =
        'Enterprise account in the EU reports a billing issue and a security concern. Provide a short title and two bullet points.';

      const result = await client.scope('openai-complex', async (ctx) => {
        return await ctx.infer(ComplexSchema, input, {temperature: 0});
      });

      const parsed = ComplexSchema.safeParse(result.value);
      if (!parsed.success) {
        throw parsed.error;
      }

      expect(parsed.data.flags.length).toBeGreaterThan(0);
      expect(parsed.data.summary.bullets.length).toBeGreaterThan(0);
      expect(result.__scope).toBe('openai-complex');
    },
  );
});
