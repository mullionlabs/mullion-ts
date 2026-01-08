import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createOwned } from '../owned.js';
import type { Context } from '../context.js';
import type { Owned } from '../owned.js';

import {
  fork,
  registerWarmupExecutor,
  clearWarmupExecutor,
  getWarmupExecutor,
} from './fork.js';
import type { WarmupExecutor, WarmupResult } from './types.js';

/**
 * Creates a mock context for testing.
 */
function createMockContext<S extends string>(scopeName: S): Context<S> {
  return {
    scope: scopeName,
    async infer<T>(): Promise<Owned<T, S>> {
      // Simple mock that returns a fake owned value
      return createOwned({
        value: { mocked: true } as T,
        scope: scopeName,
        confidence: 0.9,
      });
    },
    bridge<T, OS extends string>(owned: Owned<T, OS>): Owned<T, S | OS> {
      return {
        value: owned.value,
        confidence: owned.confidence,
        __scope: scopeName as S | OS,
        traceId: owned.traceId,
      };
    },
    use<T>(owned: Owned<T, S>): T {
      return owned.value;
    },
  };
}

describe('fork', () => {
  beforeEach(() => {
    clearWarmupExecutor();
  });

  afterEach(() => {
    clearWarmupExecutor();
  });

  describe('Basic Functionality', () => {
    it('should return empty results for empty branches array', async () => {
      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [],
      });

      expect(result.results).toEqual([]);
      expect(result.cacheStats.warmupCost).toBe(0);
      expect(result.cacheStats.branchCacheHits).toEqual([]);
      expect(result.cacheStats.totalSaved).toBe(0);
      expect(result.warnings).toEqual([]);
    });

    it('should execute single branch and return result', async () => {
      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) =>
            createOwned({
              value: { data: 'result1' },
              scope: c.scope,
              confidence: 0.9,
            }),
        ],
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].value).toEqual({ data: 'result1' });
      expect(result.results[0].confidence).toBe(0.9);
    });

    it('should execute multiple branches and return all results', async () => {
      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) =>
            createOwned({ value: 'first', scope: c.scope, confidence: 0.9 }),
          async (c) =>
            createOwned({ value: 'second', scope: c.scope, confidence: 0.8 }),
          async (c) =>
            createOwned({ value: 'third', scope: c.scope, confidence: 0.7 }),
        ],
      });

      expect(result.results).toHaveLength(3);
      expect(result.results[0].value).toBe('first');
      expect(result.results[1].value).toBe('second');
      expect(result.results[2].value).toBe('third');
    });

    it('should preserve branch order in results', async () => {
      const ctx = createMockContext('test');
      const executionOrder: number[] = [];

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) => {
            // Add slight delay to test order preservation
            await new Promise((resolve) => setTimeout(resolve, 30));
            executionOrder.push(1);
            return createOwned({ value: 1, scope: c.scope });
          },
          async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            executionOrder.push(2);
            return createOwned({ value: 2, scope: c.scope });
          },
          async (c) => {
            executionOrder.push(3);
            return createOwned({ value: 3, scope: c.scope });
          },
        ],
      });

      // Results should be in branch order, not execution completion order
      expect(result.results[0].value).toBe(1);
      expect(result.results[1].value).toBe(2);
      expect(result.results[2].value).toBe(3);

      // But execution happened in different order due to timing
      expect(executionOrder).toEqual([3, 2, 1]);
    });
  });

  describe('Fast Parallel Strategy', () => {
    it('should execute all branches in parallel', async () => {
      const ctx = createMockContext('test');
      const startTime = Date.now();

      await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return createOwned({ value: 1, scope: c.scope });
          },
          async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return createOwned({ value: 2, scope: c.scope });
          },
          async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return createOwned({ value: 3, scope: c.scope });
          },
        ],
      });

      const elapsed = Date.now() - startTime;

      // If parallel, should take ~50ms, not ~150ms
      // Allow some tolerance for test environment
      expect(elapsed).toBeLessThan(120);
    });

    it('should report zero cache stats for fast-parallel', async () => {
      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) => createOwned({ value: 1, scope: c.scope }),
          async (c) => createOwned({ value: 2, scope: c.scope }),
        ],
      });

      expect(result.cacheStats.warmupCost).toBe(0);
      expect(result.cacheStats.branchCacheHits).toEqual([0, 0]);
      expect(result.cacheStats.totalSaved).toBe(0);
    });

    it('should not generate warnings for fast-parallel', async () => {
      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [async (c) => createOwned({ value: 1, scope: c.scope })],
      });

      expect(result.warnings).toEqual([]);
    });
  });

  describe('Cache Optimized Strategy', () => {
    it('should warn when no warmup executor is registered', async () => {
      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'cache-optimized',
        branches: [async (c) => createOwned({ value: 1, scope: c.scope })],
      });

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('no warmup executor available');
      expect(result.warnings[0]).toContain('@mullion/ai-sdk');
    });

    it('should fall back to fast-parallel when no executor', async () => {
      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'cache-optimized',
        warmup: 'explicit',
        branches: [
          async (c) => createOwned({ value: 1, scope: c.scope }),
          async (c) => createOwned({ value: 2, scope: c.scope }),
        ],
      });

      // Should still get results despite warning
      expect(result.results).toHaveLength(2);
      expect(result.results[0].value).toBe(1);
      expect(result.results[1].value).toBe(2);
    });

    it('should use explicit warmup when executor is registered', async () => {
      const warmupCalled = vi.fn();
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          warmupCalled();
          return {
            tokenCost: 100,
            cacheCreatedTokens: 5000,
            durationMs: 50,
          };
        },
      };

      registerWarmupExecutor(mockExecutor);

      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'cache-optimized',
        warmup: 'explicit',
        branches: [
          async (c) => createOwned({ value: 1, scope: c.scope }),
          async (c) => createOwned({ value: 2, scope: c.scope }),
        ],
      });

      expect(warmupCalled).toHaveBeenCalledTimes(1);
      expect(result.cacheStats.warmupCost).toBe(100);
      expect(result.results).toHaveLength(2);
      expect(result.warnings).toEqual([]);
    });

    it('should use first-branch warmup correctly', async () => {
      const executionOrder: number[] = [];
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          return { tokenCost: 0, cacheCreatedTokens: 0, durationMs: 0 };
        },
      };

      registerWarmupExecutor(mockExecutor);

      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'cache-optimized',
        warmup: 'first-branch',
        branches: [
          async (c) => {
            executionOrder.push(1);
            await new Promise((resolve) => setTimeout(resolve, 30));
            return createOwned({ value: 'first', scope: c.scope });
          },
          async (c) => {
            executionOrder.push(2);
            return createOwned({ value: 'second', scope: c.scope });
          },
          async (c) => {
            executionOrder.push(3);
            return createOwned({ value: 'third', scope: c.scope });
          },
        ],
      });

      // First branch should execute before others
      expect(executionOrder[0]).toBe(1);
      // Second and third should execute after first completes (in parallel)
      expect(executionOrder.slice(1).sort()).toEqual([2, 3]);

      expect(result.results).toHaveLength(3);
      expect(result.results[0].value).toBe('first');
    });

    it('should handle warmup: none with cache-optimized', async () => {
      const warmupCalled = vi.fn();
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          warmupCalled();
          return { tokenCost: 100, cacheCreatedTokens: 5000, durationMs: 50 };
        },
      };

      registerWarmupExecutor(mockExecutor);

      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'cache-optimized',
        warmup: 'none',
        branches: [
          async (c) => createOwned({ value: 1, scope: c.scope }),
          async (c) => createOwned({ value: 2, scope: c.scope }),
        ],
      });

      // Explicit warmup should not be called
      expect(warmupCalled).not.toHaveBeenCalled();
      expect(result.cacheStats.warmupCost).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should default warmup to explicit for cache-optimized', async () => {
      const warmupCalled = vi.fn();
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          warmupCalled();
          return { tokenCost: 50, cacheCreatedTokens: 3000, durationMs: 25 };
        },
      };

      registerWarmupExecutor(mockExecutor);

      const ctx = createMockContext('test');

      await fork(ctx, {
        strategy: 'cache-optimized',
        // warmup not specified - should default to 'explicit'
        branches: [async (c) => createOwned({ value: 1, scope: c.scope })],
      });

      expect(warmupCalled).toHaveBeenCalledTimes(1);
    });
  });

  describe('Child Context Isolation', () => {
    it('should provide each branch with its own context', async () => {
      const ctx = createMockContext('parent');
      const receivedContexts: Context<'parent'>[] = [];

      await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) => {
            receivedContexts.push(c);
            return createOwned({ value: 1, scope: c.scope });
          },
          async (c) => {
            receivedContexts.push(c);
            return createOwned({ value: 2, scope: c.scope });
          },
        ],
      });

      expect(receivedContexts).toHaveLength(2);
      // Each branch should get a different context instance
      expect(receivedContexts[0]).not.toBe(receivedContexts[1]);
    });

    it('should share parent scope with child contexts', async () => {
      const ctx = createMockContext('my-scope');
      const scopeNames: string[] = [];

      await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) => {
            scopeNames.push(c.scope);
            return createOwned({ value: 1, scope: c.scope });
          },
          async (c) => {
            scopeNames.push(c.scope);
            return createOwned({ value: 2, scope: c.scope });
          },
        ],
      });

      expect(scopeNames).toEqual(['my-scope', 'my-scope']);
    });

    it('should allow bridging in child contexts', async () => {
      const ctx = createMockContext('parent');
      const externalValue = createOwned({
        value: 'external',
        scope: 'external' as const,
        confidence: 0.8,
      });

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) => {
            const bridged = c.bridge(externalValue);
            return createOwned({
              value: `bridged: ${bridged.value}`,
              scope: c.scope,
            });
          },
        ],
      });

      expect(result.results[0].value).toBe('bridged: external');
    });
  });

  describe('Warmup Executor Registration', () => {
    it('should allow registering a warmup executor', () => {
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          return { tokenCost: 0, cacheCreatedTokens: 0, durationMs: 0 };
        },
      };

      registerWarmupExecutor(mockExecutor);

      expect(getWarmupExecutor()).toBe(mockExecutor);
    });

    it('should allow clearing the warmup executor', () => {
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          return { tokenCost: 0, cacheCreatedTokens: 0, durationMs: 0 };
        },
      };

      registerWarmupExecutor(mockExecutor);
      expect(getWarmupExecutor()).toBe(mockExecutor);

      clearWarmupExecutor();
      expect(getWarmupExecutor()).toBeUndefined();
    });

    it('should handle executor with supportsCacheOptimization: false', async () => {
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: false,
        async explicitWarmup(): Promise<WarmupResult> {
          return { tokenCost: 0, cacheCreatedTokens: 0, durationMs: 0 };
        },
      };

      registerWarmupExecutor(mockExecutor);

      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'cache-optimized',
        branches: [async (c) => createOwned({ value: 1, scope: c.scope })],
      });

      // Should warn and fall back to fast-parallel
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('no warmup executor available');
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from branches', async () => {
      const ctx = createMockContext('test');

      await expect(
        fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            async () => {
              throw new Error('Branch error');
            },
          ],
        })
      ).rejects.toThrow('Branch error');
    });

    it('should fail fast on first error in parallel', async () => {
      const ctx = createMockContext('test');
      const executed: number[] = [];

      await expect(
        fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            async () => {
              executed.push(1);
              await new Promise((resolve) => setTimeout(resolve, 50));
              return createOwned({ value: 1, scope: 'test' as const });
            },
            async () => {
              executed.push(2);
              throw new Error('Branch 2 error');
            },
            async () => {
              executed.push(3);
              await new Promise((resolve) => setTimeout(resolve, 50));
              return createOwned({ value: 3, scope: 'test' as const });
            },
          ],
        })
      ).rejects.toThrow('Branch 2 error');

      // All branches should have started (parallel execution)
      expect(executed.sort()).toEqual([1, 2, 3]);
    });

    it('should propagate errors from warmup executor', async () => {
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          throw new Error('Warmup failed');
        },
      };

      registerWarmupExecutor(mockExecutor);

      const ctx = createMockContext('test');

      await expect(
        fork(ctx, {
          strategy: 'cache-optimized',
          warmup: 'explicit',
          branches: [async (c) => createOwned({ value: 1, scope: c.scope })],
        })
      ).rejects.toThrow('Warmup failed');
    });
  });

  describe('Schema Conflict Handling', () => {
    it('should accept onSchemaConflict: warn option', async () => {
      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        onSchemaConflict: 'warn',
        branches: [
          async (c) => createOwned({ value: 1, scope: c.scope }),
          async (c) => createOwned({ value: 2, scope: c.scope }),
        ],
      });

      expect(result.results).toHaveLength(2);
    });

    it('should accept onSchemaConflict: error option', async () => {
      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        onSchemaConflict: 'error',
        branches: [async (c) => createOwned({ value: 1, scope: c.scope })],
      });

      expect(result.results).toHaveLength(1);
    });

    it('should accept onSchemaConflict: allow option', async () => {
      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        onSchemaConflict: 'allow',
        branches: [async (c) => createOwned({ value: 1, scope: c.scope })],
      });

      expect(result.results).toHaveLength(1);
    });

    it('should default onSchemaConflict to warn', async () => {
      const ctx = createMockContext('test');

      // Should not throw - warn is the default
      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [async (c) => createOwned({ value: 1, scope: c.scope })],
      });

      expect(result.results).toHaveLength(1);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type information for results', async () => {
      interface TestData {
        id: number;
        name: string;
      }

      const ctx = createMockContext('typed');

      const result = await fork<TestData, 'typed'>(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) =>
            createOwned({
              value: { id: 1, name: 'first' },
              scope: c.scope,
            }),
          async (c) =>
            createOwned({
              value: { id: 2, name: 'second' },
              scope: c.scope,
            }),
        ],
      });

      // TypeScript should know these are TestData
      expect(result.results[0].value.id).toBe(1);
      expect(result.results[0].value.name).toBe('first');
      expect(result.results[1].value.id).toBe(2);
    });

    it('should preserve scope type in results', async () => {
      const ctx = createMockContext('my-scope');

      const result = await fork<string, 'my-scope'>(ctx, {
        strategy: 'fast-parallel',
        branches: [async (c) => createOwned({ value: 'test', scope: c.scope })],
      });

      expect(result.results[0].__scope).toBe('my-scope');
    });
  });
});
