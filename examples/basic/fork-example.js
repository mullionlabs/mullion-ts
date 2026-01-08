/**
 * Fork API Example - Complete Integration Demo
 *
 * This example demonstrates the fork API for parallel LLM execution
 * with cache optimization. It shows:
 *
 * 1. Fast-parallel strategy for speed-critical paths
 * 2. Cache-optimized strategy for cost savings
 * 3. Schema conflict detection for Anthropic
 * 4. Warmup strategies (explicit, first-branch, none)
 *
 * @module examples/fork
 */

// Import from @mullion/core
import {
  scope,
  fork,
  createOwned,
  registerWarmupExecutor,
  clearWarmupExecutor,
} from '@mullion/core';

// Import from @mullion/ai-sdk
import {
  createCacheSegmentManager,
  createDefaultCacheConfig,
  setupWarmupExecutor,
  shouldWarmup,
  estimateWarmupCost,
  detectSchemaConflict,
  handleSchemaConflict,
  areSchemasCompatible,
} from '@mullion/ai-sdk';

import { z } from 'zod';

// =============================================================================
// Schema Definitions
// =============================================================================

/**
 * Risk analysis schema - extracts risk factors from documents.
 */
const RiskSchema = z.object({
  risks: z.array(
    z.object({
      category: z.enum(['financial', 'operational', 'legal', 'technical']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
      mitigation: z.string().optional(),
    })
  ),
  overallRisk: z.enum(['low', 'medium', 'high', 'critical']),
  summary: z.string(),
});

/**
 * Opportunity analysis schema - finds opportunities in documents.
 */
const OpportunitySchema = z.object({
  opportunities: z.array(
    z.object({
      area: z.string(),
      potential: z.enum(['low', 'medium', 'high']),
      description: z.string(),
      timeline: z.string().optional(),
    })
  ),
  topOpportunity: z.string(),
  summary: z.string(),
});

/**
 * Executive summary schema - provides high-level overview.
 */
const SummarySchema = z.object({
  keyPoints: z.array(z.string()),
  recommendation: z.string(),
  confidence: z.number().min(0).max(1),
});

/**
 * Universal analysis schema - same structure for all branches.
 * Using identical schemas across fork branches enables full cache sharing.
 */
const UniversalAnalysisSchema = z.object({
  category: z.string(),
  points: z.array(z.string()),
  conclusion: z.string(),
  confidence: z.number().min(0).max(1),
});

// =============================================================================
// Example 1: Fast-Parallel Strategy
// =============================================================================

/**
 * Demonstrates fast-parallel fork execution.
 *
 * All branches execute simultaneously with Promise.all().
 * No cache warmup, branches don't share cache.
 * Fastest latency, highest token cost.
 */
async function fastParallelExample() {
  console.log('\n=== Fast-Parallel Fork Example ===\n');

  await scope('analysis', async (ctx) => {
    // Mock infer for demonstration
    const mockInfer = async (schema, prompt) => {
      return createOwned({
        value: { mock: true, prompt: prompt.slice(0, 30) },
        scope: 'analysis',
        confidence: 0.85,
      });
    };

    // Override ctx.infer for demo
    const demoCtx = {
      ...ctx,
      infer: mockInfer,
    };

    const result = await fork(demoCtx, {
      strategy: 'fast-parallel',
      branches: [
        async (c) =>
          c.infer(RiskSchema, 'Analyze risk factors in the document'),
        async (c) => c.infer(OpportunitySchema, 'Identify opportunities'),
        async (c) => c.infer(SummarySchema, 'Provide executive summary'),
      ],
    });

    console.log(`Branches executed: ${result.results.length}`);
    console.log(`Warmup cost: ${result.cacheStats.warmupCost} tokens`);
    console.log(`Cache hits per branch: ${result.cacheStats.branchCacheHits}`);
    console.log(`Total saved: ${result.cacheStats.totalSaved} tokens`);

    if (result.warnings.length > 0) {
      console.log('Warnings:', result.warnings);
    }

    return result;
  });
}

// =============================================================================
// Example 2: Cache-Optimized Strategy
// =============================================================================

/**
 * Demonstrates cache-optimized fork execution.
 *
 * Primes cache first (based on warmup strategy), then executes
 * branches in parallel to benefit from cached prefix.
 */
async function cacheOptimizedExample() {
  console.log('\n=== Cache-Optimized Fork Example ===\n');

  // Create cache segment manager for Anthropic with 2 breakpoints
  const cacheManager = createCacheSegmentManager(
    'anthropic',
    'claude-3-5-sonnet-20241022',
    createDefaultCacheConfig({ enabled: true, breakpoints: 2 })
  );

  // Add document to cache (would be a real long document)
  const longDocument =
    'This is a sample document that would normally be very long. '.repeat(500);

  cacheManager.segment('document', longDocument, { ttl: '5m' });
  cacheManager.system(
    'You are an expert business analyst. Analyze documents thoroughly.',
    { ttl: '1h' }
  );

  console.log('Cache segments added:');
  console.log(`  Total tokens: ~${cacheManager.getTotalTokens()}`);
  console.log(`  Segment count: ${cacheManager.getSegments().length}`);

  // Mock warmup executor (in real usage, use setupWarmupExecutor)
  registerWarmupExecutor({
    supportsCacheOptimization: true,
    async explicitWarmup(ctx) {
      console.log('  Executing warmup call to prime cache...');
      // Simulate warmup delay
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        tokenCost: 120,
        cacheCreatedTokens: 5000,
        durationMs: 100,
      };
    },
  });

  try {
    await scope('analysis', async (ctx) => {
      // Mock infer for demonstration
      const mockInfer = async (schema, prompt) => {
        return createOwned({
          value: { mock: true, prompt: prompt.slice(0, 30) },
          scope: 'analysis',
          confidence: 0.9,
        });
      };

      const demoCtx = {
        ...ctx,
        infer: mockInfer,
      };

      // Check if warmup would be beneficial
      const branchCount = 3;
      const warmupBeneficial = shouldWarmup(
        {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          languageModel: null, // Not used in shouldWarmup
        },
        cacheManager,
        branchCount
      );

      console.log(`Warmup beneficial: ${warmupBeneficial}`);

      if (warmupBeneficial) {
        const estimatedCost = estimateWarmupCost(cacheManager);
        console.log(`Estimated warmup cost: ~${estimatedCost} tokens`);
      }

      const result = await fork(demoCtx, {
        strategy: 'cache-optimized',
        warmup: 'explicit',
        onSchemaConflict: 'warn',
        branches: [
          async (c) =>
            c.infer(UniversalAnalysisSchema, 'Analyze from risk perspective'),
          async (c) =>
            c.infer(
              UniversalAnalysisSchema,
              'Analyze from opportunity perspective'
            ),
          async (c) =>
            c.infer(
              UniversalAnalysisSchema,
              'Analyze from strategic perspective'
            ),
        ],
      });

      console.log(`\nResults:`);
      console.log(`  Branches executed: ${result.results.length}`);
      console.log(`  Warmup cost: ${result.cacheStats.warmupCost} tokens`);
      console.log(
        `  Cache hits per branch: [${result.cacheStats.branchCacheHits.join(', ')}]`
      );
      console.log(`  Total saved: ${result.cacheStats.totalSaved} tokens`);

      return result;
    });
  } finally {
    // Clean up registered executor
    clearWarmupExecutor();
  }
}

// =============================================================================
// Example 3: Schema Conflict Detection
// =============================================================================

/**
 * Demonstrates schema conflict detection for Anthropic.
 *
 * When fork branches use different schemas with generateObject,
 * each schema creates a different tool definition, breaking cache sharing.
 */
async function schemaConflictExample() {
  console.log('\n=== Schema Conflict Detection Example ===\n');

  // Scenario 1: Different schemas - conflict detected
  console.log('Scenario 1: Different schemas across branches');
  const differentSchemas = [RiskSchema, OpportunitySchema, SummarySchema];

  const conflictResult = detectSchemaConflict(differentSchemas);

  console.log(`  Has conflict: ${conflictResult.hasConflict}`);
  console.log(`  Message: ${conflictResult.message}`);
  console.log(`  Groups: ${conflictResult.conflictingBranches.length}`);

  if (conflictResult.hasConflict) {
    console.log('  Suggestions:');
    conflictResult.suggestions.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s}`);
    });
  }

  // Scenario 2: Same schema - no conflict
  console.log('\nScenario 2: Same schema across branches');
  const sameSchemas = [
    UniversalAnalysisSchema,
    UniversalAnalysisSchema,
    UniversalAnalysisSchema,
  ];

  const noConflictResult = detectSchemaConflict(sameSchemas);

  console.log(`  Has conflict: ${noConflictResult.hasConflict}`);
  console.log(`  Compatible: ${areSchemasCompatible(sameSchemas)}`);

  // Scenario 3: Handling conflict with different behaviors
  console.log('\nScenario 3: Conflict behavior handling');

  // 'warn' behavior - returns warning message
  const warning = handleSchemaConflict(conflictResult, 'warn');
  if (warning) {
    console.log(`  [warn] ${warning.slice(0, 80)}...`);
  }

  // 'allow' behavior - silent continue
  const allowed = handleSchemaConflict(conflictResult, 'allow');
  console.log(`  [allow] Returns: ${allowed ?? 'undefined (silent)'}`);

  // 'error' behavior - throws
  try {
    handleSchemaConflict(conflictResult, 'error');
  } catch (e) {
    console.log(`  [error] Throws: ${e.message.slice(0, 50)}...`);
  }
}

// =============================================================================
// Example 4: First-Branch Warmup Strategy
// =============================================================================

/**
 * Demonstrates first-branch warmup strategy.
 *
 * The first branch executes and primes the cache naturally,
 * then remaining branches execute in parallel with cache hits.
 */
async function firstBranchWarmupExample() {
  console.log('\n=== First-Branch Warmup Example ===\n');

  // Register warmup executor
  registerWarmupExecutor({
    supportsCacheOptimization: true,
    async explicitWarmup(ctx) {
      // Not used in first-branch strategy
      return { tokenCost: 0, cacheCreatedTokens: 0, durationMs: 0 };
    },
  });

  try {
    await scope('analysis', async (ctx) => {
      let branchExecutionOrder = [];

      // Mock infer that tracks execution order
      const mockInfer = async (schema, prompt) => {
        const branchName = prompt.split(' ').slice(-1)[0];
        branchExecutionOrder.push(branchName);
        // Simulate API latency
        await new Promise((resolve) => setTimeout(resolve, 50));
        return createOwned({
          value: { prompt: prompt.slice(0, 30) },
          scope: 'analysis',
          confidence: 0.88,
        });
      };

      const demoCtx = { ...ctx, infer: mockInfer };

      const result = await fork(demoCtx, {
        strategy: 'cache-optimized',
        warmup: 'first-branch', // First branch primes cache
        branches: [
          async (c) => c.infer(UniversalAnalysisSchema, 'Generate overview'),
          async (c) => c.infer(UniversalAnalysisSchema, 'Generate details'),
          async (c) => c.infer(UniversalAnalysisSchema, 'Generate actions'),
        ],
      });

      console.log(`Branches executed: ${result.results.length}`);
      console.log(
        `First branch completed before others: ${branchExecutionOrder[0] === 'overview'}`
      );
      console.log(`Execution order: ${branchExecutionOrder.join(' -> ')}`);

      return result;
    });
  } finally {
    clearWarmupExecutor();
  }
}

// =============================================================================
// Main - Run All Examples
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Mullion Fork API - Complete Integration Demo');
  console.log('='.repeat(60));

  try {
    await fastParallelExample();
    await cacheOptimizedExample();
    await schemaConflictExample();
    await firstBranchWarmupExample();

    console.log('\n' + '='.repeat(60));
    console.log('All examples completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

main();
