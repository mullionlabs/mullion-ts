# Examples (deep dive)

This page contains comprehensive examples showing how to use Mullion for **type-safe context management**, **trust boundaries**, and **auditable LLM outputs** in TypeScript.

> Note: Some examples use simplified pseudo-workflows for clarity.
> API details may evolve while Mullion is pre-release. Prefer the canonical docs for concepts and lint rules:
>
> - Concepts: [Core concepts](../reference/concepts.md)
> - Security model: [Security model](./security-model.md)
> - ESLint plugin: [ESLint plugin](../reference/eslint-plugin.md)

---

## Table of contents

- [Basic concepts](#basic-concepts)
  - [Simple scoped execution](#simple-scoped-execution)
  - [Bridging between scopes](#bridging-between-scopes)
- [Real-world use cases](#real-world-use-cases)
  - [Customer support automation](#customer-support-automation)
  - [Document processing pipeline](#document-processing-pipeline)
  - [Multi-tenant SaaS platform](#multi-tenant-saas-platform)
- [Security patterns](#security-patterns)
  - [Admin/user boundary enforcement](#adminuser-boundary-enforcement)
  - [Data classification pipeline](#data-classification-pipeline)
- [Error handling](#error-handling)
  - [Confidence-based handling](#confidence-based-handling)
- [Advanced patterns](#advanced-patterns)
  - [Parallel analysis (fork/merge mental model)](#parallel-analysis-forkmerge-mental-model)
- [ESLint integration](#eslint-integration)
  - [Catching common mistakes](#catching-common-mistakes)
  - [Flat config example](#flat-config-example)
- [Getting started](#getting-started)

---

## Basic concepts

### Simple scoped execution

```ts
import {createMullionClient} from '@mullion/ai-sdk';
import {openai} from '@ai-sdk/openai';
import {z} from 'zod';

const client = createMullionClient(openai('gpt-4o-mini'));

const EmailSchema = z.object({
  intent: z.enum(['question', 'complaint', 'compliment', 'request']),
  urgency: z.enum(['low', 'medium', 'high']),
  topics: z.array(z.string()),
});

const result = await client.scope('email-analysis', async (ctx) => {
  const analysis = await ctx.infer(EmailSchema, emailText);

  console.log(`Analysis confidence: ${analysis.confidence}`);
  console.log(`Scope: ${analysis.__scope}`);
  console.log(`Trace ID: ${analysis.traceId}`);

  // ctx.use(...) marks the value as intentionally used/returned by this scope
  return ctx.use(analysis);
});
```

### Bridging between scopes

Use `bridge()` when moving a value across a boundary.

```ts
const pipeline = await client.scope('ingestion', async (ingestCtx) => {
  const rawData = await ingestCtx.infer(RawDataSchema, input);

  return await client.scope('processing', async (processCtx) => {
    const bridged = processCtx.bridge(rawData);

    const processed = await processCtx.infer(ProcessedSchema, bridged.value);

    return {
      original: bridged,
      processed: processCtx.use(processed),
    };
  });
});
```

---

## Real-world use cases

### Customer support automation

```ts
import {z} from 'zod';

const SupportTicketSchema = z.object({
  category: z.enum(['billing', 'technical', 'account', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'frustrated']),
  summary: z.string().max(200),
  suggestedActions: z.array(z.string()),
  requiresHuman: z.boolean(),
});

const ResponseSchema = z.object({
  message: z.string(),
  tone: z.enum(['professional', 'empathetic', 'technical']),
  includeEscalation: z.boolean(),
  estimatedResolutionTime: z.string().optional(),
});

async function processSupportTicket(customerMessage: string) {
  // Step 1: analyze the ticket
  const ticketAnalysis = await client.scope('ticket-analysis', async (ctx) => {
    const analysis = await ctx.infer(SupportTicketSchema, customerMessage);

    if (analysis.confidence < 0.85) {
      throw new Error(
        `Low confidence analysis: ${analysis.confidence.toFixed(2)}`,
      );
    }

    return ctx.use(analysis);
  });

  // Step 2: generate a response in a separate scope
  return await client.scope('response-generation', async (ctx) => {
    const bridgedTicket = ctx.bridge(ticketAnalysis);

    const responseData = await ctx.infer(
      ResponseSchema,
      `Generate a response for a ${bridgedTicket.priority} priority ` +
        `${bridgedTicket.category} ticket with ${bridgedTicket.sentiment} sentiment`,
    );

    if (responseData.confidence < 0.8) {
      // fallback to human agent
      return {
        type: 'escalated',
        reason: 'Low confidence in automated response',
        ticketData: bridgedTicket,
        traceId: responseData.traceId,
      };
    }

    return {
      type: 'automated',
      response: ctx.use(responseData),
      ticketAnalysis: bridgedTicket,
    };
  });
}
```

### Document processing pipeline

```ts
import {z} from 'zod';

const DocumentMetadataSchema = z.object({
  title: z.string(),
  author: z.string().optional(),
  created: z.string().optional(),
  documentType: z.enum(['contract', 'invoice', 'receipt', 'memo', 'report']),
  pageCount: z.number().optional(),
});

const DocumentClassificationSchema = z.object({
  confidentialityLevel: z.enum([
    'public',
    'internal',
    'confidential',
    'restricted',
  ]),
  department: z.array(z.string()),
  containsPII: z.boolean(),
  retentionPeriod: z.enum(['1year', '3years', '7years', 'permanent']),
  approvalRequired: z.boolean(),
});

const DocumentSummarySchema = z.object({
  summary: z.string().max(500),
  keyPoints: z.array(z.string()),
  actionItems: z.array(z.string()),
  deadlines: z.array(
    z.object({
      task: z.string(),
      date: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
    }),
  ),
});

async function processDocument(documentText: string) {
  // Step 1: extract metadata
  const metadata = await client.scope('metadata-extraction', async (ctx) => {
    const result = await ctx.infer(DocumentMetadataSchema, documentText);
    if (result.confidence < 0.7)
      console.warn(`Low metadata confidence: ${result.confidence}`);
    return ctx.use(result);
  });

  // Step 2: classify security level (high confidence recommended)
  const classification = await client.scope(
    'security-classification',
    async (ctx) => {
      const bridgedMetadata = ctx.bridge(metadata);

      const result = await ctx.infer(
        DocumentClassificationSchema,
        `Classify document: ${bridgedMetadata.documentType} - ${documentText.substring(0, 1000)}`,
      );

      if (result.confidence < 0.9) {
        throw new Error(
          `Security classification requires high confidence (got ${result.confidence})`,
        );
      }

      return ctx.use(result);
    },
  );

  // Step 3: generate summary (only if not restricted)
  let summary: null | {
    summary: unknown;
    metadata: unknown;
    classification: unknown;
  } = null;

  if (classification.confidentialityLevel !== 'restricted') {
    summary = await client.scope('summarization', async (ctx) => {
      const bridgedMeta = ctx.bridge(metadata);
      const bridgedClass = ctx.bridge(classification);

      const result = await ctx.infer(DocumentSummarySchema, documentText);

      return {
        summary: ctx.use(result),
        metadata: bridgedMeta,
        classification: bridgedClass,
      };
    });
  }

  return {
    metadata,
    classification,
    summary,
    processed: new Date(),
    traceIds: {
      metadata: metadata.traceId,
      classification: classification.traceId,
      summary: (summary as any)?.summary?.traceId,
    },
  };
}
```

### Multi-tenant SaaS platform

```ts
import {z} from 'zod';

interface TenantContext {
  tenantId: string;
  userId: string;
  permissions: string[];
  dataRegion: 'us' | 'eu' | 'asia';
}

const UserQuerySchema = z.object({
  intent: z.enum(['query', 'analysis', 'report', 'export']),
  entities: z.array(z.string()),
  timeframe: z.string().optional(),
  filters: z.object({}).optional(),
});

async function processUserRequest(query: string, tenant: TenantContext) {
  // Each tenant gets an isolated scope
  return await client.scope(`tenant-${tenant.tenantId}`, async (tenantCtx) => {
    const intent = await tenantCtx.infer(UserQuerySchema, query);

    if (intent.confidence < 0.8) {
      return {
        type: 'clarification_needed',
        message: 'Could you please rephrase your request?',
        confidence: intent.confidence,
        traceId: intent.traceId,
      };
    }

    const userIntent = tenantCtx.use(intent);

    if (!tenant.permissions.includes(userIntent.intent)) {
      return {
        type: 'permission_denied',
        message: `You don't have permission to ${userIntent.intent}`,
        requiredPermission: userIntent.intent,
      };
    }

    // Region-specific compliance boundary
    return await client.scope(
      `${tenant.dataRegion}-processing`,
      async (regionCtx) => {
        const bridgedIntent = regionCtx.bridge(userIntent);

        const result = await regionCtx.infer(
          z.object({
            response: z.string(),
            dataUsed: z.array(z.string()),
            complianceNotes: z.string(),
          }),
          `Process ${bridgedIntent.intent} request for tenant in ${tenant.dataRegion}`,
        );

        return {
          type: 'success',
          response: regionCtx.use(result),
          tenantId: tenant.tenantId,
          region: tenant.dataRegion,
          traceId: result.traceId,
        };
      },
    );
  });
}
```

---

## Security patterns

### Admin/user boundary enforcement

```ts
// ❌ DANGEROUS: direct admin data exposure
async function badExample(adminToken: string, userQuery: string) {
  const adminData = await adminSystem.query(adminToken);
  return await llm.respond(userQuery, adminData); // LEAK!
}

// ✅ SAFE: Mullion boundary enforcement
async function safeExample(adminToken: string, userQuery: string) {
  const adminInsights = await client.scope('admin', async (adminCtx) => {
    const data = await adminCtx.infer(AdminDataSchema, adminToken);

    const insights = await adminCtx.infer(InsightsSchema, data.value);
    return adminCtx.use(insights);
  });

  return await client.scope('user-facing', async (userCtx) => {
    const safeInsights = userCtx.bridge(adminInsights);

    const response = await userCtx.infer(
      UserResponseSchema,
      `Based on system insights: ${safeInsights.summary}, respond to: ${userQuery}`,
    );

    return userCtx.use(response);
  });
}
```

### Data classification pipeline

```ts
import {z} from 'zod';

const DataClassificationSchema = z.object({
  classification: z.enum(['public', 'internal', 'confidential', 'secret']),
  containsPII: z.boolean(),
  containsFinancialData: z.boolean(),
  containsHealthData: z.boolean(),
  geographicRestrictions: z.array(z.string()),
  retentionRequirements: z.string(),
});

async function classifyAndProcess(data: string) {
  const classification = await client.scope('classification', async (ctx) => {
    const result = await ctx.infer(DataClassificationSchema, data);

    if (result.confidence < 0.95) {
      return {
        status: 'needs_human_review',
        reason: 'Low confidence classification',
        preliminaryClassification: result.value,
        confidence: result.confidence,
        traceId: result.traceId,
      };
    }

    return {
      status: 'classified',
      classification: ctx.use(result),
      confidence: result.confidence,
    };
  });

  if ((classification as any).status === 'needs_human_review') {
    return classification;
  }

  const level = (classification as any).classification.classification;

  if (level === 'secret') {
    return {
      status: 'processing_denied',
      reason: 'Secret classification requires manual handling',
    };
  }

  return await client.scope(`processing-${level}`, async (ctx) => {
    const bridgedClassification = ctx.bridge(
      (classification as any).classification,
    );

    const processing = await ctx.infer(
      z.object({
        summary: z.string(),
        recommendations: z.array(z.string()),
        safeguards: z.array(z.string()),
      }),
      `Process ${level} classified data with appropriate safeguards`,
    );

    return {
      status: 'processed',
      result: ctx.use(processing),
      classification: bridgedClassification,
      processedScope: `processing-${level}`,
    };
  });
}
```

---

## Error handling

### Confidence-based handling

```ts
async function robustProcessing(input: string) {
  try {
    return await client.scope('processing', async (ctx) => {
      const result = await ctx.infer(ComplexSchema, input);

      if (result.confidence >= 0.95) {
        return {
          status: 'high_confidence',
          result: ctx.use(result),
          confidence: result.confidence,
        };
      }

      if (result.confidence >= 0.8) {
        return {
          status: 'medium_confidence',
          result: ctx.use(result),
          confidence: result.confidence,
          warning: 'Consider manual review',
        };
      }

      if (result.confidence >= 0.6) {
        const alternative = await ctx.infer(SimpleSchema, input);
        if (alternative.confidence >= 0.8) {
          return {
            status: 'alternative_processing',
            result: ctx.use(alternative),
            confidence: alternative.confidence,
            note: 'Used simplified analysis',
          };
        }
      }

      return {
        status: 'human_review_required',
        confidence: result.confidence,
        partialResult: result.value,
        traceId: result.traceId,
      };
    });
  } catch (error: any) {
    return {
      status: 'error',
      error: String(error?.message ?? error),
      timestamp: new Date(),
    };
  }
}
```

---

## Advanced patterns

### Parallel analysis (fork/merge mental model)

If you want "same context, multiple analyses", you can run parallel scopes and merge results.
(If your adapter supports it, prefer Mullion's `fork()` strategy; see [Patterns & recipes](./patterns.md).)

```ts
async function parallelAnalysis(document: string) {
  const [sentiment, topics, entities] = await Promise.all([
    client.scope('sentiment-analysis', async (ctx) => {
      const result = await ctx.infer(SentimentSchema, document);
      return {sentiment: ctx.use(result), confidence: result.confidence};
    }),
    client.scope('topic-extraction', async (ctx) => {
      const result = await ctx.infer(TopicSchema, document);
      return {topics: ctx.use(result), confidence: result.confidence};
    }),
    client.scope('entity-recognition', async (ctx) => {
      const result = await ctx.infer(EntitySchema, document);
      return {entities: ctx.use(result), confidence: result.confidence};
    }),
  ]);

  return await client.scope('analysis-merger', async (ctx) => {
    const bridgedSentiment = ctx.bridge(sentiment);
    const bridgedTopics = ctx.bridge(topics);
    const bridgedEntities = ctx.bridge(entities);

    const merged = await ctx.infer(
      z.object({
        overallSentiment: z.string(),
        primaryTopics: z.array(z.string()),
        keyEntities: z.array(z.string()),
        documentSummary: z.string(),
        confidence: z.number(),
      }),
      `Merge analysis results: ${JSON.stringify({
        sentiment: bridgedSentiment.sentiment,
        topics: bridgedTopics.topics,
        entities: bridgedEntities.entities,
      })}`,
    );

    return {
      merged: ctx.use(merged),
      sources: {
        sentiment: bridgedSentiment,
        topics: bridgedTopics,
        entities: bridgedEntities,
      },
      overallConfidence: Math.min(
        bridgedSentiment.confidence,
        bridgedTopics.confidence,
        bridgedEntities.confidence,
        merged.confidence,
      ),
    };
  });
}
```

---

## ESLint integration

### Catching common mistakes

The ESLint plugin is designed to catch mistakes like:

```ts
// 1) Context leak via outer variable
let leaked;
await client.scope('admin', async (ctx) => {
  leaked = await ctx.infer(Schema, input);
});
await client.scope('user', async (ctx) => {
  return leaked.value; // ❌ leak
});

// 2) Missing confidence check before side effects
await client.scope('processing', async (ctx) => {
  const result = await ctx.infer(Schema, input);
  if (result.value.important) {
    processImportantData(result.value); // ⚠️ missing confidence check
  }
});

// 3) Cross-scope usage without bridge
await client.scope('scope-a', async (ctxA) => {
  const dataA = await ctxA.infer(Schema, input);
  await client.scope('scope-b', async (ctxB) => {
    return dataA.value; // ❌ cross-scope usage without bridge
  });
});
```

For rule docs and canonical configuration, see: [ESLint plugin](../reference/eslint-plugin.md).

### Flat config example

```js
// eslint.config.mjs
import mullion from '@mullion/eslint-plugin';

export default [
  {
    plugins: {mullion},
    rules: {
      // Example rule names — see the plugin README / reference docs for canonical names.
      // 'mullion/no-context-leak': 'error',
      // 'mullion/require-confidence-check': 'warn',
    },
  },
];
```

---

## Getting started

1. **Try the basic example:** [Basic example](../../examples/basic/)
2. **Run integration tests:** [Integration tests](../../docs/contributing/integration-tests.md)
3. **Enable ESLint:** [ESLint plugin](../reference/eslint-plugin.md)
4. **Adapt patterns:** use these examples as templates

For package-specific docs (once stabilized), see:

- [@mullion/core README](../../packages/core/README.md)
- [@mullion/ai-sdk README](../../packages/ai-sdk/README.md)
- [@mullion/eslint-plugin README](../../packages/eslint-plugin/README.md)
