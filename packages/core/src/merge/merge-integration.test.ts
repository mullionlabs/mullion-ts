import { describe, it, expect, vi } from 'vitest';
import { scope } from '../scope.js';
import { fork } from '../fork/fork.js';
import type { Context } from '../context.js';
import { mergeResults } from './index.js';
import { categorical } from './strategies/categorical.js';
import { continuous } from './strategies/continuous.js';
import { object } from './strategies/object.js';
import { array } from './strategies/array.js';
import { requireConsensus } from './strategies/consensus.js';
import { custom } from './strategies/custom.js';

describe('Merge Integration', () => {
  describe('merge() function with fork results', () => {
    it('should merge fork results using weighted vote', async () => {
      await scope('test', async (ctx: Context<'test'>) => {
        // Mock infer to return different categories
        let callCount = 0;
        vi.spyOn(ctx, 'infer').mockImplementation(async () => {
          callCount++;
          const categories = ['urgent', 'normal', 'urgent'];
          return {
            value: categories[callCount - 1],
            confidence: 0.8 + callCount * 0.05,
            __scope: 'test' as const,
            traceId: `trace-${callCount}`,
          };
        });

        const forkResult = await fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            (c) => c.infer({ parse: (v: any) => v }, 'classify'),
            (c) => c.infer({ parse: (v: any) => v }, 'classify'),
            (c) => c.infer({ parse: (v: any) => v }, 'classify'),
          ],
        });

        const mergeResult = mergeResults(
          forkResult.results,
          categorical.weightedVote()
        );

        expect(mergeResult.value.value).toBe('urgent'); // 2 votes vs 1
        expect(mergeResult.value.__scope).toBe('merged');
        expect(mergeResult.provenance.contributingBranches).toHaveLength(2);
        expect(mergeResult.conflicts).toHaveLength(1);
      });
    });

    it('should merge numeric fork results using weighted average', async () => {
      await scope('test', async (ctx: Context<'test'>) => {
        let callCount = 0;
        vi.spyOn(ctx, 'infer').mockImplementation(async () => {
          callCount++;
          const values = [100, 102, 101];
          return {
            value: values[callCount - 1],
            confidence: 0.9,
            __scope: 'test' as const,
            traceId: `trace-${callCount}`,
          };
        });

        const forkResult = await fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            (c) => c.infer({ parse: (v: any) => v }, 'estimate'),
            (c) => c.infer({ parse: (v: any) => v }, 'estimate'),
            (c) => c.infer({ parse: (v: any) => v }, 'estimate'),
          ],
        });

        const mergeResult = mergeResults(
          forkResult.results,
          continuous.weightedAverage()
        );

        expect(mergeResult.value.value.value).toBeCloseTo(101, 0);
        expect(mergeResult.value.value.dispersion).toBeGreaterThan(0);
        expect(mergeResult.value.__scope).toBe('merged');
      });
    });

    it('should merge object fork results field by field', async () => {
      interface Analysis {
        sentiment: string;
        urgency: number;
      }

      await scope('test', async (ctx: Context<'test'>) => {
        let callCount = 0;
        vi.spyOn(ctx, 'infer').mockImplementation(async () => {
          callCount++;
          const analyses: Analysis[] = [
            { sentiment: 'positive', urgency: 8 },
            { sentiment: 'positive', urgency: 7 },
            { sentiment: 'negative', urgency: 9 },
          ];
          return {
            value: analyses[callCount - 1],
            confidence: 0.85,
            __scope: 'test' as const,
            traceId: `trace-${callCount}`,
          };
        });

        const forkResult = await fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            (c) => c.infer({ parse: (v: any) => v }, 'analyze'),
            (c) => c.infer({ parse: (v: any) => v }, 'analyze'),
            (c) => c.infer({ parse: (v: any) => v }, 'analyze'),
          ],
        });

        const mergeResult = mergeResults(
          forkResult.results,
          object.fieldwise<Analysis>()
        );

        expect(mergeResult.value.value.sentiment).toBe('positive'); // 2 vs 1
        expect(mergeResult.value.value.urgency).toBeDefined();
        expect(mergeResult.conflicts.length).toBeGreaterThan(0);
      });
    });

    it('should merge array fork results with concatenation', async () => {
      await scope('test', async (ctx: Context<'test'>) => {
        let callCount = 0;
        vi.spyOn(ctx, 'infer').mockImplementation(async () => {
          callCount++;
          const tags = [
            ['tag1', 'tag2'],
            ['tag2', 'tag3'],
            ['tag1', 'tag4'],
          ];
          return {
            value: tags[callCount - 1],
            confidence: 0.85,
            __scope: 'test' as const,
            traceId: `trace-${callCount}`,
          };
        });

        const forkResult = await fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            (c) => c.infer({ parse: (v: any) => v }, 'extract tags'),
            (c) => c.infer({ parse: (v: any) => v }, 'extract tags'),
            (c) => c.infer({ parse: (v: any) => v }, 'extract tags'),
          ],
        });

        const mergeResult = mergeResults(
          forkResult.results,
          array.concat<string>()
        );

        expect(mergeResult.value.value).toHaveLength(4); // Unique: tag1, tag2, tag3, tag4
        expect(mergeResult.value.value).toContain('tag1');
        expect(mergeResult.value.value).toContain('tag2');
        expect(mergeResult.value.value).toContain('tag3');
        expect(mergeResult.value.value).toContain('tag4');
      });
    });

    it('should enforce consensus requirements on fork results', async () => {
      await scope('test', async (ctx: Context<'test'>) => {
        let callCount = 0;
        vi.spyOn(ctx, 'infer').mockImplementation(async () => {
          callCount++;
          const decisions = ['approve', 'approve', 'reject'];
          return {
            value: decisions[callCount - 1],
            confidence: 0.9,
            __scope: 'test' as const,
            traceId: `trace-${callCount}`,
          };
        });

        const forkResult = await fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            (c) => c.infer({ parse: (v: any) => v }, 'decide'),
            (c) => c.infer({ parse: (v: any) => v }, 'decide'),
            (c) => c.infer({ parse: (v: any) => v }, 'decide'),
          ],
        });

        // Require 2 out of 3 to agree
        const mergeResult = mergeResults(
          forkResult.results,
          requireConsensus<string>(2)
        );

        expect(mergeResult.value.value).toBe('approve');
        expect(mergeResult.value.confidence).toBeGreaterThan(0);
        expect(mergeResult.provenance.consensusLevel).toBeCloseTo(0.67, 1);
      });
    });

    it('should throw when consensus not met with error failure mode', async () => {
      await scope('test', async (ctx: Context<'test'>) => {
        let callCount = 0;
        vi.spyOn(ctx, 'infer').mockImplementation(async () => {
          callCount++;
          // All different values - no consensus
          const values = ['A', 'B', 'C'];
          return {
            value: values[callCount - 1],
            confidence: 0.9,
            __scope: 'test' as const,
            traceId: `trace-${callCount}`,
          };
        });

        const forkResult = await fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            (c) => c.infer({ parse: (v: any) => v }, 'choose'),
            (c) => c.infer({ parse: (v: any) => v }, 'choose'),
            (c) => c.infer({ parse: (v: any) => v }, 'choose'),
          ],
        });

        expect(() =>
          mergeResults(
            forkResult.results,
            requireConsensus<string>(2, { onFailure: 'error' })
          )
        ).toThrow('Consensus requirement not met');
      });
    });

    it('should use custom merge logic with fork results', async () => {
      await scope('test', async (ctx: Context<'test'>) => {
        let callCount = 0;
        vi.spyOn(ctx, 'infer').mockImplementation(async () => {
          callCount++;
          const values = [10, 20, 30];
          return {
            value: values[callCount - 1],
            confidence: 0.85,
            __scope: 'test' as const,
            traceId: `trace-${callCount}`,
          };
        });

        const forkResult = await fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            (c) => c.infer({ parse: (v: any) => v }, 'generate'),
            (c) => c.infer({ parse: (v: any) => v }, 'generate'),
            (c) => c.infer({ parse: (v: any) => v }, 'generate'),
          ],
        });

        // Custom merge: take median
        const mergeResult = mergeResults(
          forkResult.results,
          custom<number, number>((results) => {
            const values = results.map((r) => r.value).sort((a, b) => a - b);
            return values[Math.floor(values.length / 2)];
          })
        );

        expect(mergeResult.value.value).toBe(20); // Median of [10, 20, 30]
        expect(mergeResult.value.__scope).toBe('merged');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle single branch fork with merge', async () => {
      await scope('test', async (ctx: Context<'test'>) => {
        vi.spyOn(ctx, 'infer').mockImplementation(async () => ({
          value: 'result',
          confidence: 0.95,
          __scope: 'test' as const,
          traceId: 'trace-1',
        }));

        const forkResult = await fork(ctx, {
          strategy: 'fast-parallel',
          branches: [(c) => c.infer({ parse: (v: any) => v }, 'single')],
        });

        const mergeResult = mergeResults(
          forkResult.results,
          categorical.weightedVote()
        );

        expect(mergeResult.value.value).toBe('result');
        expect(mergeResult.provenance.consensusLevel).toBe(1.0);
        expect(mergeResult.conflicts).toHaveLength(0);
      });
    });

    it('should preserve high confidence when all branches agree', async () => {
      await scope('test', async (ctx: Context<'test'>) => {
        vi.spyOn(ctx, 'infer').mockImplementation(async () => ({
          value: 'unanimous',
          confidence: 0.95,
          __scope: 'test' as const,
          traceId: `trace-${Math.random()}`,
        }));

        const forkResult = await fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            (c) => c.infer({ parse: (v: any) => v }, 'vote'),
            (c) => c.infer({ parse: (v: any) => v }, 'vote'),
            (c) => c.infer({ parse: (v: any) => v }, 'vote'),
          ],
        });

        const mergeResult = mergeResults(
          forkResult.results,
          categorical.weightedVote()
        );

        expect(mergeResult.value.value).toBe('unanimous');
        // Confidence = total weight / total weight = 1.0 when unanimous
        expect(mergeResult.value.confidence).toBe(1.0);
        expect(mergeResult.provenance.consensusLevel).toBe(1.0);
      });
    });

    it('should track all rejected values when consensus not met', async () => {
      await scope('test', async (ctx: Context<'test'>) => {
        let callCount = 0;
        vi.spyOn(ctx, 'infer').mockImplementation(async () => {
          callCount++;
          const values = ['A', 'B', 'C', 'D'];
          return {
            value: values[callCount - 1],
            confidence: 0.8,
            __scope: 'test' as const,
            traceId: `trace-${callCount}`,
          };
        });

        const forkResult = await fork(ctx, {
          strategy: 'fast-parallel',
          branches: [
            (c) => c.infer({ parse: (v: any) => v }, 'choose'),
            (c) => c.infer({ parse: (v: any) => v }, 'choose'),
            (c) => c.infer({ parse: (v: any) => v }, 'choose'),
            (c) => c.infer({ parse: (v: any) => v }, 'choose'),
          ],
        });

        const mergeResult = mergeResults(
          forkResult.results,
          requireConsensus<string>(2, { onFailure: 'low-confidence' })
        );

        expect(mergeResult.value.confidence).toBe(0); // Consensus not met
        expect(mergeResult.provenance.rejectedValues).toHaveLength(3);
      });
    });
  });
});
