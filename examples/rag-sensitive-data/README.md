# Mullion Example: RAG with Sensitive Data

> **Scenario:** RAG pipeline with access-level aware document retrieval and classification.

This example demonstrates a **production-ready RAG (Retrieval-Augmented Generation) pipeline** that handles documents with different access levels using Mullion's type-safe context management.

## 🎯 Problem Statement

In enterprise RAG systems:

- **Documents have different access levels**: Public, Internal, Confidential
- **Users have different permissions**: Not everyone can access everything
- **Risk**: Leaking confidential data to unauthorized users
- **Challenge**: Enforcing access control throughout the RAG pipeline

**Traditional approach:** Runtime checks, manual filtering (error-prone, hard to audit)

**Mullion approach:** Type-safe scopes + access-level enforcement + compile-time validation

## 🔍 What You'll Learn

1. **Document Classification**: Using fork/merge for multi-model consensus
2. **Query Analysis**: Understanding user intent in scoped contexts
3. **Access Control**: Automatic filtering by user permissions
4. **Response Generation**: Creating answers with source attribution
5. **Pipeline Orchestration**: End-to-end RAG with confidence tracking
6. **Caching**: Performance optimization for repeated queries

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         RAG Pipeline                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Query + Access Level                                      │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────┐                                       │
│  │  Query Analysis      │  Scope: 'query-analysis'              │
│  │  - Extract intent    │  → Owned<QueryAnalysis, 'query...'>   │
│  │  - Determine access  │                                       │
│  └──────────────────────┘                                       │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────┐                                       │
│  │  Access Control      │  Check: user level >= required level  │
│  │  - Verify permission │  ✅ Continue or ⛔ Deny               │
│  └──────────────────────┘                                       │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────┐                                       │
│  │  Document Retrieval  │  Scope: 'retrieval'                   │
│  │  - Filter by access  │  → Only accessible documents          │
│  │  - Score relevance   │  → Top K results                      │
│  └──────────────────────┘                                       │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────┐                                       │
│  │  Response Generation │  Scope: 'generator'                   │
│  │  - Build context     │  → Owned<RAGResponse, 'generator'>    │
│  │  - Generate answer   │  → With source attribution            │
│  │  - Track confidence  │                                       │
│  └──────────────────────┘                                       │
│            │                                                    │
│            ▼                                                    │
│      Final Response                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Document Classification (Fork/Merge):
┌─────────────────────────────────────────────────────────────────┐
│  Document Content                                               │
│       │                                                         │
│       ▼                                                         │
│  ┌────────────────────────────────────────────────┐             │
│  │  Fork: Parallel Classification                 │             │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │             │
│  │  │ Model 1  │  │ Model 2  │  │ Model 3  │      │             │
│  │  │ "public" │  │ "public" │  │"internal"│      │             │
│  │  └──────────┘  └──────────┘  └──────────┘      │             │
│  └────────────────────────────────────────────────┘             │
│       │                                                         │
│       ▼                                                         │
│  ┌────────────────────────────────────────────────┐             │
│  │  Merge: Build Consensus                        │             │
│  │  - Most restrictive wins: "internal"           │             │
│  │  - Agreement score: 0.67 (2/3 agreed)          │             │
│  │  - Union of sensitive topics                   │             │
│  └────────────────────────────────────────────────┘             │
│       │                                                         │
│       ▼                                                         │
│  Classification Consensus                                       │
└─────────────────────────────────────────────────────────────────┘
```

## 📂 Files

```
examples/rag-sensitive-data/
├── src/
│   ├── schemas.ts            # Zod schemas for all data structures
│   ├── data/
│   │   └── sample-docs.ts    # Sample documents (public/internal/confidential)
│   ├── classifier.ts         # Document classification with fork/merge
│   ├── retriever.ts          # Query analysis + document retrieval
│   ├── generator.ts          # Response generation with caching
│   ├── pipeline.ts           # Complete RAG orchestration
│   └── index.ts              # Entry point with help
├── package.json
├── tsconfig.json
├── eslint.config.js
└── README.md                 # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
pnpm build
```

### 2. Set Up Environment (Optional)

```bash
cd examples/rag-sensitive-data
cp .env.example .env
# Edit .env and add your API key for OpenAI or Anthropic (optional - works without it)
```

**Note:** The example works without an API key by using mock data. To use a real LLM provider:

- For OpenAI: Set `OPENAI_API_KEY` in your `.env` file
- For Anthropic: Set `ANTHROPIC_API_KEY` in your `.env` file

The example will automatically detect which provider to use based on available API keys.

### 3. Run the Pipeline

```bash
npm run pipeline
```

**Output shows:**

- Which provider is being used (Mock/OpenAI/Anthropic)
- Query analysis (intent, keywords, required access)
- Access control check (granted/denied)
- Document retrieval (filtered by access level)
- Response generation (with source attribution)
- Metrics (confidence, execution time, access level used)

### 4. Run Individual Components

```bash
npm run classify      # Document classification demo
npm start             # Show help menu
npm run lint          # Check for context leaks
```

## 📖 Example Walkthrough

### Scenario 1: Public User Query

```typescript
const query: UserQuery = {
  query: 'What features does the product offer?',
  userAccessLevel: 'public',
};
```

**Pipeline execution:**

1. ✅ **Query Analysis**: Intent=question, requires=public access
2. ✅ **Access Check**: User has public access → GRANTED
3. ✅ **Retrieval**: 2 public documents found (product features, pricing)
4. ✅ **Response**: Generated answer citing public sources

**Result:** User gets product information from public documentation.

### Scenario 2: Internal User Query

```typescript
const query: UserQuery = {
  query: 'What is our Q4 product roadmap?',
  userAccessLevel: 'internal',
};
```

**Pipeline execution:**

1. ✅ **Query Analysis**: Intent=question, requires=internal access
2. ✅ **Access Check**: User has internal access → GRANTED
3. ✅ **Retrieval**: 1 internal document found (Q4 roadmap)
4. ✅ **Response**: Generated answer citing internal planning docs

**Result:** Employee gets roadmap information (not visible to public users).

### Scenario 3: Confidential User Query

```typescript
const query: UserQuery = {
  query: 'What were our Q3 financial results?',
  userAccessLevel: 'confidential',
};
```

**Pipeline execution:**

1. ✅ **Query Analysis**: Intent=question, requires=confidential access
2. ✅ **Access Check**: User has confidential access → GRANTED
3. ✅ **Retrieval**: 1 confidential document found (Q3 financials)
4. ✅ **Response**: Generated answer citing financial reports

**Result:** Executive gets financial data (not visible to other users).

### Scenario 4: Access Denied

```typescript
const query: UserQuery = {
  query: 'What were our Q3 financial results?',
  userAccessLevel: 'public', // ❌ Insufficient access
};
```

**Pipeline execution:**

1. ✅ **Query Analysis**: Intent=question, requires=confidential access
2. ⛔ **Access Check**: DENIED - User has public but needs confidential
3. ❌ **Error**: "Insufficient access: Query requires confidential level"

**Result:** Public user cannot access financial data.

## 🎓 Key Concepts

### Access Level Hierarchy

```typescript
public < internal < confidential

// Users can access their level and below:
- public user    → public docs only
- internal user  → public + internal docs
- confidential user → all docs
```

### Fork/Merge for Classification

```typescript
// Fork: Classify with multiple models in parallel
const results = await fork(client, 'classifier', {
  strategy: 'fast-parallel',
  branches: {
    model1: async (ctx) => await ctx.infer(Classification, prompt),
    model2: async (ctx) => await ctx.infer(Classification, prompt),
    model3: async (ctx) => await ctx.infer(Classification, prompt),
  },
});

// Merge: Build consensus (most restrictive wins)
const consensus = buildConsensus(results);
```

### Scoped Pipeline Stages

Each pipeline stage runs in its own scope:

```typescript
// Query analysis scope
const analysis = await client.scope('query-analysis', async (ctx) => {
  return await ctx.infer(QueryAnalysis, prompt);
});

// Generator scope
const response = await client.scope('generator', async (ctx) => {
  return await ctx.infer(RAGResponse, prompt);
});

// Scopes are isolated - data flows explicitly
```

### Confidence Tracking

```typescript
// Every inference has confidence
const analysis = await ctx.infer(QueryAnalysis, prompt);
console.log(analysis.confidence); // 0.85

// Use confidence to make decisions
if (analysis.confidence < 0.7) {
  console.log('Low confidence - flagging for review');
}
```

## 🛡️ How Mullion Protects You

### Compile-Time Protection (TypeScript)

```typescript
// Type error: Cannot use data from wrong scope
const publicData: Owned<Data, 'public'> = ...;
const internalResult = internalCtx.use(publicData); // TS Error!

// ✅ Must bridge first
const bridged = internalCtx.bridge(publicData);
const internalResult = internalCtx.use(bridged); // ✅ OK
```

### Runtime Protection (Access Control)

```typescript
// Automatic filtering by access level
const accessibleDocs = filterDocumentsByAccess(allDocuments, userAccessLevel);

// Users only see what they're allowed to see
```

### Audit Trail (Tracing)

Every operation is traceable:

- `__scope`: Which scopes touched this data
- `traceId`: OpenTelemetry trace ID
- `confidence`: Quality score for the inference

## 🧪 Testing

Run the examples:

```bash
npm run pipeline  # Complete RAG pipeline
npm run classify  # Document classification demo
npm run lint      # ESLint validation
```

> **Note:** TypeScript typecheck is intentionally skipped for this example due to AI SDK version mismatches in the monorepo. The code works correctly at runtime. In a real project with published packages, these type errors would not occur.

## 🔧 Advanced Features

### Caching

```typescript
// Cache system prompt and document context (Anthropic)
const response = await ctx.infer(RAGResponse, userPrompt, {
  cache: {
    systemPrompt: { content: systemPrompt, ttl: '1h' },
    documentContext: { content: context, ttl: '5m' },
  },
});
```

### Custom Merge Strategies

```typescript
// Use different merge strategies
const results = await fork(client, 'classifier', {
  strategy: 'cache-optimized', // or 'fast-parallel'
  branches: {
    /* ... */
  },
});
```

### Cost Tracking

```typescript
// Track costs across pipeline
const cost = ctx.getCostStats();
console.log(`Total cost: $${cost.totalCost}`);
console.log(`Cache savings: $${cost.cacheSavings}`);
```

## 📊 Real-World Benefits

**Without Mullion:**

- Manual access control checks (error-prone)
- No type safety for access levels
- Hard to audit data flows
- Difficult to track confidence across pipeline
- Cache management is manual

**With Mullion:**

- ✅ Automatic access filtering
- ✅ Type-safe scope enforcement
- ✅ Built-in tracing and auditing
- ✅ Confidence tracking throughout
- ✅ Provider-aware caching

## 🔗 Related Examples

- [Helpdesk Leak Prevention](../helpdesk-leak-prevention/) - Scope isolation basics
- [Basic Example](../basic/) - Core Mullion concepts

## 📖 Learn More

- [Mullion Documentation](https://github.com/mullionlabs/mullion-ts)
- [Fork/Merge Patterns](../../packages/core/README.md#forkmarge)
- [Caching Guide](../../packages/ai-sdk/README.md#caching)
- [Cost Tracking](../../packages/ai-sdk/README.md#cost-tracking)

## 🐛 Issues?

Report issues at: https://github.com/mullionlabs/mullion-ts/issues

---

**Next Steps:**

1. ✅ Run `npm run pipeline` - See complete RAG flow
2. 🔍 Read `src/pipeline.ts` - Study orchestration
3. 📚 Explore `src/classifier.ts` - See fork/merge pattern
4. 🔐 Review `src/retriever.ts` - Understand access control
5. 💬 Check `src/generator.ts` - Learn about caching
