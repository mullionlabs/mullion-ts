# ScopeStack Examples

This document provides comprehensive examples demonstrating ScopeStack's capabilities for type-safe LLM context management.

## Table of Contents

- [Basic Concepts](#basic-concepts)
- [Real-World Use Cases](#real-world-use-cases)
- [Security Patterns](#security-patterns)
- [Error Handling](#error-handling)
- [Advanced Patterns](#advanced-patterns)
- [ESLint Integration](#eslint-integration)

## Basic Concepts

### Simple Scoped Execution

```typescript
import { createScopeStackClient } from '@scopestack/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const client = createScopeStackClient(openai('gpt-4'));

// Basic schema for email analysis
const EmailSchema = z.object({
  intent: z.enum(['question', 'complaint', 'compliment', 'request']),
  urgency: z.enum(['low', 'medium', 'high']),
  topics: z.array(z.string()),
});

// Process email in isolated scope
const result = await client.scope('email-analysis', async (ctx) => {
  const analysis = await ctx.infer(EmailSchema, emailText);

  console.log(`Analysis confidence: ${analysis.confidence}`);
  console.log(`Scope: ${analysis.__scope}`);
  console.log(`Trace ID: ${analysis.traceId}`);

  return ctx.use(analysis); // Extract value safely
});
```

### Bridging Between Scopes

```typescript
// Process data across security boundaries
const pipeline = await client.scope('ingestion', async (ingestCtx) => {
  const rawData = await ingestCtx.infer(RawDataSchema, input);

  // Move to processing scope with explicit bridge
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

## Real-World Use Cases

### Customer Support Automation

```typescript
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

async function processSupportTicket(
  customerMessage: string
): Promise<SupportResponse> {
  // Step 1: Analyze the ticket
  const ticketAnalysis = await client.scope('ticket-analysis', async (ctx) => {
    const analysis = await ctx.infer(SupportTicketSchema, customerMessage);

    if (analysis.confidence < 0.85) {
      throw new Error(
        `Low confidence analysis: ${analysis.confidence.toFixed(2)}`
      );
    }

    return ctx.use(analysis);
  });

  // Step 2: Generate appropriate response
  const response = await client.scope('response-generation', async (ctx) => {
    // Bridge ticket data to response scope
    const bridgedTicket = ctx.bridge(ticketAnalysis);

    const responseData = await ctx.infer(
      ResponseSchema,
      `Generate a response for a ${bridgedTicket.priority} priority ` +
        `${bridgedTicket.category} ticket with ${bridgedTicket.sentiment} sentiment`
    );

    if (responseData.confidence < 0.8) {
      // Fallback to human agent
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

  return response;
}
```

### Document Processing Pipeline

```typescript
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
    })
  ),
});

async function processDocument(
  documentText: string
): Promise<ProcessedDocument> {
  // Step 1: Extract metadata
  const metadata = await client.scope('metadata-extraction', async (ctx) => {
    const result = await ctx.infer(DocumentMetadataSchema, documentText);

    if (result.confidence < 0.7) {
      console.warn(`Low metadata confidence: ${result.confidence}`);
    }

    return ctx.use(result);
  });

  // Step 2: Classify security level
  const classification = await client.scope(
    'security-classification',
    async (ctx) => {
      // Bridge metadata for context
      const bridgedMetadata = ctx.bridge(metadata);

      const result = await ctx.infer(
        DocumentClassificationSchema,
        `Classify document: ${bridgedMetadata.documentType} - ${documentText.substring(0, 1000)}`
      );

      // High confidence required for security classification
      if (result.confidence < 0.9) {
        throw new Error(
          `Security classification requires high confidence (got ${result.confidence})`
        );
      }

      return ctx.use(result);
    }
  );

  // Step 3: Generate summary (only if not restricted)
  let summary = null;

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
      summary: summary?.summary.traceId,
    },
  };
}
```

### Multi-Tenant SaaS Platform

```typescript
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

async function processUserRequest(
  query: string,
  tenant: TenantContext
): Promise<TenantResponse> {
  // Each tenant gets completely isolated scope
  return await client.scope(`tenant-${tenant.tenantId}`, async (tenantCtx) => {
    // Parse user intent
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

    // Check permissions for requested action
    if (!tenant.permissions.includes(userIntent.intent)) {
      return {
        type: 'permission_denied',
        message: `You don't have permission to ${userIntent.intent}`,
        requiredPermission: userIntent.intent,
      };
    }

    // Process based on data region compliance
    return await client.scope(
      `${tenant.dataRegion}-processing`,
      async (regionCtx) => {
        // Bridge tenant-specific data to region-specific processing
        const bridgedIntent = regionCtx.bridge(userIntent);

        const result = await regionCtx.infer(
          z.object({
            response: z.string(),
            dataUsed: z.array(z.string()),
            complianceNotes: z.string(),
          }),
          `Process ${bridgedIntent.intent} request for tenant in ${tenant.dataRegion}`
        );

        return {
          type: 'success',
          response: regionCtx.use(result),
          tenantId: tenant.tenantId,
          region: tenant.dataRegion,
          traceId: result.traceId,
        };
      }
    );
  });
}
```

## Security Patterns

### Admin/User Boundary Enforcement

```typescript
// ❌ DANGEROUS: Direct admin data exposure
async function badExample(adminToken: string, userQuery: string) {
  const adminData = await adminSystem.query(adminToken);
  return await llm.respond(userQuery, adminData); // 🚨 LEAK!
}

// ✅ SAFE: ScopeStack boundary enforcement
async function safeExample(adminToken: string, userQuery: string) {
  const adminInsights = await client.scope('admin', async (adminCtx) => {
    const data = await adminCtx.infer(AdminDataSchema, adminToken);

    // Process sensitive admin data
    const insights = await adminCtx.infer(InsightsSchema, data.value);
    return adminCtx.use(insights);
  });

  return await client.scope('user-facing', async (userCtx) => {
    // Only specific insights are bridged, not raw admin data
    const safeInsights = userCtx.bridge(adminInsights);

    const response = await userCtx.infer(
      UserResponseSchema,
      `Based on system insights: ${safeInsights.summary}, respond to: ${userQuery}`
    );

    return userCtx.use(response);
  });
}
```

### Data Classification Pipeline

```typescript
const DataClassificationSchema = z.object({
  classification: z.enum(['public', 'internal', 'confidential', 'secret']),
  containsPII: z.boolean(),
  containsFinancialData: z.boolean(),
  containsHealthData: z.boolean(),
  geographicRestrictions: z.array(z.string()),
  retentionRequirements: z.string(),
});

async function classifyAndProcess(data: string): Promise<ClassificationResult> {
  // Step 1: Classify data sensitivity
  const classification = await client.scope('classification', async (ctx) => {
    const result = await ctx.infer(DataClassificationSchema, data);

    // Require very high confidence for classification
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

  if (classification.status === 'needs_human_review') {
    return classification;
  }

  // Step 2: Process based on classification
  const level = classification.classification.classification;

  if (level === 'secret') {
    // No automated processing for secret data
    return {
      status: 'processing_denied',
      reason: 'Secret classification requires manual handling',
    };
  }

  // Safe processing for lower classifications
  return await client.scope(`processing-${level}`, async (ctx) => {
    const bridgedClassification = ctx.bridge(classification.classification);

    const processing = await ctx.infer(
      z.object({
        summary: z.string(),
        recommendations: z.array(z.string()),
        safeguards: z.array(z.string()),
      }),
      `Process ${level} classified data with appropriate safeguards`
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

## Error Handling

### Confidence-Based Error Handling

```typescript
async function robustProcessing(input: string): Promise<ProcessingResult> {
  try {
    return await client.scope('processing', async (ctx) => {
      const result = await ctx.infer(ComplexSchema, input);

      // Tiered confidence handling
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
        // Try alternative processing
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

      // Low confidence - human review required
      return {
        status: 'human_review_required',
        confidence: result.confidence,
        partialResult: result.value,
        traceId: result.traceId,
      };
    });
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date(),
    };
  }
}
```

## Advanced Patterns

### Fork and Merge Pattern

```typescript
async function parallelAnalysis(document: string): Promise<MergedAnalysis> {
  // Process same document in parallel scopes for different aspects
  const [sentiment, topics, entities] = await Promise.all([
    // Sentiment analysis scope
    client.scope('sentiment-analysis', async (ctx) => {
      const result = await ctx.infer(SentimentSchema, document);
      return { sentiment: ctx.use(result), confidence: result.confidence };
    }),

    // Topic extraction scope
    client.scope('topic-extraction', async (ctx) => {
      const result = await ctx.infer(TopicSchema, document);
      return { topics: ctx.use(result), confidence: result.confidence };
    }),

    // Entity recognition scope
    client.scope('entity-recognition', async (ctx) => {
      const result = await ctx.infer(EntitySchema, document);
      return { entities: ctx.use(result), confidence: result.confidence };
    }),
  ]);

  // Merge results in dedicated scope
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
      })}`
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
        merged.confidence
      ),
    };
  });
}
```

## ESLint Integration

### Catching Common Mistakes

The ESLint plugin automatically catches these common mistakes:

```typescript
// ❌ ESLint will catch these violations

// 1. Context leaks
let leaked;
await client.scope('admin', async (ctx) => {
  leaked = await ctx.infer(Schema, input); // 🚨 storing outside scope
});

await client.scope('user', async (ctx) => {
  return leaked.value; // 🚨 using leaked data
});

// 2. Missing confidence checks
await client.scope('processing', async (ctx) => {
  const result = await ctx.infer(Schema, input);

  if (result.value.important) {
    // ⚠️ missing confidence check
    processImportantData(result.value);
  }
});

// 3. Cross-scope usage
await client.scope('scope-a', async (ctxA) => {
  const dataA = await ctxA.infer(Schema, input);

  await client.scope('scope-b', async (ctxB) => {
    return dataA.value; // 🚨 cross-scope usage without bridge
  });
});
```

### ESLint Configuration for Projects

```javascript
// eslint.config.js
import scopestack from 'eslint-plugin-scopestack';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      scopestack,
    },
    rules: {
      // Catch context leaks
      'scopestack/no-context-leak': 'error',

      // Warn about missing confidence checks
      'scopestack/require-confidence-check': 'warn',
    },
  },
];
```

## Getting Started

1. **Try the Basic Example**: Start with [examples/basic/](./examples/basic/) to see core concepts
2. **Run Integration Tests**: Follow [INTEGRATION_TEST_INSTRUCTIONS.md](./INTEGRATION_TEST_INSTRUCTIONS.md)
3. **Enable ESLint**: Add the plugin to catch leaks early
4. **Adapt Patterns**: Use these examples as templates for your use cases

For more examples and patterns, see the individual package documentation:

- [@scopestack/core](./packages/core/README.md)
- [@scopestack/ai-sdk](./packages/ai-sdk/README.md)
- [eslint-plugin-scopestack](./packages/eslint-plugin/README.md)
