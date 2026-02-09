import {describe, it, expect} from 'vitest';
import {createMullionClient, listGeminiModelsCached} from '@mullion/ai-sdk';
import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {z} from 'zod';
import {GEMINI_MODEL} from './test-config.js';

const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const itGemini = geminiApiKey ? it : it.skip;

function createClient(modelName: string = GEMINI_MODEL) {
  if (!geminiApiKey) {
    throw new Error(
      'GOOGLE_GENERATIVE_AI_API_KEY is required to run Gemini integration tests.',
    );
  }

  const provider = createGoogleGenerativeAI({apiKey: geminiApiKey});
  const model = provider(modelName);
  return createMullionClient(model, {
    provider: 'google',
    model: modelName,
    enableCache: true,
  });
}

describe('Gemini integration', () => {
  itGemini('creates a client and runs basic inference', async () => {
    const client = createClient();

    const SupportSchema = z.object({
      intent: z.enum(['support', 'sales', 'billing', 'general']),
      urgency: z.enum(['low', 'medium', 'high']),
      summary: z.string(),
    });

    const input =
      'Customer says their bill is higher than expected and asks for quick help.';

    const result = await client.scope('gemini-basic', async (ctx) => {
      const inference = await ctx.infer(SupportSchema, input, {temperature: 0});
      const stats = ctx.getCacheStats();

      expect(stats.provider).toBe('google');
      return inference;
    });

    const parsed = SupportSchema.safeParse(result.value);
    if (!parsed.success) {
      throw parsed.error;
    }

    expect(result.__scope).toBe('gemini-basic');
    expect(result.traceId).toMatch(/^gemini-basic-/);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  itGemini('discovers active Gemini models from models.list', async () => {
    if (!geminiApiKey) {
      throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
    }

    const models = await listGeminiModelsCached({
      apiKey: geminiApiKey,
      pageSize: 100,
      forceRefresh: true,
    });

    expect(models.length).toBeGreaterThan(0);
    expect(models.some((model) => model.id === GEMINI_MODEL)).toBe(true);
    expect(
      models.some((model) =>
        model.supportedGenerationMethods.includes('generateContent'),
      ),
    ).toBe(true);
  });
});
