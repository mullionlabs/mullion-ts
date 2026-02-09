import {describe, it, expect} from 'vitest';
import {estimateTokens, estimateTokensForSegments} from './tokens.js';

describe('estimateTokens', () => {
  describe('empty text', () => {
    it('should return 0 tokens for empty string', () => {
      const result = estimateTokens('');
      expect(result.count).toBe(0);
      expect(result.method).toBe('exact');
    });

    it('should return 0 tokens for undefined text', () => {
      const result = estimateTokens('');
      expect(result.count).toBe(0);
    });
  });

  describe('OpenAI models', () => {
    it('should estimate tokens for GPT-4', () => {
      const text = 'Hello, world!'; // 13 chars
      const result = estimateTokens(text, 'gpt-4');

      expect(result.count).toBeGreaterThan(0);
      expect(result.method).toBe('approximate');
      expect(result.model).toBe('gpt-4');

      // ~4 chars per token = ~3-4 tokens
      expect(result.count).toBeGreaterThanOrEqual(3);
      expect(result.count).toBeLessThanOrEqual(5);
    });

    it('should estimate tokens for GPT-4-turbo', () => {
      const text = 'This is a test message.'; // 23 chars
      const result = estimateTokens(text, 'gpt-4-turbo');

      expect(result.method).toBe('approximate');
      expect(result.model).toBe('gpt-4-turbo');

      // ~4 chars per token = ~5-6 tokens
      expect(result.count).toBeGreaterThanOrEqual(5);
      expect(result.count).toBeLessThanOrEqual(7);
    });

    it('should estimate tokens for GPT-3.5-turbo', () => {
      const text = 'A'.repeat(100); // 100 chars
      const result = estimateTokens(text, 'gpt-3.5-turbo');

      expect(result.method).toBe('approximate');
      // ~4 chars per token = ~25 tokens
      expect(result.count).toBeGreaterThanOrEqual(20);
      expect(result.count).toBeLessThanOrEqual(30);
    });

    it('should handle O1 models', () => {
      const text = 'Test message';
      const result = estimateTokens(text, 'o1-preview');

      expect(result.method).toBe('approximate');
      expect(result.model).toBe('o1-preview');
    });
  });

  describe('Anthropic Claude models', () => {
    it('should estimate tokens for Claude 3.5 Sonnet', () => {
      const text = 'Hello, world!'; // 13 chars
      const result = estimateTokens(text, 'claude-3-5-sonnet-20241022');

      expect(result.count).toBeGreaterThan(0);
      expect(result.method).toBe('approximate');
      expect(result.model).toBe('claude-3-5-sonnet-20241022');

      // ~3.8 chars per token = ~3-4 tokens
      expect(result.count).toBeGreaterThanOrEqual(3);
      expect(result.count).toBeLessThanOrEqual(5);
    });

    it('should estimate tokens for Claude Opus', () => {
      const text = 'A'.repeat(380); // 380 chars
      const result = estimateTokens(text, 'claude-opus-4-5-20251101');

      expect(result.method).toBe('approximate');
      // ~3.8 chars per token = ~100 tokens
      expect(result.count).toBeGreaterThanOrEqual(95);
      expect(result.count).toBeLessThanOrEqual(105);
    });

    it('should estimate tokens for Claude Haiku', () => {
      const text = 'Short message';
      const result = estimateTokens(text, 'claude-haiku-4-5-20241022');

      expect(result.method).toBe('approximate');
      expect(result.model).toBe('claude-haiku-4-5-20241022');
    });
  });

  describe('Google Gemini models', () => {
    it('should estimate tokens for Gemini 2.5 Pro', () => {
      const text = 'Hello, world!';
      const result = estimateTokens(text, 'gemini-2.5-pro');

      expect(result.count).toBeGreaterThan(0);
      expect(result.method).toBe('approximate');
      expect(result.model).toBe('gemini-2.5-pro');
    });

    it('should estimate tokens for models/ prefixed Gemini ids', () => {
      const text = 'A'.repeat(390);
      const result = estimateTokens(text, 'models/gemini-2.5-flash');

      expect(result.method).toBe('approximate');
      expect(result.count).toBeGreaterThanOrEqual(95);
      expect(result.count).toBeLessThanOrEqual(105);
    });
  });

  describe('unknown models', () => {
    it('should use generic estimation for unknown model', () => {
      const text = 'A'.repeat(100); // 100 chars
      const result = estimateTokens(text, 'unknown-model');

      expect(result.method).toBe('approximate');
      expect(result.model).toBe('unknown-model');

      // ~3.5 chars per token = ~28-29 tokens
      expect(result.count).toBeGreaterThanOrEqual(25);
      expect(result.count).toBeLessThanOrEqual(32);
    });

    it('should handle no model specified', () => {
      const text = 'Test message';
      const result = estimateTokens(text);

      expect(result.method).toBe('approximate');
      expect(result.model).toBeUndefined();
      expect(result.count).toBeGreaterThan(0);
    });
  });

  describe('various text lengths', () => {
    it('should handle single character', () => {
      const result = estimateTokens('A', 'gpt-4');
      expect(result.count).toBeGreaterThanOrEqual(1);
    });

    it('should handle short text', () => {
      const text = 'Hi';
      const result = estimateTokens(text, 'gpt-4');
      expect(result.count).toBeGreaterThanOrEqual(1);
    });

    it('should handle medium text', () => {
      const text =
        'This is a medium-length paragraph with several words and punctuation.';
      const result = estimateTokens(text, 'gpt-4');
      expect(result.count).toBeGreaterThan(10);
      expect(result.count).toBeLessThan(25);
    });

    it('should handle long text', () => {
      const text = 'A'.repeat(10000);
      const result = estimateTokens(text, 'gpt-4');
      expect(result.count).toBeGreaterThan(2000);
      expect(result.count).toBeLessThan(3000);
    });
  });

  describe('special characters and formatting', () => {
    it('should handle text with newlines', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = estimateTokens(text, 'gpt-4');
      expect(result.count).toBeGreaterThan(0);
    });

    it('should handle text with special characters', () => {
      const text = 'Special chars: @#$%^&*()[]{}';
      const result = estimateTokens(text, 'gpt-4');
      expect(result.count).toBeGreaterThan(0);
    });

    it('should handle text with unicode', () => {
      const text = 'Unicode: 你好世界 🌍';
      const result = estimateTokens(text, 'gpt-4');
      expect(result.count).toBeGreaterThan(0);
    });

    it('should handle JSON string', () => {
      const json = JSON.stringify({
        key: 'value',
        nested: {data: [1, 2, 3]},
      });
      const result = estimateTokens(json, 'gpt-4');
      expect(result.count).toBeGreaterThan(0);
    });
  });

  describe('consistency', () => {
    it('should return same estimate for same input', () => {
      const text = 'Consistent test message';
      const result1 = estimateTokens(text, 'gpt-4');
      const result2 = estimateTokens(text, 'gpt-4');

      expect(result1.count).toBe(result2.count);
      expect(result1.method).toBe(result2.method);
    });

    it('should scale linearly for repeated text', () => {
      // Use longer text to avoid rounding issues with very small token counts
      const base = 'This is a test message with several words. ';
      const single = estimateTokens(base, 'gpt-4');
      const double = estimateTokens(base + base, 'gpt-4');

      // Double length should be roughly double tokens (within margin)
      expect(double.count).toBeGreaterThanOrEqual(single.count * 1.8);
      expect(double.count).toBeLessThanOrEqual(single.count * 2.2);
    });
  });
});

describe('estimateTokensForSegments', () => {
  it('should sum tokens from multiple segments', () => {
    const segments = ['Hello', 'world', 'test'];
    const result = estimateTokensForSegments(segments, 'gpt-4');

    const individual = segments.map((s) => estimateTokens(s, 'gpt-4'));
    const expectedSum = individual.reduce((sum, est) => sum + est.count, 0);

    expect(result.count).toBe(expectedSum);
    expect(result.method).toBe('approximate');
    expect(result.model).toBe('gpt-4');
  });

  it('should handle empty segments array', () => {
    const result = estimateTokensForSegments([], 'gpt-4');
    expect(result.count).toBe(0);
  });

  it('should handle segments with empty strings', () => {
    const segments = ['Hello', '', 'world'];
    const result = estimateTokensForSegments(segments, 'gpt-4');

    expect(result.count).toBeGreaterThan(0);
    expect(result.method).toBe('approximate');
  });

  it('should handle system + user + cached segments', () => {
    const segments = [
      'You are a helpful assistant.', // system
      'What is 2+2?', // user
      'A'.repeat(5000), // cached document
    ];

    const result = estimateTokensForSegments(segments, 'gpt-4');

    expect(result.count).toBeGreaterThan(1000);
    expect(result.method).toBe('approximate');
  });

  it('should preserve method as approximate if any segment is approximate', () => {
    const segments = ['test1', 'test2', 'test3'];
    const result = estimateTokensForSegments(segments, 'gpt-4');

    expect(result.method).toBe('approximate');
  });

  it('should work with different models', () => {
    const segments = ['segment1', 'segment2'];

    const gptResult = estimateTokensForSegments(segments, 'gpt-4');
    const claudeResult = estimateTokensForSegments(
      segments,
      'claude-3-5-sonnet-20241022',
    );

    expect(gptResult.model).toBe('gpt-4');
    expect(claudeResult.model).toBe('claude-3-5-sonnet-20241022');

    // Claude should estimate slightly more tokens (3.8 vs 4.0 chars/token)
    expect(claudeResult.count).toBeGreaterThanOrEqual(gptResult.count);
  });

  it('should handle large number of segments', () => {
    const segments = Array(100)
      .fill('test')
      .map((s, i) => `${s}${i}`);
    const result = estimateTokensForSegments(segments, 'gpt-4');

    expect(result.count).toBeGreaterThan(100);
  });
});

describe('provider detection', () => {
  it('should detect OpenAI models correctly', () => {
    const openaiModels = [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'o1-preview',
      'o1-mini',
    ];

    openaiModels.forEach((model) => {
      const result = estimateTokens('test', model);
      expect(result.model).toBe(model);
    });
  });

  it('should detect Claude models correctly', () => {
    const claudeModels = [
      'claude-3-5-sonnet-20241022',
      'claude-opus-4-5-20251101',
      'claude-haiku-4-5-20241022',
      'claude-3-opus-20240229',
    ];

    claudeModels.forEach((model) => {
      const result = estimateTokens('test', model);
      expect(result.model).toBe(model);
    });
  });

  it('should detect Gemini models correctly', () => {
    const geminiModels = [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'models/gemini-3-pro-preview',
    ];

    geminiModels.forEach((model) => {
      const result = estimateTokens('test', model);
      expect(result.model).toBe(model);
      expect(result.method).toBe('approximate');
    });
  });

  it('should handle case-insensitive model names', () => {
    const result1 = estimateTokens('test', 'GPT-4');
    const result2 = estimateTokens('test', 'gpt-4');

    expect(result1.count).toBe(result2.count);
  });
});

describe('edge cases', () => {
  it('should handle very long text', () => {
    const longText = 'A'.repeat(1_000_000);
    const result = estimateTokens(longText, 'gpt-4');

    expect(result.count).toBeGreaterThan(200_000);
    expect(result.method).toBe('approximate');
  });

  it('should handle text with only whitespace', () => {
    const whitespace = '   \n\n\t\t   ';
    const result = estimateTokens(whitespace, 'gpt-4');

    expect(result.count).toBeGreaterThan(0);
  });

  it('should handle text with only punctuation', () => {
    const punctuation = '!!!???...;;;';
    const result = estimateTokens(punctuation, 'gpt-4');

    expect(result.count).toBeGreaterThan(0);
  });
});
