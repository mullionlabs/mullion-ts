import { describe, it, expect } from 'vitest';
import { scope } from './scope.js';
import type { Owned } from './owned.js';
import { createOwned } from './owned.js';

describe('scope', () => {
  describe('Basic Functionality', () => {
    it('should execute the scoped function and return its result', async () => {
      const result = await scope('test', async (ctx) => {
        expect(ctx.scope).toBe('test');
        return 'hello';
      });

      expect(result).toBe('hello');
    });

    it('should provide context with correct scope identifier', async () => {
      await scope('my-scope', async (ctx) => {
        expect(ctx.scope).toBe('my-scope');
        expect(typeof ctx.scope).toBe('string');
      });
    });

    it('should handle async operations', async () => {
      const result = await scope('async-test', async (ctx) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { scope: ctx.scope, data: 42 };
      });

      expect(result).toEqual({ scope: 'async-test', data: 42 });
    });

    it('should return values of different types', async () => {
      const stringResult = await scope('test1', async () => 'string');
      expect(stringResult).toBe('string');

      const numberResult = await scope('test2', async () => 123);
      expect(numberResult).toBe(123);

      const objectResult = await scope('test3', async () => ({ foo: 'bar' }));
      expect(objectResult).toEqual({ foo: 'bar' });

      const arrayResult = await scope('test4', async () => [1, 2, 3]);
      expect(arrayResult).toEqual([1, 2, 3]);
    });
  });

  describe('Context.bridge()', () => {
    it('should bridge value from another scope', async () => {
      const sourceValue: Owned<string, 'source'> = createOwned({
        value: 'data',
        scope: 'source',
        confidence: 0.9,
      });

      await scope('target', async (ctx) => {
        const bridged = ctx.bridge(sourceValue);

        expect(bridged.value).toBe('data');
        expect(bridged.confidence).toBe(0.9);
        expect(bridged.__scope).toBe('target');
        expect(bridged.traceId).toBe(sourceValue.traceId);
      });
    });

    it('should maintain original trace ID when bridging', async () => {
      const sourceValue: Owned<number, 'scope1'> = createOwned({
        value: 42,
        scope: 'scope1',
        traceId: 'original-trace-123',
      });

      await scope('scope2', async (ctx) => {
        const bridged = ctx.bridge(sourceValue);
        expect(bridged.traceId).toBe('original-trace-123');
      });
    });

    it('should preserve value and confidence when bridging', async () => {
      const sourceValue: Owned<{ data: string }, 'admin'> = createOwned({
        value: { data: 'sensitive' },
        scope: 'admin',
        confidence: 0.75,
      });

      await scope('audit', async (ctx) => {
        const bridged = ctx.bridge(sourceValue);

        expect(bridged.value).toEqual({ data: 'sensitive' });
        expect(bridged.confidence).toBe(0.75);
      });
    });

    it('should allow bridging between multiple scopes', async () => {
      const value1: Owned<string, 'scope1'> = createOwned({
        value: 'data',
        scope: 'scope1',
      });

      const bridged1 = await scope('scope2', async (ctx) => {
        return ctx.bridge(value1);
      });

      await scope('scope3', async (ctx) => {
        const bridged2 = ctx.bridge(bridged1);
        expect(bridged2.value).toBe('data');
      });
    });
  });

  describe('Context.use()', () => {
    it('should extract value from Owned when scope matches', async () => {
      await scope('test-scope', async (ctx) => {
        const owned: Owned<string, 'test-scope'> = createOwned({
          value: 'hello',
          scope: 'test-scope',
        });

        const extracted = ctx.use(owned);
        expect(extracted).toBe('hello');
      });
    });

    it('should throw error when scope does not match', async () => {
      const wrongScopeValue: Owned<string, 'other-scope'> = createOwned({
        value: 'data',
        scope: 'other-scope',
      });

      await scope('test-scope', async (ctx) => {
        expect(() => {
          // @ts-expect-error - Testing runtime behavior with mismatched scope
          ctx.use(wrongScopeValue);
        }).toThrow(/Scope mismatch/);
      });
    });

    it('should provide helpful error message on scope mismatch', async () => {
      const otherValue: Owned<number, 'admin'> = createOwned({
        value: 42,
        scope: 'admin',
      });

      await scope('user', async (ctx) => {
        expect(() => {
          // @ts-expect-error - Testing runtime error message
          ctx.use(otherValue);
        }).toThrow(
          "Scope mismatch: attempting to use value from scope 'admin' " +
            "in scope 'user'. Use bridge() to explicitly transfer values between scopes."
        );
      });
    });

    it('should work with bridged values', async () => {
      const originalValue: Owned<string, 'scope1'> = createOwned({
        value: 'test',
        scope: 'scope1',
      });

      await scope('scope2', async (ctx) => {
        const bridged = ctx.bridge(originalValue);

        // This should work because bridged has scope 'scope2' (union type)
        const extracted = ctx.use(bridged);
        expect(extracted).toBe('test');
      });
    });
  });

  describe('Context.infer()', () => {
    it('should throw error indicating placeholder implementation', async () => {
      await scope('test', async (ctx) => {
        await expect(async () => {
          await ctx.infer({} as never, 'input');
        }).rejects.toThrow(/Context\.infer\(\) is not implemented/);
      });
    });

    it('should provide helpful error message about integration packages', async () => {
      await scope('test', async (ctx) => {
        try {
          await ctx.infer({} as never, 'input');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('@mullion/ai-sdk');
        }
      });
    });
  });

  describe('Nested Scopes', () => {
    it('should support nested scopes', async () => {
      const result = await scope('outer', async (outerCtx) => {
        const outerValue: Owned<number, 'outer'> = createOwned({
          value: 10,
          scope: 'outer',
        });

        const innerResult = await scope('inner', async (innerCtx) => {
          expect(innerCtx.scope).toBe('inner');
          expect(outerCtx.scope).toBe('outer');

          const bridged = innerCtx.bridge(outerValue);
          const value = innerCtx.use(bridged);
          return value * 2;
        });

        return innerResult;
      });

      expect(result).toBe(20);
    });

    it('should maintain scope isolation in nested scopes', async () => {
      await scope('parent', async () => {
        const parentValue: Owned<string, 'parent'> = createOwned({
          value: 'parent-data',
          scope: 'parent',
        });

        await scope('child', async (childCtx) => {
          // Child cannot directly use parent value without bridging
          expect(() => {
            // @ts-expect-error - Testing scope isolation
            childCtx.use(parentValue);
          }).toThrow(/Scope mismatch/);

          // Must bridge first
          const bridged = childCtx.bridge(parentValue);
          const value = childCtx.use(bridged);
          expect(value).toBe('parent-data');
        });
      });
    });

    it('should allow deeply nested scopes', async () => {
      const result = await scope('level1', async () => {
        const val1: Owned<number, 'level1'> = createOwned({
          value: 1,
          scope: 'level1',
        });

        return await scope('level2', async (ctx2) => {
          const bridged1 = ctx2.bridge(val1);
          const val2: Owned<number, 'level2'> = createOwned({
            value: ctx2.use(bridged1) + 1,
            scope: 'level2',
          });

          return await scope('level3', async (ctx3) => {
            const bridged2 = ctx3.bridge(val2);
            return ctx3.use(bridged2) + 1;
          });
        });
      });

      expect(result).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from scoped function', async () => {
      await expect(async () => {
        await scope('error-test', async () => {
          throw new Error('Test error');
        });
      }).rejects.toThrow('Test error');
    });

    it('should preserve error type and stack trace', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      await expect(async () => {
        await scope('test', async () => {
          throw new CustomError('Custom error message');
        });
      }).rejects.toThrow(CustomError);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type information for return values', async () => {
      interface TestData {
        id: number;
        name: string;
      }

      const result = await scope('typed-test', async () => {
        const data: TestData = { id: 1, name: 'test' };
        return data;
      });

      // TypeScript should infer result as TestData
      expect(result.id).toBe(1);
      expect(result.name).toBe('test');
    });

    it('should work with Owned return values', async () => {
      const result = await scope('owned-return', async () => {
        const owned: Owned<number, 'owned-return'> = createOwned({
          value: 42,
          scope: 'owned-return',
        });
        return owned;
      });

      expect(result.value).toBe(42);
      expect(result.__scope).toBe('owned-return');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty scope names', async () => {
      const result = await scope('', async (ctx) => {
        expect(ctx.scope).toBe('');
        return 'empty-scope';
      });

      expect(result).toBe('empty-scope');
    });

    it('should handle scope names with special characters', async () => {
      const scopeName = 'scope-with-dashes_and_underscores.and.dots';
      await scope(scopeName, async (_ctx) => {
        expect(_ctx.scope).toBe(scopeName);
      });
    });

    it('should handle undefined return value', async () => {
      const result = await scope('undefined-test', async () => {
        return undefined;
      });

      expect(result).toBeUndefined();
    });

    it('should handle null return value', async () => {
      const result = await scope('null-test', async () => {
        return null;
      });

      expect(result).toBeNull();
    });
  });
});
