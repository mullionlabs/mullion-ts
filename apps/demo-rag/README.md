# Mullion RAG Demo

Interactive demonstration of Mullion's fork/merge patterns and access control in a RAG system with sensitive data.

## Live Demo

📚 **[Try it live](https://mullion-demo-rag.vercel.app)** (Requires Google sign-in, 20 requests/day)

## What This Demo Shows

This application demonstrates how Mullion enforces role-based access control in a Retrieval-Augmented Generation (RAG) system:

- **Access Control**: Three-tier access levels prevent unauthorized document access
- **Fork/Merge**: Parallel document processing with intelligent cache optimization
- **Provenance Tracking**: Know exactly which documents influenced each answer
- **Smart Caching**: Provider-aware caching reduces costs and latency
- **Cost Tracking**: Real-time token usage and cost estimation

## Features

- ✅ **Role-Based Access** - Public, Internal, Confidential document filtering
- ✅ **Fork/Merge Patterns** - Parallel document processing with cache warmup
- ✅ **Provenance Tracking** - Source document attribution for each response
- ✅ **Cost Tracking** - Real-time token usage and cost estimation
- ✅ **Google OAuth** - Secure authentication
- ✅ **Rate Limiting** - 20 requests per day per user (Vercel KV)

## Tech Stack

- **Framework**: [Nuxt 3](https://nuxt.com/) + [Nuxt UI](https://ui.nuxt.com/)
- **LLM Integration**: [@mullion/ai-sdk](../../packages/ai-sdk) + [Vercel AI SDK](https://sdk.vercel.ai/)
- **Scenario Logic**: [@mullion/template-rag-sensitive-data](../../examples/rag-sensitive-data)
- **Provider**: OpenAI GPT-4o-mini
- **Authentication**: Google OAuth via [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils)
- **Rate Limiting**: Vercel KV (Redis)

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- OpenAI API key
- Google OAuth credentials (for authentication)

### Setup

1. **Clone the monorepo** (if not already):

   ```bash
   git clone https://github.com/mullionlabs/mullion-ts.git
   cd mullion-ts
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Build Mullion packages**:

   ```bash
   pnpm build
   ```

4. **Configure environment variables**:

   Create `apps/demo-rag/.env`:

   ```bash
   # OpenAI API Key (required)
   OPENAI_API_KEY=sk-proj-...

   # Google OAuth (required for authentication)
   NUXT_OAUTH_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your-client-secret

   # Session secret (generate a random string)
   NUXT_SESSION_SECRET=your-random-secret-here

   # LLM Model (optional, defaults to gpt-4o-mini)
   NUXT_LLM_MODEL_NAME=gpt-4o-mini

   # Vercel KV (optional, uses in-memory store if not set)
   KV_REST_API_URL=https://...
   KV_REST_API_TOKEN=...
   ```

5. **Get Google OAuth credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or use existing)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:3000/api/auth/google`

6. **Run development server**:

   ```bash
   pnpm --filter demo-rag dev
   ```

7. **Open browser**: http://localhost:3000

## Project Structure

```
apps/demo-rag/
├── app/
│   ├── components/           # Shared with demo-base layer
│   ├── composables/          # Shared with demo-base layer
│   ├── layouts/              # Shared with demo-base layer
│   └── pages/
│       ├── index.vue         # Landing page with RAG explanation
│       └── demo.vue          # Interactive demo (protected)
├── server/
│   ├── api/
│   │   ├── query.post.ts     # RAG query endpoint
│   │   └── documents.get.ts  # Document listing endpoint
│   ├── routes/
│   │   └── auth/             # OAuth routes (shared with demo-base)
│   └── utils/                # Auth & rate limiting (shared with demo-base)
├── nuxt.config.ts
├── package.json
└── README.md
```

## How It Works

### 1. Role Selection

Choose your access level:

- **Public**: Access only public documents
- **Internal**: Access public + internal documents
- **Confidential**: Access all documents

### 2. Document Filtering

```typescript
// server/api/documents.get.ts
import {sampleDocuments} from '@mullion/template-rag-sensitive-data';

// Filter documents by access level hierarchy
const accessibleDocs = sampleDocuments.filter(
  (doc) => accessLevelHierarchy[doc.accessLevel] <= accessLevelHierarchy[role],
);
```

### 3. Query Processing

```typescript
// server/api/query.post.ts
import {executeRAGPipeline} from '@mullion/template-rag-sensitive-data';

const result = await executeRAGPipeline(
  {
    query,
    userAccessLevel: role,
    context: 'Demo app query',
  },
  {
    verbose: false,
  },
);
```

### 4. Fork/Merge with Cache Optimization

The RAG pipeline:

1. Classifies query relevance for each document
2. Forks processing across relevant documents in parallel
3. Uses cache warmup for optimal performance
4. Merges results into a coherent answer with source attribution

### 5. Response with Provenance

The response includes:

- Generated answer based on filtered documents
- Source document references
- Confidence score
- Token usage and estimated cost

## Access Level Hierarchy

The demo enforces a three-tier access hierarchy:

```
Public (Level 0)
  └── Can access: Public documents only

Internal (Level 1)
  └── Can access: Public + Internal documents

Confidential (Level 2)
  └── Can access: All documents (Public + Internal + Confidential)
```

## Example Queries

### Public Role

"What features does the product offer?"
"How do I get started with the platform?"

### Internal Role

"What is our product roadmap for Q4?"
"What are our employee benefits?"

### Confidential Role

"What were our Q3 financial results?"
"Tell me about the security incident in January"

## Deployment

### Deploy to Vercel

1. **Push to GitHub** (if not already)

2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Set Root Directory: `apps/demo-rag`
   - Framework Preset: Nuxt.js

3. **Configure Environment Variables**:

   ```
   OPENAI_API_KEY=sk-proj-...
   NUXT_OAUTH_GOOGLE_CLIENT_ID=...
   NUXT_OAUTH_GOOGLE_CLIENT_SECRET=...
   NUXT_SESSION_SECRET=...
   NUXT_LLM_MODEL_NAME=gpt-4o-mini
   ```

4. **Create Vercel KV Database**:
   - In Vercel project → Storage → Create Database → KV
   - Select your project to connect
   - Environment variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) added automatically

5. **Update Google OAuth redirect URI**:
   - Add production URL: `https://your-app.vercel.app/api/auth/google`

6. **Deploy**: Vercel will automatically deploy on push to main branch

### CI/CD

Automated deployment is configured via `.github/workflows/demo-deploy.yml`.

See [Vercel Deployment Guide](../../.github/VERCEL_DEPLOYMENT.md) for setup instructions.

## Key Files

| File                          | Purpose                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| `app/pages/demo.vue`          | Interactive demo UI with role selector and query input          |
| `server/api/query.post.ts`    | RAG query endpoint using `@mullion/template-rag-sensitive-data` |
| `server/api/documents.get.ts` | Document listing with access control                            |
| `nuxt.config.ts`              | Extends `demo-base` layer for shared components                 |
| `package.json`                | Dependencies including `@mullion/template-rag-sensitive-data`   |

## Troubleshooting

### "Not authenticated" error

- Make sure you've configured Google OAuth credentials
- Check that redirect URI matches your environment
- Verify `NUXT_OAUTH_GOOGLE_CLIENT_ID` and `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` are set

### "Rate limit exceeded" error

- Each user gets 20 requests per day
- Rate limit resets at midnight UTC
- For local development, you can increase the limit in `apps/demo-base/server/utils/rate-limit.ts`

### Empty or incorrect responses

- Verify `OPENAI_API_KEY` is set correctly
- Check that you're using a supported model (gpt-4o, gpt-4o-mini)
- Try different queries - some questions may not match any documents

### Cost tracking shows $0.00

- Verify `@mullion/ai-sdk` is built: `pnpm build`
- Check that model name matches pricing data in `packages/ai-sdk/src/cost/pricing.ts`

## Related

- [Demo Helpdesk App](../demo-helpdesk) - Scope isolation in customer support
- [Demo Base Layer](../demo-base) - Shared UI components and utilities
- [RAG Template](../../examples/rag-sensitive-data) - Core scenario logic
- [Mullion Core](../../packages/core) - TypeScript library for fork/merge patterns

## Learn More

- [Mullion Documentation](../../docs)
- [Mullion GitHub](https://github.com/mullionlabs/mullion-ts)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Nuxt Documentation](https://nuxt.com/docs)

## License

MIT
