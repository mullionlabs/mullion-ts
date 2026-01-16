import {describe, it, expect} from 'vitest';
import {z} from 'zod';
import {
  createSemanticValue,
  isSemanticValue,
  semanticValueSchema,
  alternativeSchema,
  type SemanticValue,
  type Alternative,
} from './semantic-value.js';

describe('SemanticValue', () => {
  describe('createSemanticValue', () => {
    it('should create a SemanticValue with all required fields', () => {
      const semantic = createSemanticValue({
        value: 'test-value',
        scope: 'test-scope',
      });

      expect(semantic.value).toBe('test-value');
      expect(semantic.__scope).toBe('test-scope');
      expect(semantic.confidence).toBe(1.0);
      expect(semantic.traceId).toMatch(/^trace-/);
      expect(semantic.alternatives).toEqual([]);
      expect(semantic.reasoning).toBe('');
    });

    it('should create a SemanticValue with custom confidence', () => {
      const semantic = createSemanticValue({
        value: 42,
        scope: 'numbers',
        confidence: 0.75,
      });

      expect(semantic.confidence).toBe(0.75);
    });

    it('should create a SemanticValue with alternatives', () => {
      const alternatives: Alternative<string>[] = [
        {value: 'alt1', confidence: 0.8},
        {value: 'alt2', confidence: 0.6},
      ];

      const semantic = createSemanticValue({
        value: 'primary',
        scope: 'test',
        alternatives,
      });

      expect(semantic.alternatives).toEqual(alternatives);
      expect(semantic.alternatives.length).toBe(2);
    });

    it('should create a SemanticValue with reasoning', () => {
      const reasoning = 'This is the reasoning for choosing this value';

      const semantic = createSemanticValue({
        value: 'chosen',
        scope: 'test',
        reasoning,
      });

      expect(semantic.reasoning).toBe(reasoning);
    });

    it('should create a SemanticValue with custom trace ID', () => {
      const customTraceId = 'custom-trace-123';

      const semantic = createSemanticValue({
        value: 'value',
        scope: 'test',
        traceId: customTraceId,
      });

      expect(semantic.traceId).toBe(customTraceId);
    });

    it('should create a SemanticValue with all custom fields', () => {
      const semantic = createSemanticValue({
        value: {action: 'refund', amount: 50},
        scope: 'customer-support',
        confidence: 0.85,
        alternatives: [
          {value: {action: 'exchange', amount: 50}, confidence: 0.7},
          {value: {action: 'credit', amount: 50}, confidence: 0.6},
        ],
        reasoning: 'Customer explicitly mentioned "refund"',
        traceId: 'support-trace-456',
      });

      expect(semantic.value).toEqual({action: 'refund', amount: 50});
      expect(semantic.__scope).toBe('customer-support');
      expect(semantic.confidence).toBe(0.85);
      expect(semantic.alternatives.length).toBe(2);
      expect(semantic.reasoning).toBe('Customer explicitly mentioned "refund"');
      expect(semantic.traceId).toBe('support-trace-456');
    });

    it('should throw error for confidence below 0', () => {
      expect(() =>
        createSemanticValue({
          value: 'test',
          scope: 'test',
          confidence: -0.1,
        }),
      ).toThrow('Confidence must be between 0 and 1, got -0.1');
    });

    it('should throw error for confidence above 1', () => {
      expect(() =>
        createSemanticValue({
          value: 'test',
          scope: 'test',
          confidence: 1.5,
        }),
      ).toThrow('Confidence must be between 0 and 1, got 1.5');
    });

    it('should throw error for alternative confidence below 0', () => {
      expect(() =>
        createSemanticValue({
          value: 'primary',
          scope: 'test',
          alternatives: [{value: 'alt', confidence: -0.2}],
        }),
      ).toThrow('Alternative confidence must be between 0 and 1, got -0.2');
    });

    it('should throw error for alternative confidence above 1', () => {
      expect(() =>
        createSemanticValue({
          value: 'primary',
          scope: 'test',
          alternatives: [{value: 'alt', confidence: 1.1}],
        }),
      ).toThrow('Alternative confidence must be between 0 and 1, got 1.1');
    });

    it('should accept confidence of exactly 0', () => {
      const semantic = createSemanticValue({
        value: 'test',
        scope: 'test',
        confidence: 0,
      });

      expect(semantic.confidence).toBe(0);
    });

    it('should accept confidence of exactly 1', () => {
      const semantic = createSemanticValue({
        value: 'test',
        scope: 'test',
        confidence: 1,
      });

      expect(semantic.confidence).toBe(1);
    });

    it('should handle complex nested value types', () => {
      interface ComplexType {
        id: number;
        name: string;
        tags: string[];
        metadata: Record<string, unknown>;
      }

      const complexValue: ComplexType = {
        id: 123,
        name: 'Test',
        tags: ['a', 'b', 'c'],
        metadata: {key: 'value', nested: {deep: true}},
      };

      const semantic = createSemanticValue({
        value: complexValue,
        scope: 'complex-scope',
      });

      expect(semantic.value).toEqual(complexValue);
    });
  });

  describe('isSemanticValue', () => {
    it('should return true for valid SemanticValue', () => {
      const semantic = createSemanticValue({
        value: 'test',
        scope: 'test',
      });

      expect(isSemanticValue(semantic)).toBe(true);
    });

    it('should return true for SemanticValue with alternatives', () => {
      const semantic = createSemanticValue({
        value: 'primary',
        scope: 'test',
        alternatives: [{value: 'alt', confidence: 0.5}],
      });

      expect(isSemanticValue(semantic)).toBe(true);
    });

    it('should return true for SemanticValue with reasoning', () => {
      const semantic = createSemanticValue({
        value: 'test',
        scope: 'test',
        reasoning: 'Because reasons',
      });

      expect(isSemanticValue(semantic)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isSemanticValue(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSemanticValue(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isSemanticValue(42)).toBe(false);
      expect(isSemanticValue('string')).toBe(false);
      expect(isSemanticValue(true)).toBe(false);
    });

    it('should return false for object missing value field', () => {
      expect(
        isSemanticValue({
          confidence: 0.9,
          __scope: 'test',
          traceId: 'trace-1',
          alternatives: [],
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object missing confidence field', () => {
      expect(
        isSemanticValue({
          value: 'test',
          __scope: 'test',
          traceId: 'trace-1',
          alternatives: [],
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object with non-number confidence', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: '0.9',
          __scope: 'test',
          traceId: 'trace-1',
          alternatives: [],
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object missing __scope field', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: 0.9,
          traceId: 'trace-1',
          alternatives: [],
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object with non-string __scope', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: 0.9,
          __scope: 123,
          traceId: 'trace-1',
          alternatives: [],
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object missing traceId field', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: 0.9,
          __scope: 'test',
          alternatives: [],
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object with non-string traceId', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: 0.9,
          __scope: 'test',
          traceId: 123,
          alternatives: [],
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object missing alternatives field', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: 0.9,
          __scope: 'test',
          traceId: 'trace-1',
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object with non-array alternatives', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: 0.9,
          __scope: 'test',
          traceId: 'trace-1',
          alternatives: 'not-an-array',
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object with invalid alternative structure', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: 0.9,
          __scope: 'test',
          traceId: 'trace-1',
          alternatives: [{value: 'alt'}], // missing confidence
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object with alternative missing value', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: 0.9,
          __scope: 'test',
          traceId: 'trace-1',
          alternatives: [{confidence: 0.5}], // missing value
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object with alternative non-number confidence', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: 0.9,
          __scope: 'test',
          traceId: 'trace-1',
          alternatives: [{value: 'alt', confidence: '0.5'}],
          reasoning: '',
        }),
      ).toBe(false);
    });

    it('should return false for object missing reasoning field', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: 0.9,
          __scope: 'test',
          traceId: 'trace-1',
          alternatives: [],
        }),
      ).toBe(false);
    });

    it('should return false for object with non-string reasoning', () => {
      expect(
        isSemanticValue({
          value: 'test',
          confidence: 0.9,
          __scope: 'test',
          traceId: 'trace-1',
          alternatives: [],
          reasoning: 123,
        }),
      ).toBe(false);
    });
  });

  describe('alternativeSchema', () => {
    it('should validate correct alternative structure', () => {
      const schema = alternativeSchema(z.string());

      const result = schema.safeParse({
        value: 'test',
        confidence: 0.75,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBe('test');
        expect(result.data.confidence).toBe(0.75);
      }
    });

    it('should reject alternative with missing value', () => {
      const schema = alternativeSchema(z.string());

      const result = schema.safeParse({
        confidence: 0.75,
      });

      expect(result.success).toBe(false);
    });

    it('should reject alternative with missing confidence', () => {
      const schema = alternativeSchema(z.string());

      const result = schema.safeParse({
        value: 'test',
      });

      expect(result.success).toBe(false);
    });

    it('should reject alternative with confidence below 0', () => {
      const schema = alternativeSchema(z.string());

      const result = schema.safeParse({
        value: 'test',
        confidence: -0.1,
      });

      expect(result.success).toBe(false);
    });

    it('should reject alternative with confidence above 1', () => {
      const schema = alternativeSchema(z.string());

      const result = schema.safeParse({
        value: 'test',
        confidence: 1.5,
      });

      expect(result.success).toBe(false);
    });

    it('should work with complex value schemas', () => {
      const ValueSchema = z.object({
        id: z.number(),
        name: z.string(),
      });

      const schema = alternativeSchema(ValueSchema);

      const result = schema.safeParse({
        value: {id: 123, name: 'Test'},
        confidence: 0.9,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('semanticValueSchema', () => {
    it('should validate correct SemanticValue structure', () => {
      const schema = semanticValueSchema(z.string());

      const result = schema.safeParse({
        value: 'test',
        confidence: 0.9,
        __scope: 'test-scope',
        traceId: 'trace-123',
        alternatives: [],
        reasoning: 'Test reasoning',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBe('test');
        expect(result.data.alternatives).toEqual([]);
        expect(result.data.reasoning).toBe('Test reasoning');
      }
    });

    it('should validate SemanticValue with alternatives', () => {
      const schema = semanticValueSchema(z.string());

      const result = schema.safeParse({
        value: 'primary',
        confidence: 0.9,
        __scope: 'test',
        traceId: 'trace-123',
        alternatives: [
          {value: 'alt1', confidence: 0.7},
          {value: 'alt2', confidence: 0.5},
        ],
        reasoning: 'Reasoning',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alternatives.length).toBe(2);
        expect(result.data.alternatives[0].value).toBe('alt1');
      }
    });

    it('should validate with literal scope type', () => {
      const schema = semanticValueSchema(z.string(), z.literal('admin'));

      const result = schema.safeParse({
        value: 'test',
        confidence: 0.9,
        __scope: 'admin',
        traceId: 'trace-123',
        alternatives: [],
        reasoning: '',
      });

      expect(result.success).toBe(true);
    });

    it('should reject literal scope type mismatch', () => {
      const schema = semanticValueSchema(z.string(), z.literal('admin'));

      const result = schema.safeParse({
        value: 'test',
        confidence: 0.9,
        __scope: 'customer',
        traceId: 'trace-123',
        alternatives: [],
        reasoning: '',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing alternatives field', () => {
      const schema = semanticValueSchema(z.string());

      const result = schema.safeParse({
        value: 'test',
        confidence: 0.9,
        __scope: 'test',
        traceId: 'trace-123',
        reasoning: '',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing reasoning field', () => {
      const schema = semanticValueSchema(z.string());

      const result = schema.safeParse({
        value: 'test',
        confidence: 0.9,
        __scope: 'test',
        traceId: 'trace-123',
        alternatives: [],
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid alternative in array', () => {
      const schema = semanticValueSchema(z.string());

      const result = schema.safeParse({
        value: 'test',
        confidence: 0.9,
        __scope: 'test',
        traceId: 'trace-123',
        alternatives: [{value: 'alt'}], // missing confidence
        reasoning: '',
      });

      expect(result.success).toBe(false);
    });

    it('should work with complex value types', () => {
      const ValueSchema = z.object({
        action: z.enum(['refund', 'exchange', 'credit']),
        amount: z.number(),
      });

      const schema = semanticValueSchema(
        ValueSchema,
        z.literal('customer-support'),
      );

      const result = schema.safeParse({
        value: {action: 'refund', amount: 50},
        confidence: 0.85,
        __scope: 'customer-support',
        traceId: 'trace-456',
        alternatives: [
          {value: {action: 'exchange', amount: 50}, confidence: 0.7},
        ],
        reasoning: 'Customer mentioned refund',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value.action).toBe('refund');
        expect(result.data.value.amount).toBe(50);
      }
    });
  });

  describe('Type Safety', () => {
    it('should maintain scope type in SemanticValue', () => {
      const semantic: SemanticValue<string, 'admin'> = createSemanticValue({
        value: 'test',
        scope: 'admin',
      });

      // This line should compile (same scope)
      const sameScope: SemanticValue<string, 'admin'> = semantic;
      expect(sameScope.__scope).toBe('admin');

      // TypeScript would error on this (different scope):
      // const differentScope: SemanticValue<string, 'customer'> = semantic;
    });

    it('should maintain value type in SemanticValue', () => {
      interface UserData {
        id: number;
        name: string;
      }

      const semantic: SemanticValue<UserData, 'users'> = createSemanticValue({
        value: {id: 1, name: 'Alice'},
        scope: 'users',
      });

      // TypeScript knows the exact type
      const userId: number = semantic.value.id;
      const userName: string = semantic.value.name;

      expect(userId).toBe(1);
      expect(userName).toBe('Alice');
    });

    it('should maintain alternative types', () => {
      const semantic = createSemanticValue({
        value: 'primary',
        scope: 'test',
        alternatives: [
          {value: 'alt1', confidence: 0.8},
          {value: 'alt2', confidence: 0.6},
        ],
      });

      // TypeScript knows alternatives have same type as value
      const alt: string = semantic.alternatives[0].value;
      expect(alt).toBe('alt1');
    });
  });
});
