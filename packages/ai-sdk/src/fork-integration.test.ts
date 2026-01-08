/**
 * Fork Integration Tests
 *
 * These tests verify the integration between @mullion/core fork functionality
 * and @mullion/ai-sdk cache optimization features.
 *
 * Task 8.6: Fork Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import {
  fork,
  createOwned,
  registerWarmupExecutor,
  clearWarmupExecutor,
} from '@mullion/core';
import type {
  Context,
  WarmupExecutor,
  WarmupResult,
  Owned,
} from '@mullion/core';

import {
  detectSchemaConflict,
  handleSchemaConflict,
  areSchemasCompatible,
  createCacheSegmentManager,
  createDefaultCacheConfig,
  createWarmupExecutor,
  shouldWarmup,
  estimateWarmupCost,
} from './index.js';
import type { LanguageModel } from 'ai';

/**
 * Creates a mock context for testing.
 */
function createMockContext<S extends string>(scopeName: S): Context<S> {
  return {
    scope: scopeName,
    async infer<T>(): Promise<Owned<T, S>> {
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

// =============================================================================
// Schema Definitions for Tests
// =============================================================================

const RiskSchema = z.object({
  risks: z.array(z.string()),
  severity: z.enum(['low', 'medium', 'high']),
});

const OpportunitySchema = z.object({
  opportunities: z.array(z.string()),
  potential: z.enum(['low', 'medium', 'high']),
});

const SummarySchema = z.object({
  summary: z.string(),
  confidence: z.number(),
});

const UniversalSchema = z.object({
  category: z.string(),
  points: z.array(z.string()),
  score: z.number(),
});

// =============================================================================
// Test Suites
// =============================================================================

describe('Fork Integration Tests', () => {
  beforeEach(() => {
    clearWarmupExecutor();
  });

  afterEach(() => {
    clearWarmupExecutor();
  });

  describe('Schema Conflict Detection Integration', () => {
    it('should detect schema conflict when fork branches use different schemas', () => {
      // Simulate what happens when fork branches use different schemas
      const schemas = [RiskSchema, OpportunitySchema, SummarySchema];

      const result = detectSchemaConflict(schemas);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBranches).toHaveLength(3);
      expect(result.message).toContain('3 different schemas');
      expect(result.message).toContain('Anthropic cache reuse');
    });

    it('should not detect conflict when all branches use the same schema', () => {
      const schemas = [UniversalSchema, UniversalSchema, UniversalSchema];

      const result = detectSchemaConflict(schemas);

      expect(result.hasConflict).toBe(false);
      expect(areSchemasCompatible(schemas)).toBe(true);
    });

    it('should group branches by schema correctly', () => {
      // Branches 0,2 use RiskSchema, branches 1,3 use OpportunitySchema
      const schemas = [
        RiskSchema,
        OpportunitySchema,
        RiskSchema,
        OpportunitySchema,
      ];

      const result = detectSchemaConflict(schemas);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBranches).toHaveLength(2);

      // Find groups
      const riskGroup = result.conflictingBranches.find((g) => g.includes(0));
      const opportunityGroup = result.conflictingBranches.find((g) =>
        g.includes(1)
      );

      expect(riskGroup).toContain(2);
      expect(opportunityGroup).toContain(3);
    });

    it('should warn on schema conflict with onSchemaConflict: warn', () => {
      const schemas = [RiskSchema, OpportunitySchema];
      const conflict = detectSchemaConflict(schemas);

      const warning = handleSchemaConflict(conflict, 'warn');

      expect(warning).toBeDefined();
      expect(warning).toContain('Warning');
      expect(warning).toContain('Consider');
    });

    it('should throw on schema conflict with onSchemaConflict: error', () => {
      const schemas = [RiskSchema, OpportunitySchema];
      const conflict = detectSchemaConflict(schemas);

      expect(() => handleSchemaConflict(conflict, 'error')).toThrow(
        /Schema conflict detected/
      );
    });

    it('should allow schema conflict silently with onSchemaConflict: allow', () => {
      const schemas = [RiskSchema, OpportunitySchema];
      const conflict = detectSchemaConflict(schemas);

      const result = handleSchemaConflict(conflict, 'allow');

      expect(result).toBeUndefined();
    });
  });

  describe('Cache-Optimized Fork with Warmup', () => {
    it('should use warmup executor when cache-optimized strategy is used', async () => {
      const warmupCalled = vi.fn();
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          warmupCalled();
          return {
            tokenCost: 150,
            cacheCreatedTokens: 8000,
            durationMs: 100,
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
          async (c) => createOwned({ value: 3, scope: c.scope }),
        ],
      });

      expect(warmupCalled).toHaveBeenCalledTimes(1);
      expect(result.cacheStats.warmupCost).toBe(150);
      expect(result.results).toHaveLength(3);
      expect(result.warnings).toHaveLength(0);
    });

    it('should report warmup metrics correctly', async () => {
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          return {
            tokenCost: 200,
            cacheCreatedTokens: 10000,
            durationMs: 150,
          };
        },
      };

      registerWarmupExecutor(mockExecutor);

      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'cache-optimized',
        warmup: 'explicit',
        branches: [
          async (c) => createOwned({ value: 'a', scope: c.scope }),
          async (c) => createOwned({ value: 'b', scope: c.scope }),
        ],
      });

      expect(result.cacheStats).toMatchObject({
        warmupCost: 200,
        branchCacheHits: [0, 0], // Placeholder values in mock
        totalSaved: 0, // Placeholder - actual would come from real metrics
      });
    });

    it('should skip warmup when warmup: none', async () => {
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
        branches: [async (c) => createOwned({ value: 1, scope: c.scope })],
      });

      expect(warmupCalled).not.toHaveBeenCalled();
      expect(result.cacheStats.warmupCost).toBe(0);
    });

    it('should fall back to fast-parallel without warmup executor', async () => {
      // No warmup executor registered

      const ctx = createMockContext('test');
      const startTime = Date.now();

      const result = await fork(ctx, {
        strategy: 'cache-optimized',
        warmup: 'explicit',
        branches: [
          async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 30));
            return createOwned({ value: 1, scope: c.scope });
          },
          async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 30));
            return createOwned({ value: 2, scope: c.scope });
          },
        ],
      });

      const elapsed = Date.now() - startTime;

      // Should have warning about no executor
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('no warmup executor');

      // Should still execute in parallel (fast-parallel fallback)
      expect(elapsed).toBeLessThan(100); // Not 60ms sequential
      expect(result.results).toHaveLength(2);
    });
  });

  describe('First-Branch Warmup Strategy', () => {
    it('should execute first branch before others in first-branch warmup', async () => {
      const executionOrder: string[] = [];
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          return { tokenCost: 0, cacheCreatedTokens: 0, durationMs: 0 };
        },
      };

      registerWarmupExecutor(mockExecutor);

      const ctx = createMockContext('test');

      await fork(ctx, {
        strategy: 'cache-optimized',
        warmup: 'first-branch',
        branches: [
          async (c) => {
            executionOrder.push('first-start');
            await new Promise((resolve) => setTimeout(resolve, 50));
            executionOrder.push('first-end');
            return createOwned({ value: 1, scope: c.scope });
          },
          async (c) => {
            executionOrder.push('second');
            return createOwned({ value: 2, scope: c.scope });
          },
          async (c) => {
            executionOrder.push('third');
            return createOwned({ value: 3, scope: c.scope });
          },
        ],
      });

      // First branch should complete before others start
      expect(executionOrder.indexOf('first-end')).toBeLessThan(
        executionOrder.indexOf('second')
      );
      expect(executionOrder.indexOf('first-end')).toBeLessThan(
        executionOrder.indexOf('third')
      );
    });

    it('should execute remaining branches in parallel after first', async () => {
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          return { tokenCost: 0, cacheCreatedTokens: 0, durationMs: 0 };
        },
      };

      registerWarmupExecutor(mockExecutor);

      const ctx = createMockContext('test');
      const startTime = Date.now();

      await fork(ctx, {
        strategy: 'cache-optimized',
        warmup: 'first-branch',
        branches: [
          async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 20)); // First branch
            return createOwned({ value: 1, scope: c.scope });
          },
          async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 30));
            return createOwned({ value: 2, scope: c.scope });
          },
          async (c) => {
            await new Promise((resolve) => setTimeout(resolve, 30));
            return createOwned({ value: 3, scope: c.scope });
          },
        ],
      });

      const elapsed = Date.now() - startTime;

      // Should be ~50ms (first: 20ms, then parallel: 30ms), not 80ms sequential
      expect(elapsed).toBeLessThan(80);
    });
  });

  describe('Cache Metrics Aggregation', () => {
    it('should report cache hits per branch', async () => {
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          return { tokenCost: 100, cacheCreatedTokens: 5000, durationMs: 50 };
        },
      };

      registerWarmupExecutor(mockExecutor);

      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'cache-optimized',
        warmup: 'explicit',
        branches: [
          async (c) => createOwned({ value: 'a', scope: c.scope }),
          async (c) => createOwned({ value: 'b', scope: c.scope }),
          async (c) => createOwned({ value: 'c', scope: c.scope }),
        ],
      });

      // Should have cache hits array matching branch count
      expect(result.cacheStats.branchCacheHits).toHaveLength(3);
    });

    it('should track warmup cost separately from branch costs', async () => {
      let warmupCallCount = 0;
      const mockExecutor: WarmupExecutor = {
        supportsCacheOptimization: true,
        async explicitWarmup(): Promise<WarmupResult> {
          warmupCallCount++;
          return { tokenCost: 75, cacheCreatedTokens: 4000, durationMs: 40 };
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

      // Warmup should only be called once
      expect(warmupCallCount).toBe(1);
      expect(result.cacheStats.warmupCost).toBe(75);
    });

    it('should report zero cache stats for fast-parallel strategy', async () => {
      const ctx = createMockContext('test');

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) => createOwned({ value: 1, scope: c.scope }),
          async (c) => createOwned({ value: 2, scope: c.scope }),
        ],
      });

      expect(result.cacheStats.warmupCost).toBe(0);
      expect(result.cacheStats.totalSaved).toBe(0);
      expect(result.cacheStats.branchCacheHits.every((h) => h === 0)).toBe(
        true
      );
    });
  });

  describe('Cache Segment Manager Integration', () => {
    it('should determine warmup is beneficial with Anthropic segments', () => {
      const cacheManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDefaultCacheConfig({ enabled: true })
      );

      // Add large segment that meets minimum token threshold
      cacheManager.segment('doc', 'A'.repeat(5000), { force: true });

      const mockModel = {} as LanguageModel;
      const result = shouldWarmup(
        {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          languageModel: mockModel,
        },
        cacheManager,
        3 // 3 branches
      );

      expect(result).toBe(true);
    });

    it('should determine warmup is not beneficial for OpenAI (automatic caching)', () => {
      const cacheManager = createCacheSegmentManager(
        'openai',
        'gpt-4o',
        createDefaultCacheConfig({ enabled: true })
      );

      cacheManager.segment('doc', 'A'.repeat(5000), { force: true });

      const mockModel = {} as LanguageModel;
      const result = shouldWarmup(
        {
          provider: 'openai',
          model: 'gpt-4o',
          languageModel: mockModel,
        },
        cacheManager,
        3
      );

      expect(result).toBe(false);
    });

    it('should estimate warmup cost based on segments', () => {
      const cacheManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDefaultCacheConfig({ enabled: true })
      );

      // Add 4000 chars (~1000 tokens)
      cacheManager.segment('doc', 'A'.repeat(4000), { force: true });

      const estimate = estimateWarmupCost(cacheManager);

      // Should be segment tokens + warmup overhead
      expect(estimate).toBeGreaterThan(1000);
      expect(estimate).toBeLessThan(1500);
    });

    it('should not recommend warmup for single branch', () => {
      const cacheManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDefaultCacheConfig({ enabled: true })
      );

      cacheManager.segment('doc', 'A'.repeat(5000), { force: true });

      const mockModel = {} as LanguageModel;
      const result = shouldWarmup(
        {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          languageModel: mockModel,
        },
        cacheManager,
        1 // Single branch - no benefit from warmup
      );

      expect(result).toBe(false);
    });

    it('should not recommend warmup for small segments below minimum', () => {
      const cacheManager = createCacheSegmentManager(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        createDefaultCacheConfig({ enabled: true })
      );

      // Small segment below 1024 token minimum
      cacheManager.segment('doc', 'Hello world', { force: true });

      const mockModel = {} as LanguageModel;
      const result = shouldWarmup(
        {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          languageModel: mockModel,
        },
        cacheManager,
        3
      );

      expect(result).toBe(false);
    });
  });

  describe('Child Context Isolation', () => {
    it('should provide isolated contexts to each branch', async () => {
      const ctx = createMockContext('parent');
      const contextRefs: Context<'parent'>[] = [];

      await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) => {
            contextRefs.push(c);
            return createOwned({ value: 1, scope: c.scope });
          },
          async (c) => {
            contextRefs.push(c);
            return createOwned({ value: 2, scope: c.scope });
          },
          async (c) => {
            contextRefs.push(c);
            return createOwned({ value: 3, scope: c.scope });
          },
        ],
      });

      // Each branch should get a unique context instance
      expect(contextRefs[0]).not.toBe(contextRefs[1]);
      expect(contextRefs[1]).not.toBe(contextRefs[2]);
      expect(contextRefs[0]).not.toBe(contextRefs[2]);
    });

    it('should maintain parent scope identifier in child contexts', async () => {
      const ctx = createMockContext('analysis-scope');
      const scopes: string[] = [];

      await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) => {
            scopes.push(c.scope);
            return createOwned({ value: 1, scope: c.scope });
          },
          async (c) => {
            scopes.push(c.scope);
            return createOwned({ value: 2, scope: c.scope });
          },
        ],
      });

      expect(scopes).toEqual(['analysis-scope', 'analysis-scope']);
    });

    it('should allow independent inference in each branch', async () => {
      let inferCallCount = 0;
      const ctx: Context<'test'> = {
        scope: 'test',
        async infer<T>(): Promise<Owned<T, 'test'>> {
          inferCallCount++;
          return createOwned({
            value: { callNum: inferCallCount } as T,
            scope: 'test',
            confidence: 0.9,
          });
        },
        bridge<T, OS extends string>(
          owned: Owned<T, OS>
        ): Owned<T, 'test' | OS> {
          return { ...owned, __scope: 'test' as 'test' | OS };
        },
        use<T>(owned: Owned<T, 'test'>): T {
          return owned.value;
        },
      };

      const result = await fork(ctx, {
        strategy: 'fast-parallel',
        branches: [
          async (c) => c.infer({} as never, 'prompt1'),
          async (c) => c.infer({} as never, 'prompt2'),
          async (c) => c.infer({} as never, 'prompt3'),
        ],
      });

      // Each branch should have called infer independently
      expect(inferCallCount).toBe(3);
      expect(result.results).toHaveLength(3);
    });
  });

  describe('Warmup Executor Creation', () => {
    it('should create warmup executor with Anthropic support', () => {
      const mockModel = {} as LanguageModel;
      const executor = createWarmupExecutor({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        languageModel: mockModel,
      });

      expect(executor.supportsCacheOptimization).toBe(true);
    });

    it('should create warmup executor without support for OpenAI', () => {
      const mockModel = {} as LanguageModel;
      const executor = createWarmupExecutor({
        provider: 'openai',
        model: 'gpt-4o',
        languageModel: mockModel,
      });

      // OpenAI has automatic caching, so no explicit warmup needed
      expect(executor.supportsCacheOptimization).toBe(false);
    });
  });
});
