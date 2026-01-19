import {describe, it, expect} from 'vitest';
import {createMullionClient} from '@mullion/ai-sdk';
import {createAnthropic} from '@ai-sdk/anthropic';
import {z} from 'zod';
import {
  ANTHROPIC_ENABLE_SONNET,
  ANTHROPIC_MODEL,
  ANTHROPIC_SONNET_MODELS,
} from './test-config.js';

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const itAnthropic = anthropicApiKey ? it : it.skip;
const itAnthropicSonnet =
  anthropicApiKey && ANTHROPIC_ENABLE_SONNET ? it : it.skip;

function createClient(modelName: string) {
  if (!anthropicApiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required to run Anthropic integration tests.',
    );
  }

  const provider = createAnthropic({apiKey: anthropicApiKey});
  const model = provider(modelName);
  return createMullionClient(model, {
    provider: 'anthropic',
    model: modelName,
  });
}

describe('Anthropic integration', () => {
  itAnthropic('creates a client and runs basic inference', async () => {
    const client = createClient(ANTHROPIC_MODEL);

    const EmailSchema = z.object({
      intent: z.enum(['support', 'sales', 'billing', 'general']),
      urgency: z.enum(['low', 'medium', 'high']),
      summary: z.string(),
    });

    const input =
      'Subject: Login issue. The user cannot access their account and needs help soon.';

    const result = await client.scope('anthropic-basic', async (ctx) => {
      return await ctx.infer(EmailSchema, input, {temperature: 0});
    });

    const parsed = EmailSchema.safeParse(result.value);
    if (!parsed.success) {
      throw parsed.error;
    }

    expect(result.__scope).toBe('anthropic-basic');
    expect(result.traceId).toMatch(/^anthropic-basic-/);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  itAnthropicSonnet('supports sonnet models', async () => {
    const sonnetCandidates = ANTHROPIC_SONNET_MODELS;

    const SimpleSchema = z.object({
      verdict: z.enum(['pass', 'fail']),
      reason: z.string(),
    });

    const input =
      'Classify this as pass or fail with a short reason: The request includes all required fields.';

    let lastError: unknown = null;

    for (const modelName of sonnetCandidates) {
      try {
        const client = createClient(modelName);

        const result = await client.scope(
          `anthropic-${modelName}`,
          async (ctx) => {
            return await ctx.infer(SimpleSchema, input, {temperature: 0});
          },
        );

        const parsed = SimpleSchema.safeParse(result.value);
        if (!parsed.success) {
          throw parsed.error;
        }

        expect(result.__scope).toBe(`anthropic-${modelName}`);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error('No Sonnet model succeeded');
  });
});
