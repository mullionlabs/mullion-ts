import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createOwned, isOwned, ownedSchema, type Owned } from './owned.js';

describe('Owned', () => {
  describe('createOwned', () => {
    it('should create an Owned value with all required fields', () => {
      const owned = createOwned({
        value: 'test-value',
        scope: 'test-scope',
      });

      expect(owned.value).toBe('test-value');
      expect(owned.__scope).toBe('test-scope');
      expect(owned.confidence).toBe(1.0); // Default confidence
      expect(owned.traceId).toMatch(/^trace-/);
    });

    it('should use custom confidence when provided', () => {
      const owned = createOwned({
        value: 42,
        scope: 'number-scope',
        confidence: 0.75,
      });

      expect(owned.confidence).toBe(0.75);
    });

    it('should use custom traceId when provided', () => {
      const customTraceId = 'custom-trace-123';
      const owned = createOwned({
        value: { data: 'test' },
        scope: 'custom-scope',
        traceId: customTraceId,
      });

      expect(owned.traceId).toBe(customTraceId);
    });

    it('should throw error for confidence < 0', () => {
      expect(() =>
        createOwned({
          value: 'test',
          scope: 'test-scope',
          confidence: -0.1,
        })
      ).toThrow('Confidence must be between 0 and 1');
    });

    it('should throw error for confidence > 1', () => {
      expect(() =>
        createOwned({
          value: 'test',
          scope: 'test-scope',
          confidence: 1.5,
        })
      ).toThrow('Confidence must be between 0 and 1');
    });

    it('should accept confidence at boundary values', () => {
      const min = createOwned({
        value: 'test',
        scope: 'test-scope',
        confidence: 0,
      });
      const max = createOwned({
        value: 'test',
        scope: 'test-scope',
        confidence: 1,
      });

      expect(min.confidence).toBe(0);
      expect(max.confidence).toBe(1);
    });

    it('should work with complex object types', () => {
      interface User {
        id: number;
        name: string;
      }

      const owned = createOwned<User, 'admin'>({
        value: { id: 1, name: 'Alice' },
        scope: 'admin',
        confidence: 0.99,
      });

      expect(owned.value).toEqual({ id: 1, name: 'Alice' });
      expect(owned.__scope).toBe('admin');
    });

    it('should generate unique trace IDs', () => {
      const owned1 = createOwned({ value: 'test1', scope: 'scope1' });
      const owned2 = createOwned({ value: 'test2', scope: 'scope2' });

      expect(owned1.traceId).not.toBe(owned2.traceId);
    });
  });

  describe('isOwned', () => {
    it('should return true for valid Owned objects', () => {
      const owned = createOwned({
        value: 'test',
        scope: 'test-scope',
      });

      expect(isOwned(owned)).toBe(true);
    });

    it('should return true for manually constructed Owned objects', () => {
      const owned: Owned<string, 'manual'> = {
        value: 'test',
        confidence: 0.8,
        __scope: 'manual',
        traceId: 'manual-trace',
      };

      expect(isOwned(owned)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isOwned(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isOwned(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isOwned('string')).toBe(false);
      expect(isOwned(42)).toBe(false);
      expect(isOwned(true)).toBe(false);
    });

    it('should return false for objects missing value field', () => {
      const invalid = {
        confidence: 0.9,
        __scope: 'test',
        traceId: 'trace-123',
      };

      expect(isOwned(invalid)).toBe(false);
    });

    it('should return false for objects missing confidence field', () => {
      const invalid = {
        value: 'test',
        __scope: 'test',
        traceId: 'trace-123',
      };

      expect(isOwned(invalid)).toBe(false);
    });

    it('should return false for objects missing __scope field', () => {
      const invalid = {
        value: 'test',
        confidence: 0.9,
        traceId: 'trace-123',
      };

      expect(isOwned(invalid)).toBe(false);
    });

    it('should return false for objects missing traceId field', () => {
      const invalid = {
        value: 'test',
        confidence: 0.9,
        __scope: 'test',
      };

      expect(isOwned(invalid)).toBe(false);
    });

    it('should return false for objects with wrong field types', () => {
      const invalidConfidence = {
        value: 'test',
        confidence: 'not-a-number',
        __scope: 'test',
        traceId: 'trace-123',
      };

      const invalidScope = {
        value: 'test',
        confidence: 0.9,
        __scope: 123,
        traceId: 'trace-123',
      };

      const invalidTraceId = {
        value: 'test',
        confidence: 0.9,
        __scope: 'test',
        traceId: 456,
      };

      expect(isOwned(invalidConfidence)).toBe(false);
      expect(isOwned(invalidScope)).toBe(false);
      expect(isOwned(invalidTraceId)).toBe(false);
    });

    it('should work as type guard in conditional blocks', () => {
      const maybeOwned: unknown = createOwned({
        value: 'test',
        scope: 'test-scope',
      });

      if (isOwned(maybeOwned)) {
        // TypeScript should know this is Owned<unknown, string>
        expect(typeof maybeOwned.confidence).toBe('number');
        expect(typeof maybeOwned.__scope).toBe('string');
        expect(typeof maybeOwned.traceId).toBe('string');
      }
    });
  });

  describe('ownedSchema', () => {
    it('should validate valid Owned objects with string value', () => {
      const schema = ownedSchema(z.string());
      const owned = createOwned({
        value: 'test-string',
        scope: 'test-scope',
      });

      const result = schema.safeParse(owned);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBe('test-string');
      }
    });

    it('should validate valid Owned objects with complex value types', () => {
      const UserSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
      });

      const schema = ownedSchema(UserSchema);
      const owned = createOwned({
        value: { id: 1, name: 'Alice', email: 'alice@example.com' },
        scope: 'admin',
      });

      const result = schema.safeParse(owned);
      expect(result.success).toBe(true);
    });

    it('should reject invalid value types', () => {
      const schema = ownedSchema(z.number());
      const owned = createOwned({
        value: 'not-a-number',
        scope: 'test-scope',
      });

      const result = schema.safeParse(owned);
      expect(result.success).toBe(false);
    });

    it('should reject confidence outside [0,1] range', () => {
      const schema = ownedSchema(z.string());
      const invalid = {
        value: 'test',
        confidence: 1.5,
        __scope: 'test',
        traceId: 'trace-123',
      };

      const result = schema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate with custom scope schema', () => {
      const schema = ownedSchema(z.string(), z.literal('admin'));

      const validOwned = createOwned({
        value: 'admin-data',
        scope: 'admin' as const,
      });

      const result = schema.safeParse(validOwned);
      expect(result.success).toBe(true);
    });

    it('should reject scope that does not match literal schema', () => {
      const schema = ownedSchema(z.string(), z.literal('admin'));

      const invalidOwned = createOwned({
        value: 'data',
        scope: 'user', // Wrong scope
      });

      const result = schema.safeParse(invalidOwned);
      expect(result.success).toBe(false);
    });

    it('should validate scope with union schema', () => {
      const schema = ownedSchema(
        z.string(),
        z.union([z.literal('admin'), z.literal('user')])
      );

      const adminOwned = createOwned({
        value: 'admin-data',
        scope: 'admin' as const,
      });

      const userOwned = createOwned({
        value: 'user-data',
        scope: 'user' as const,
      });

      expect(schema.safeParse(adminOwned).success).toBe(true);
      expect(schema.safeParse(userOwned).success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const schema = ownedSchema(z.string());

      const missingValue = {
        confidence: 0.9,
        __scope: 'test',
        traceId: 'trace-123',
      };

      const missingConfidence = {
        value: 'test',
        __scope: 'test',
        traceId: 'trace-123',
      };

      expect(schema.safeParse(missingValue).success).toBe(false);
      expect(schema.safeParse(missingConfidence).success).toBe(false);
    });
  });

  describe('Type safety', () => {
    it('should enforce scope type at compile time', () => {
      type AdminScope = 'admin';
      type UserScope = 'user';

      const adminData: Owned<string, AdminScope> = createOwned({
        value: 'admin-secret',
        scope: 'admin' as const,
      });

      const userData: Owned<string, UserScope> = createOwned({
        value: 'user-data',
        scope: 'user' as const,
      });

      // These should be different types
      expect(adminData.__scope).toBe('admin');
      expect(userData.__scope).toBe('user');

      // TypeScript prevents: const mixed: Owned<string, AdminScope> = userData;
    });
  });
});
