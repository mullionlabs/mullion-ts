import {describe, it, expect} from 'vitest';
import {scope} from './scope.js';
import {
  bridge,
  bridgeSemantic,
  bridgeMultiple,
  getProvenance,
  bridgeWithMetadata,
} from './bridge.js';
import {createOwned} from './owned.js';
import {createSemanticValue} from './semantic-value.js';
import type {Owned} from './owned.js';
import type {SemanticValue} from './semantic-value.js';

/**
 * Integration tests for Mullion
 *
 * These tests verify that scope(), bridge(), and other utilities work together
 * correctly in real-world scenarios.
 */

describe('Integration Tests', () => {
  describe('Nested Scopes', () => {
    it('should support basic nested scopes with data flow', async () => {
      const result = await scope('outer', async (outerCtx) => {
        // Create data in outer scope
        const outerData: Owned<number, 'outer'> = createOwned({
          value: 10,
          scope: 'outer',
        });

        // Nested inner scope
        const innerResult = await scope('inner', async (innerCtx) => {
          // Must bridge to use outer data in inner scope
          const bridged = innerCtx.bridge(outerData);
          const value = innerCtx.use(bridged);

          return value * 2;
        });

        return {outer: outerCtx.use(outerData), inner: innerResult};
      });

      expect(result.outer).toBe(10);
      expect(result.inner).toBe(20);
    });

    it('should support deeply nested scopes (3 levels)', async () => {
      const result = await scope('level1', async (_ctx1) => {
        const data1: Owned<string, 'level1'> = createOwned({
          value: 'level1-data',
          scope: 'level1',
        });

        return await scope('level2', async (ctx2) => {
          const bridged1 = ctx2.bridge(data1);
          const data2: Owned<string, 'level2'> = createOwned({
            value: ctx2.use(bridged1) + '->level2',
            scope: 'level2',
          });

          return await scope('level3', async (ctx3) => {
            const bridged2 = ctx3.bridge(data2);
            const finalData = ctx3.use(bridged2) + '->level3';

            return finalData;
          });
        });
      });

      expect(result).toBe('level1-data->level2->level3');
    });

    it('should maintain scope isolation in sibling scopes', async () => {
      await scope('parent', async () => {
        const scope1Data = await scope('child1', async (_ctx1) => {
          return createOwned({value: 'child1-data', scope: 'child1'});
        });

        const scope2Data = await scope('child2', async (ctx2) => {
          // Child2 cannot directly use child1's data without bridging
          expect(() => {
            // @ts-expect-error - Testing scope isolation
            ctx2.use(scope1Data);
          }).toThrow(/Scope mismatch/);

          // Must bridge first
          const bridged = ctx2.bridge(scope1Data);
          return ctx2.use(bridged);
        });

        expect(scope2Data).toBe('child1-data');
      });
    });

    it('should support parallel nested scopes with aggregation', async () => {
      const result = await scope('aggregator', async (aggCtx) => {
        // Run two independent scopes
        const [data1, data2] = await Promise.all([
          scope('source1', async (_ctx1) =>
            createOwned({value: 100, scope: 'source1'}),
          ),
          scope('source2', async (_ctx2) =>
            createOwned({value: 200, scope: 'source2'}),
          ),
        ]);

        // Bridge both into aggregator scope
        const bridged1 = aggCtx.bridge(data1);
        const bridged2 = aggCtx.bridge(data2);

        const sum = aggCtx.use(bridged1) + aggCtx.use(bridged2);

        return createOwned({value: sum, scope: 'aggregator'});
      });

      expect(result.value).toBe(300);
      expect(result.__scope).toBe('aggregator');
    });
  });

  describe('Bridge Between Scopes', () => {
    it('should bridge using Context.bridge() within scopes', async () => {
      const adminData: Owned<string, 'admin'> = createOwned({
        value: 'sensitive',
        scope: 'admin',
        confidence: 0.95,
      });

      await scope('customer', async (ctx) => {
        const bridged = ctx.bridge(adminData);

        expect(bridged.value).toBe('sensitive');
        expect(bridged.confidence).toBe(0.95);
        expect(bridged.__scope).toBe('customer');

        // Can now use it in customer scope
        const value = ctx.use(bridged);
        expect(value).toBe('sensitive');
      });
    });

    it('should bridge using standalone bridge() function', async () => {
      const source: Owned<number, 'source'> = createOwned({
        value: 42,
        scope: 'source',
      });

      // Use standalone bridge function
      const bridged = bridge(source, 'target');

      await scope('target', async (ctx) => {
        // Can use the pre-bridged value
        const value = ctx.use(bridged);
        expect(value).toBe(42);
      });
    });

    it('should chain bridges through multiple scopes', async () => {
      const original: Owned<string, 'input'> = createOwned({
        value: 'data',
        scope: 'input',
        traceId: 'trace-123',
      });

      // Chain through processing scope
      const step1 = await scope('processing', async (ctx) => {
        const bridged = ctx.bridge(original);
        return bridged;
      });

      // Then to output scope
      const step2 = await scope('output', async (ctx) => {
        const bridged = ctx.bridge(step1);

        // Verify trace ID is preserved
        const prov = getProvenance(bridged);
        expect(prov.traceId).toBe('trace-123');
        expect(prov.currentScope).toBe('output');

        return bridged;
      });

      expect(step2.__scope).toBe('output');
      expect(step2.traceId).toBe('trace-123');
    });

    it('should bridge multiple values in batch', async () => {
      const values: Owned<number, 'batch-source'>[] = [
        createOwned({value: 1, scope: 'batch-source'}),
        createOwned({value: 2, scope: 'batch-source'}),
        createOwned({value: 3, scope: 'batch-source'}),
      ];

      const bridged = bridgeMultiple(values, 'batch-target');

      await scope('batch-target', async (ctx) => {
        const sum = bridged.reduce((acc, v) => acc + ctx.use(v), 0);
        expect(sum).toBe(6);
      });
    });

    it('should track bridge metadata for auditing', async () => {
      const adminData: Owned<string, 'admin'> = createOwned({
        value: 'classified',
        scope: 'admin',
      });

      const {bridged, metadata} = bridgeWithMetadata(
        adminData,
        'audit-log',
        'Required for compliance',
      );

      expect(metadata.source).toBe('admin');
      expect(metadata.target).toBe('audit-log');
      expect(metadata.reason).toBe('Required for compliance');
      expect(metadata.timestamp).toBeTypeOf('number');

      await scope('audit-log', async (ctx) => {
        const value = ctx.use(bridged);
        expect(value).toBe('classified');
      });
    });
  });

  describe('Type Inference', () => {
    it('should infer correct types through nested scopes', async () => {
      interface UserData {
        id: number;
        name: string;
      }

      const result = await scope('user-scope', async (ctx) => {
        const userData: Owned<UserData, 'user-scope'> = createOwned({
          value: {id: 1, name: 'Alice'},
          scope: 'user-scope',
        });

        // TypeScript should infer the correct type
        const unwrapped = ctx.use(userData);
        expect(unwrapped.id).toBe(1);
        expect(unwrapped.name).toBe('Alice');

        return userData;
      });

      // Return type should be Owned<UserData, 'user-scope'>
      expect(result.value.id).toBe(1);
      expect(result.value.name).toBe('Alice');
    });

    it('should preserve type information through bridges', async () => {
      interface DataType {
        count: number;
        status: 'active' | 'inactive';
      }

      const original: Owned<DataType, 'scope1'> = createOwned({
        value: {count: 5, status: 'active'},
        scope: 'scope1',
      });

      await scope('scope2', async (ctx) => {
        const bridged = ctx.bridge(original);

        // TypeScript knows the shape of bridged.value
        const data = ctx.use(bridged);
        expect(data.count).toBe(5);
        expect(data.status).toBe('active');
      });
    });

    it('should infer union types for bridged values', async () => {
      const value1: Owned<string, 'scope1'> = createOwned({
        value: 'test',
        scope: 'scope1',
      });

      await scope('scope2', async (ctx) => {
        const bridged = ctx.bridge(value1);

        // Type should be Owned<string, 'scope1' | 'scope2'>
        // Runtime scope is 'scope2'
        expect(bridged.__scope).toBe('scope2');
      });
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle customer support workflow', async () => {
      // Simulate a customer support scenario with multiple scopes

      interface CustomerMessage {
        text: string;
        sentiment: 'positive' | 'neutral' | 'negative';
      }

      interface SupportTicket {
        priority: 'low' | 'medium' | 'high';
        category: string;
      }

      const result = await scope('customer-input', async (_inputCtx) => {
        // Customer message in input scope
        const message: Owned<CustomerMessage, 'customer-input'> = createOwned({
          value: {
            text: 'My order is delayed!',
            sentiment: 'negative',
          },
          scope: 'customer-input',
          confidence: 0.9,
        });

        // Analyze in processing scope
        return await scope('processing', async (procCtx) => {
          const bridgedMsg = procCtx.bridge(message);
          const msg = procCtx.use(bridgedMsg);

          // Create ticket based on sentiment
          const ticket: Owned<SupportTicket, 'processing'> = createOwned({
            value: {
              priority: msg.sentiment === 'negative' ? 'high' : 'low',
              category: 'shipping',
            },
            scope: 'processing',
            confidence: 0.85,
          });

          // Forward to support scope
          return await scope('support', async (supportCtx) => {
            const bridgedTicket = supportCtx.bridge(ticket);
            const finalTicket = supportCtx.use(bridgedTicket);

            return {
              priority: finalTicket.priority,
              category: finalTicket.category,
              originalSentiment: msg.sentiment,
            };
          });
        });
      });

      expect(result.priority).toBe('high');
      expect(result.category).toBe('shipping');
      expect(result.originalSentiment).toBe('negative');
    });

    it('should handle multi-source data aggregation', async () => {
      interface _MetricData {
        source: string;
        value: number;
      }

      const result = await scope('aggregator', async (aggCtx) => {
        // Collect data from multiple sources
        const sourceData = await Promise.all([
          scope('api-1', async () =>
            createOwned({
              value: {source: 'API-1', value: 100},
              scope: 'api-1',
            }),
          ),
          scope('api-2', async () =>
            createOwned({
              value: {source: 'API-2', value: 200},
              scope: 'api-2',
            }),
          ),
          scope('api-3', async () =>
            createOwned({
              value: {source: 'API-3', value: 150},
              scope: 'api-3',
            }),
          ),
        ]);

        // Bridge all to aggregator
        const bridged = bridgeMultiple(sourceData, 'aggregator');

        const total = bridged.reduce((sum, item) => {
          return sum + aggCtx.use(item).value;
        }, 0);

        return {
          totalSources: bridged.length,
          totalValue: total,
          sources: bridged.map((item) => aggCtx.use(item).source),
        };
      });

      expect(result.totalSources).toBe(3);
      expect(result.totalValue).toBe(450);
      expect(result.sources).toEqual(['API-1', 'API-2', 'API-3']);
    });

    it('should handle semantic analysis with alternatives', async () => {
      interface Category {
        name: string;
        confidence: number;
      }

      const result = await scope('ai-analysis', async (aiCtx) => {
        const analysis: SemanticValue<Category, 'ai-analysis'> =
          createSemanticValue({
            value: {name: 'spam', confidence: 0.85},
            scope: 'ai-analysis',
            confidence: 0.85,
            alternatives: [
              {
                value: {name: 'promotional', confidence: 0.7},
                confidence: 0.7,
              },
              {
                value: {name: 'legitimate', confidence: 0.4},
                confidence: 0.4,
              },
            ],
            reasoning: 'Multiple spam indicators detected',
          });

        return await scope('moderation', async () => {
          // Use standalone bridgeSemantic to preserve alternatives and reasoning
          const bridged = bridgeSemantic(analysis, 'moderation');

          // Access semantic metadata
          return {
            category: aiCtx.use(analysis).name,
            confidence: bridged.confidence,
            hasAlternatives: bridged.alternatives.length > 0,
            reasoning: bridged.reasoning,
          };
        });
      });

      expect(result.category).toBe('spam');
      expect(result.confidence).toBe(0.85);
      expect(result.hasAlternatives).toBe(true);
      expect(result.reasoning).toBe('Multiple spam indicators detected');
    });

    it('should handle error propagation across scopes', async () => {
      await expect(async () => {
        await scope('outer', async () => {
          await scope('inner', async () => {
            throw new Error('Inner scope error');
          });
        });
      }).rejects.toThrow('Inner scope error');
    });

    it('should maintain trace IDs across complex workflows', async () => {
      const traceId = 'workflow-trace-123';

      const result = await scope('step1', async (_ctx1) => {
        const data: Owned<string, 'step1'> = createOwned({
          value: 'initial',
          scope: 'step1',
          traceId,
        });

        return await scope('step2', async (ctx2) => {
          const bridged1 = ctx2.bridge(data);

          return await scope('step3', async (ctx3) => {
            const bridged2 = ctx3.bridge(bridged1);

            return await scope('step4', async (ctx4) => {
              const bridged3 = ctx4.bridge(bridged2);

              // Trace ID should be preserved through all steps
              const prov = getProvenance(bridged3);
              expect(prov.traceId).toBe(traceId);

              return bridged3;
            });
          });
        });
      });

      expect(result.traceId).toBe(traceId);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle empty nested scopes', async () => {
      const result = await scope('outer', async () => {
        return await scope('inner', async () => {
          return 'value';
        });
      });

      expect(result).toBe('value');
    });

    it('should handle returning undefined from nested scopes', async () => {
      const result = await scope('outer', async () => {
        return await scope('inner', async () => {
          return undefined;
        });
      });

      expect(result).toBeUndefined();
    });

    it('should validate scope mismatch at runtime', async () => {
      const wrongScopeValue: Owned<string, 'wrong'> = createOwned({
        value: 'test',
        scope: 'wrong',
      });

      await scope('correct', async (ctx) => {
        expect(() => {
          // @ts-expect-error - Testing runtime validation
          ctx.use(wrongScopeValue);
        }).toThrow(/Scope mismatch/);
      });
    });

    it('should handle concurrent scope operations', async () => {
      const results = await Promise.all([
        scope('concurrent-1', async () => 'result-1'),
        scope('concurrent-2', async () => 'result-2'),
        scope('concurrent-3', async () => 'result-3'),
      ]);

      expect(results).toEqual(['result-1', 'result-2', 'result-3']);
    });
  });
});
