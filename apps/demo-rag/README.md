# Mullion RAG Demo

Live demonstration of Mullion's fork/merge patterns and access control in a RAG system with sensitive data.

## Overview

This demo application shows how Mullion enforces role-based access control in a Retrieval-Augmented Generation system, preventing unauthorized access to confidential documents.

## Features

- **Access Control**: Three-tier access levels (Public, Internal, Confidential)
- **Fork/Merge**: Parallel document processing with cache optimization
- **Provenance Tracking**: Know exactly which documents influenced each answer
- **Smart Caching**: Provider-aware caching reduces costs and latency
- **Interactive UI**: Try different roles and queries to see access control in action

## Architecture

```
demo-rag/
├── app/                           # Nuxt v4 app directory
│   └── pages/
│       ├── index.vue              # Landing page with explanation
│       └── demo.vue               # Interactive demo with role selector
├── server/
│   └── api/
│       ├── query.post.ts          # RAG query endpoint
│       └── documents.get.ts       # Document listing endpoint
├── nuxt.config.ts
└── package.json
```

## Development

```bash
# Install dependencies
pnpm install

# Run dev server (port 3002)
pnpm dev

# Build for production
pnpm build

# Type check
pnpm typecheck
```

## How It Works

1. **Role Selection**: Choose your access level (Public/Internal/Confidential)
2. **Document Filtering**: Only documents matching your role are accessible
3. **Query Processing**: Enter a question to search the filtered document set
4. **Fork/Merge**: Mullion processes documents in parallel with caching
5. **Response Generation**: Get an answer with sources and provenance tracking

## Access Levels

- **Public**: Only public documents (1-2 documents)
- **Internal**: Public + Internal documents (4-5 documents)
- **Confidential**: All documents including confidential (6-8 documents)

## Using the Template

This app uses `@mullion/template-rag-sensitive-data` for the core logic:

```typescript
import {
  executeRAGPipeline,
  sampleDocuments,
} from '@mullion/template-rag-sensitive-data';

const result = await executeRAGPipeline(query, {
  accessLevel: role,
  providerConfig: {provider: 'mock'},
});
```

## Extending the Demo Base

This app extends the `demo-base` Nuxt layer, inheriting:

- UI components (Header, Cards, Badges, etc.)
- Auth composables (placeholder for Task 13.5)
- Rate limiting (placeholder for Task 13.5)
- Server utilities

## Features Demonstrated

### 1. Access Control

Documents are filtered by role before retrieval, ensuring users only see authorized content.

### 2. Fork/Merge Patterns

Multiple documents are processed in parallel branches that merge into a single coherent answer.

### 3. Cache Optimization

Repeated queries benefit from provider-aware caching (Anthropic prompt caching, etc.).

### 4. Provenance Tracking

See which specific documents contributed to each answer.

## Environment Variables

```bash
# .env.example
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
```

If no API key is provided, the template will use mock data for demonstration purposes.

## Deployment

Ready for deployment to Vercel:

1. Set environment variables in Vercel dashboard
2. Configure Google OAuth (Task 13.5)
3. Set up Vercel KV for rate limiting (Task 13.5)

## Status

**Task 13.4 Complete** ✅

- Landing page with RAG explanation and architecture diagram
- Interactive demo page with role selector
- API endpoints using RAG template
- Document filtering by access level
- Extends demo-base layer

**Pending:**

- Google OAuth integration (Task 13.5)
- Vercel KV rate limiting (Task 13.5)
- CI/CD deployment (Task 13.6)
