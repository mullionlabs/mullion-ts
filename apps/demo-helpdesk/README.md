# Mullion Helpdesk Demo

Interactive demonstration of Mullion's scope isolation features in a customer support ticket system.

## Live Demo

🎫 **[Try it live](https://mullion-demo-helpdesk.vercel.app)** (Requires Google sign-in, 20 requests/day)

## What This Demo Shows

This application demonstrates how Mullion prevents sensitive internal information from leaking into customer-facing responses:

- **Admin Scope**: Analyzes tickets with full internal context (customer history, risk assessment, compensation strategies)
- **Public Scope**: Generates customer responses with enforced boundaries - internal notes never leak
- **Compile-Time Safety**: TypeScript catches potential leaks before runtime
- **Confidence Tracking**: Every LLM inference includes reliability scores

## Features

- ✅ **Scope Isolation** - Admin notes stay in admin scope
- ✅ **Explicit Bridging** - Only sanitized data crosses boundaries
- ✅ **Cost Tracking** - Real-time token usage and cost estimation
- ✅ **Google OAuth** - Secure authentication
- ✅ **Rate Limiting** - 20 requests per day per user (Vercel KV)

## Tech Stack

- **Framework**: [Nuxt 3](https://nuxt.com/) + [Nuxt UI](https://ui.nuxt.com/)
- **LLM Integration**: [@mullion/ai-sdk](../../packages/ai-sdk) + [Vercel AI SDK](https://sdk.vercel.ai/)
- **Scenario Logic**: [@mullion/template-helpdesk](../../examples/helpdesk-leak-prevention)
- **Provider**: OpenAI GPT-4o
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

   Create `apps/demo-helpdesk/.env`:

   ```bash
   # OpenAI API Key (required)
   OPENAI_API_KEY=sk-proj-...

   # Google OAuth (required for authentication)
   NUXT_OAUTH_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your-client-secret

   # Session secret (generate a random string)
   NUXT_SESSION_SECRET=your-random-secret-here

   # LLM Model (optional, defaults to gpt-4o)
   NUXT_LLM_MODEL_NAME=gpt-4o

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
   pnpm --filter demo-helpdesk dev
   ```

7. **Open browser**: http://localhost:3000

## Project Structure

```
apps/demo-helpdesk/
├── app/
│   ├── components/           # Shared with demo-base layer
│   ├── composables/          # Shared with demo-base layer
│   ├── layouts/              # Shared with demo-base layer
│   └── pages/
│       ├── index.vue         # Landing page with explanation
│       └── demo.vue          # Interactive demo (protected)
├── server/
│   ├── api/
│   │   └── analyze.post.ts   # Ticket analysis endpoint
│   ├── routes/
│   │   └── auth/             # OAuth routes (shared with demo-base)
│   └── utils/                # Auth & rate limiting (shared with demo-base)
├── nuxt.config.ts
├── package.json
└── README.md
```

## How It Works

### 1. User submits a support ticket

```typescript
// server/api/analyze.post.ts
const result = await processSupportTicketSafely(providerConfig, ticketText);
```

### 2. Admin scope analyzes with full context

```typescript
// From @mullion/template-helpdesk
const adminAnalysis = await client.scope('admin', async (adminCtx) => {
  return await adminCtx.infer(TicketAnalysisSchema, adminPrompt);
});
// Returns: { summary, internalNotes, riskLevel, recommendedActions }
```

### 3. Data is sanitized before bridging

```typescript
const sanitized = {
  ticketId: adminAnalysis.value.ticketId,
  summary: adminAnalysis.value.summary,
  category: adminAnalysis.value.category,
  priority: adminAnalysis.value.priority,
  sentiment: adminAnalysis.value.sentiment,
  // ✅ internalNotes, riskLevel, suggestedCompensation NOT included
};
```

### 4. Public scope generates customer response

```typescript
const response = await client.scope('public', async (publicCtx) => {
  const bridged = publicCtx.bridge(sanitizedOwned);
  return await publicCtx.infer(CustomerResponseSchema, prompt);
});
```

### 5. Both views displayed with cost tracking

- Admin view shows internal notes, risk assessment, recommended actions
- Customer view shows only safe, sanitized response
- Cost display shows token usage and estimated cost

## Deployment

### Deploy to Vercel

1. **Push to GitHub** (if not already)

2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Set Root Directory: `apps/demo-helpdesk`
   - Framework Preset: Nuxt.js

3. **Configure Environment Variables**:

   ```
   OPENAI_API_KEY=sk-proj-...
   NUXT_OAUTH_GOOGLE_CLIENT_ID=...
   NUXT_OAUTH_GOOGLE_CLIENT_SECRET=...
   NUXT_SESSION_SECRET=...
   NUXT_LLM_MODEL_NAME=gpt-4o
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

| File                         | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `app/pages/demo.vue`         | Interactive demo UI with ticket input and side-by-side results |
| `server/api/analyze.post.ts` | API endpoint using `@mullion/template-helpdesk`                |
| `nuxt.config.ts`             | Extends `demo-base` layer for shared components                |
| `package.json`               | Dependencies including `@mullion/template-helpdesk`            |

## Troubleshooting

### "Not authenticated" error

- Make sure you've configured Google OAuth credentials
- Check that redirect URI matches your environment
- Verify `NUXT_OAUTH_GOOGLE_CLIENT_ID` and `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` are set

### "Rate limit exceeded" error

- Each user gets 20 requests per day
- Rate limit resets at midnight UTC
- For local development, you can increase the limit in `apps/demo-base/server/utils/rate-limit.ts`

### LLM response validation errors

- The model may occasionally fail to generate properly structured output
- Try simplifying your ticket text
- Consider using `gpt-4o` instead of `gpt-4o-mini` for more reliable structured output

### Cost tracking shows $0.00

- This indicates the `estimateTokens` function is not counting tokens correctly
- Verify `@mullion/ai-sdk` is built: `pnpm build`
- Check that model name matches pricing data in `packages/ai-sdk/src/cost/pricing.ts`

## Related

- [Demo RAG App](../demo-rag) - Fork/merge patterns with access control
- [Demo Base Layer](../demo-base) - Shared UI components and utilities
- [Helpdesk Template](../../examples/helpdesk-leak-prevention) - Core scenario logic
- [Mullion Core](../../packages/core) - TypeScript library for scope isolation

## Learn More

- [Mullion Documentation](../../docs)
- [Mullion GitHub](https://github.com/mullionlabs/mullion-ts)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Nuxt Documentation](https://nuxt.com/docs)

## License

MIT
