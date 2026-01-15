# Mullion TODO

### Legend

- [ ] Not started
- [x] Done

---

## Task 0-11: COMPLETED ✅

> Tasks 0-11 are complete. See previous TODO versions for details.
> Summary: Core types, scope/bridge, ESLint rules, AI SDK integration,
> cache foundation, fork/merge, cost estimation, OpenTelemetry tracing.

If you need details, look here [TODO.history.md](./TODO.history.md)

---

## Task 12: Example Code Snippets ✅ COMPLETED (Needs Refactor)

**Goal:** Documentation-ready code examples + reusable scenario logic

**Status:** Examples exist but need refactoring to support reuse in demo apps and CLI templates.

### Philosophy

> 📚 **For documentation** — clean, commented code snippets
> ♻️ **Reusable** — importable as workspace packages
> 🎯 **Two scenarios** — Helpdesk (scope isolation) + RAG (fork/merge/cache)

### Current State vs Target

**Current:**

```
examples/rag-sensitive-data/
├── package.json              # name: "mullion-example-rag"
└── src/
    ├── index.ts              # CLI guide output
    ├── pipeline.ts           # Pipeline + CLI (if import.meta.url)
    ├── classifier.ts
    ├── generator.ts
    ├── retriever.ts
    ├── schemas.ts
    ├── provider.ts
    └── data/
        └── sample-docs.ts
```

**Target:**

```
examples/rag-sensitive-data/
├── package.json              # name: "@mullion/template-rag-sensitive-data"
│                             # exports: { ".": "./src/index.ts" }
└── src/
    ├── index.ts              # 🆕 Re-exports all modules
    ├── cli.ts                # 🔄 Renamed from index.ts (CLI guide)
    ├── pipeline.ts           # exports + CLI (if import.meta.url)
    ├── classifier.ts
    ├── generator.ts
    ├── retriever.ts
    ├── schemas.ts
    ├── provider.ts
    └── data/
        └── sample-docs.ts
```

### 12.4 Refactor for Reusability (NEW)

**Goal:** Enable `import { executeRAGPipeline } from '@mullion/template-rag-sensitive-data'`

#### 12.4.1 RAG Sensitive Data Template

- [ ] Rename `src/index.ts` → `src/cli.ts`
- [ ] Create new `src/index.ts` with re-exports:

  ```typescript
  // Schemas
  export * from './schemas.js';

  // Pipeline & Components
  export { executeRAGPipeline, type RAGPipelineResult } from './pipeline.js';
  export { classifyDocuments, classifyWithConsensus } from './classifier.js';
  export { analyzeQuery, retrieveDocuments } from './retriever.js';
  export { generateResponseWithSources } from './generator.js';

  // Provider utilities
  export {
    getProvider,
    getProviderName,
    type ProviderConfig,
  } from './provider.js';

  // Data
  export { sampleDocuments, type Document } from './data/sample-docs.js';
  ```

- [ ] Update `package.json`:
  ```json
  {
    "name": "@mullion/template-rag-sensitive-data",
    "version": "0.1.0",
    "exports": {
      ".": "./src/index.ts"
    },
    "scripts": {
      "start": "tsx --env-file=.env src/cli.ts",
      "pipeline": "tsx --env-file=.env src/pipeline.ts",
      ...
    }
  }
  ```
- [ ] Verify CLI still works: `pnpm --filter @mullion/template-rag-sensitive-data start`
- [ ] Verify imports work from another package

#### 12.4.2 Helpdesk Template

- [ ] Apply same refactoring pattern to `examples/helpdesk-leak-prevention/`
- [ ] Rename package to `@mullion/template-helpdesk`
- [ ] Create `src/index.ts` with re-exports
- [ ] Rename existing `src/index.ts` → `src/cli.ts`
- [ ] Update scripts in `package.json`

#### 12.4.3 Verify Integration

- [ ] Both templates importable as workspace packages
- [ ] CLI demos still work independently
- [ ] TypeScript types exported correctly
- [ ] Update READMEs with new import examples

### Future: Paid Scenarios Migration Path

When monetization needed:

```
# 1. Extract to private package with license check
packages/scenarios-pro/rag-enterprise/
├── src/                # Extended logic + license validation
└── package.json        # @mullion/scenario-rag-enterprise

# 2. Template becomes thin wrapper or deprecated
examples/rag-sensitive-data/
└── src/index.ts        # re-export from @mullion/scenario-rag-enterprise
```

---

## Task 13: Demo Applications (Deployable)

**Goal:** Production-ready Nuxt apps for live demonstration and portfolio

### Philosophy

> 🚀 **Deployable** — ready for Vercel with CI/CD
> 🔐 **Secure** — Google Auth + your OpenAI key + rate limiting
> ♻️ **Reuse** — import scenario logic from @mullion/template-\*
> 📱 **Portfolio-ready** — demonstrates real-world Mullion usage

### Architecture

```
examples/                              # Source of truth for scenarios
├── helpdesk-leak-prevention/          # @mullion/template-helpdesk
│   └── src/index.ts                   # Re-exports all
└── rag-sensitive-data/                # @mullion/template-rag-sensitive-data
    └── src/index.ts                   # Re-exports all

apps/
├── demo-base/                         # Nuxt Layer (shared UI/auth)
├── demo-helpdesk/                     # Extends demo-base
└── demo-rag/                          # Extends demo-base
```

### Key Decision: Reuse from Templates

```typescript
// apps/demo-rag/server/api/query.post.ts
import {
  executeRAGPipeline,
  sampleDocuments,
  type UserQuery,
} from '@mullion/template-rag-sensitive-data';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  // Use imported logic - no duplication!
  const result = await executeRAGPipeline(body.query, {
    providerConfig: { provider: 'openai' }, // Fixed provider for demo
  });
  return result;
});
```

### 13.1 Workspace Setup

- [ ] Add `apps/*` to `pnpm-workspace.yaml`
- [ ] Update `turbo.json` with demo app tasks
- [ ] Verify templates are importable as workspace packages:
  ```bash
  # From apps/demo-rag
  import { ... } from '@mullion/template-rag-sensitive-data';
  ```

### 13.2 Demo Base Layer (`apps/demo-base/`)

**Nuxt Layer Configuration:**

- [ ] Create `nuxt.config.ts` as layer
- [ ] Configure as reusable Nuxt layer

**Layouts:**

- [ ] `layouts/default.vue` — header, auth status, footer, responsive

**Components:**

- [ ] `MullionHeader.vue` — logo, demo title, GitHub link
- [ ] `AuthButton.vue` — Google OAuth sign in/out
- [ ] `CodeBlock.vue` — syntax highlighted code snippets
- [ ] `ResultCard.vue` — inference results with confidence indicator
- [ ] `CostDisplay.vue` — token usage, estimated cost
- [ ] `RateLimitNotice.vue` — remaining requests today
- [ ] `AccessDenied.vue` — shown when not authenticated

**Composables:**

- [ ] `useAuth.ts` — Google OAuth state management
- [ ] `useRateLimit.ts` — per-user request tracking

**Server Utils:**

- [ ] `server/utils/auth.ts` — Google OAuth verification
- [ ] `server/utils/rate-limit.ts` — 20 req/day per user (Vercel KV)
- [ ] `server/utils/mullion.ts` — server-side Mullion client with your API key

### 13.3 Demo Helpdesk App (`apps/demo-helpdesk/`)

- [ ] Create `nuxt.config.ts` extending demo-base
- [ ] Create `package.json` with dependency on `@mullion/template-helpdesk`
- [ ] `pages/index.vue`:
  - [ ] Intro explaining the scenario
  - [ ] Code snippets showing Mullion usage
  - [ ] "Try it" button (requires auth)
- [ ] `pages/demo.vue` (protected):
  - [ ] Ticket input form
  - [ ] Side-by-side: admin view vs public response
  - [ ] Confidence indicators
  - [ ] Source scope visualization
- [ ] `server/api/analyze.post.ts`:
  ```typescript
  import { helpdeskFlow } from '@mullion/template-helpdesk';
  // Auth check + rate limit + execute
  ```

### 13.4 Demo RAG App (`apps/demo-rag/`)

- [ ] Create `nuxt.config.ts` extending demo-base
- [ ] Create `package.json` with dependency on `@mullion/template-rag-sensitive-data`
- [ ] `pages/index.vue`:
  - [ ] Intro explaining RAG with access levels
  - [ ] Architecture diagram
  - [ ] "Try it" button (requires auth)
- [ ] `pages/demo.vue` (protected):
  - [ ] Role selector (Public / Internal / Confidential)
  - [ ] Query input
  - [ ] Document list showing what's accessible
  - [ ] Response with sources and confidence
- [ ] `server/api/query.post.ts`:
  ```typescript
  import { executeRAGPipeline } from '@mullion/template-rag-sensitive-data';
  ```
- [ ] `server/api/documents.get.ts`:
  ```typescript
  import { sampleDocuments } from '@mullion/template-rag-sensitive-data';
  // Filter by user's selected role
  ```

### 13.5 Authentication & Rate Limiting

**Google OAuth Setup:**

- [ ] Create Google Cloud project
- [ ] Configure OAuth consent screen
- [ ] Create OAuth 2.0 credentials (Web application)
- [ ] Add authorized redirect URIs for Vercel domains
- [ ] Implement with `nuxt-auth-utils` or similar

**Rate Limiting Implementation:**

- [ ] 20 requests/day per authenticated user
- [ ] Use Vercel KV for persistent counter storage
- [ ] Reset daily (UTC midnight)
- [ ] Show remaining requests in UI
- [ ] Return 429 with friendly message when exceeded

**API Key Protection:**

- [ ] Your OpenAI API key in Vercel env vars only
- [ ] Never sent to client
- [ ] Set $20/month spending limit on OpenAI dashboard
- [ ] Monitor usage in OpenAI console

### 13.6 CI/CD Pipeline

- [ ] Create `.github/workflows/demo-deploy.yml`:

  ```yaml
  name: Deploy Demos
  on:
    push:
      branches: [main]
      paths:
        - 'apps/demo-*/**'
        - 'examples/**'
    workflow_dispatch:

  jobs:
    deploy-helpdesk:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'pnpm'
        - run: pnpm install
        - run: pnpm --filter demo-helpdesk build
        - uses: amondnet/vercel-action@v25
          with:
            vercel-token: ${{ secrets.VERCEL_TOKEN }}
            vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
            vercel-project-id: ${{ secrets.VERCEL_PROJECT_HELPDESK }}

    deploy-rag:
      # Similar steps for demo-rag
  ```

- [ ] Set up Vercel projects:
  - [ ] `mullion-demo-helpdesk`
  - [ ] `mullion-demo-rag`
- [ ] Add GitHub secrets:
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_HELPDESK`
  - [ ] `VERCEL_PROJECT_RAG`
- [ ] Configure Vercel environment variables:
  - [ ] `OPENAI_API_KEY` (your key)
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `NUXT_SESSION_SECRET`
  - [ ] `KV_REST_API_URL` (Vercel KV)
  - [ ] `KV_REST_API_TOKEN` (Vercel KV)

### 13.7 Documentation

- [ ] `apps/demo-helpdesk/README.md` — local setup, deployment
- [ ] `apps/demo-rag/README.md` — local setup, deployment
- [ ] Update root README with live demo links:

  ```markdown
  ## Live Demos

  Try Mullion in action (requires Google sign-in, 20 requests/day):

  - 🎫 [Helpdesk Demo](https://mullion-demo-helpdesk.vercel.app) — Scope isolation
  - 📚 [RAG Demo](https://mullion-demo-rag.vercel.app) — Fork/merge + access control
  ```

### Success Criteria

- [ ] Both apps deployed to Vercel
- [ ] Google Auth required to use demos
- [ ] Rate limiting working (20 req/day)
- [ ] Scenario logic imported from templates (zero duplication)
- [ ] Mobile-responsive UI
- [ ] Live demo links in root README

---

## Task 14: Integration Tests (Real Providers)

**Goal:** Test @mullion packages against real LLM providers

### Philosophy

> 🎯 **Test as a real consumer** — workspace app with @mullion deps
> 🔑 **Secrets isolation** — API keys only here
> 🚀 **CI-ready** — automated on every push

### Why in monorepo (not separate repo)

- Packages not yet published to npm — workspace resolution required
- Faster iteration during development
- Single CI pipeline, one versioning system
- **After first npm release** — consider adding canary repo for "real install" tests

### 14.1 Workspace Setup

- [ ] Create `apps/integration-tests/` directory
- [ ] Create `package.json`:
  ```json
  {
    "name": "integration-tests",
    "private": true,
    "type": "module",
    "scripts": {
      "test": "vitest run",
      "test:watch": "vitest",
      "test:openai": "vitest run --grep openai",
      "test:anthropic": "vitest run --grep anthropic"
    },
    "dependencies": {
      "@mullion/core": "workspace:*",
      "@mullion/ai-sdk": "workspace:*",
      "@ai-sdk/openai": "catalog:",
      "@ai-sdk/anthropic": "catalog:",
      "ai": "catalog:",
      "zod": "catalog:"
    },
    "devDependencies": {
      "vitest": "catalog:",
      "typescript": "catalog:",
      "@types/node": "catalog:"
    }
  }
  ```
- [ ] Create `tsconfig.json`
- [ ] Create `vitest.config.ts`
- [ ] Verify workspace packages resolve correctly

### 14.2 Environment Setup

- [ ] Create `.env.example`:
  ```bash
  OPENAI_API_KEY=sk-proj-...
  ANTHROPIC_API_KEY=sk-ant-...
  ```
- [ ] Create `.gitignore` (exclude .env)
- [ ] Add timeout config for slow API calls (30s default)

### 14.3 Test: Basic Inference (OpenAI)

- [ ] Create `src/openai.test.ts`
- [ ] Test: `createMullionClient()` with OpenAI provider
- [ ] Test: `ctx.infer()` returns valid `Owned<T, S>`
- [ ] Test: Confidence score in valid range
- [ ] Test: Scope tagged correctly
- [ ] Test: Complex schemas (nested objects, arrays, enums)

### 14.4 Test: Basic Inference (Anthropic)

- [ ] Create `src/anthropic.test.ts`
- [ ] Test: `createMullionClient()` with Anthropic provider
- [ ] Test: `ctx.infer()` returns valid `Owned<T, S>`
- [ ] Test: Confidence extraction works
- [ ] Test: Different models (sonnet, haiku)

### 14.5 Test: Scope Bridging

- [ ] Create `src/bridging.test.ts`
- [ ] Test: Data flows between scopes with `bridge()`
- [ ] Test: Bridged data has combined scope type
- [ ] Test: `use()` enforces scope boundaries at runtime

### 14.6 Test: Caching (Anthropic)

- [ ] Create `src/caching.test.ts`
- [ ] Test: Cache segments created correctly
- [ ] Test: `cacheCreationInputTokens` on first call
- [ ] Test: `cacheReadInputTokens` on cache hit
- [ ] Test: Cache metrics in `ctx.getCacheStats()`

### 14.7 Test: Fork & Merge

- [ ] Create `src/fork-merge.test.ts`
- [ ] Test: `fast-parallel` executes all branches
- [ ] Test: `cache-optimized` with warmup
- [ ] Test: Merge strategies work correctly
- [ ] Test: Provenance tracking

### 14.8 Test: Cost Estimation

- [ ] Create `src/cost.test.ts`
- [ ] Test: `estimateNextCallCost()` before inference
- [ ] Test: `getLastCallCost()` after inference
- [ ] Test: Cache savings calculation

### 14.9 Test: Edge Cases

- [ ] Create `src/edge-cases.test.ts`
- [ ] Test: Ambiguous input → low confidence
- [ ] Test: Scope mismatch throws
- [ ] Test: API errors handled gracefully

### 14.10 CI Integration

- [ ] Create `.github/workflows/integration-tests.yml`:

  ```yaml
  name: Integration Tests
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
    workflow_dispatch:

  jobs:
    integration:
      runs-on: ubuntu-latest
      if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'pnpm'
        - run: pnpm install
        - run: pnpm build
        - run: pnpm --filter integration-tests test
          env:
            OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
            ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  ```

- [ ] Add secrets to GitHub repository

### 14.11 Documentation

- [ ] Create `apps/integration-tests/README.md`
- [ ] Document how to run locally
- [ ] Document how to add new tests

### Success Criteria

- [ ] All test files passing with real providers
- [ ] CI runs on every push to main
- [ ] OpenAI + Anthropic tested
- [ ] Caching, fork/merge verified with real APIs

---

## Task 15: create-mullion CLI (Nuxt MVP)

**Goal:** Project generator via `npm create mullion` that creates ready-to-run Mullion apps

### Philosophy

> 🎯 **Composable templates** — overlay merge, no unused files
> ♻️ **Reuse** — copies logic from @mullion/template-\* packages
> 🚀 **Try it now** — works without API keys (mock + real provider support)
> 📦 **Monorepo** — `packages/create-mullion` for version consistency

### CLI UX

```bash
# Interactive mode
npm create mullion@latest

# With flags
npm create mullion@latest my-app --framework nuxt --scenario rag --ui minimal
```

### Parameters

| Flag                         | Values                       | Default     |
| ---------------------------- | ---------------------------- | ----------- |
| `--framework`                | `nuxt` (Next in Task 16)     | `nuxt`      |
| `--scenario`                 | `rag`, `helpdesk`            | `rag`       |
| `--ui`                       | `minimal`, `shadcn`          | `minimal`   |
| `--pm`                       | `pnpm`, `npm`, `yarn`, `bun` | auto-detect |
| `--install` / `--no-install` | boolean                      | `true`      |
| `--git` / `--no-git`         | boolean                      | `true`      |

### Architecture

```
packages/create-mullion/
├── src/
│   ├── index.ts              # CLI entry (bin)
│   ├── cli.ts                # Prompts, args parsing (citty/consola)
│   ├── generator.ts          # Overlay merge logic
│   ├── deps-merger.ts        # package.json smart merge
│   └── placeholders.ts       # {{PROJECT_NAME}} substitution
├── templates/
│   ├── nuxt/
│   │   ├── base/             # Minimal Nuxt app shell
│   │   ├── scenarios/
│   │   │   ├── rag/          # Copies from @mullion/template-rag-sensitive-data
│   │   │   └── helpdesk/     # Copies from @mullion/template-helpdesk
│   │   └── ui/
│   │       ├── minimal/
│   │       └── shadcn/
│   └── next/                 # Prepared for Task 16 (empty)
├── package.json
└── README.md
```

### Key Decision: Copy from Templates

The CLI copies scenario logic from `@mullion/template-*` packages into the generated project. This ensures:

1. **Single source of truth** — logic maintained in examples/
2. **No runtime dependency** — generated app is standalone
3. **Customizable** — user can modify copied code

```typescript
// generator.ts
async function copyScenario(scenario: string, targetDir: string) {
  const templatePath = resolveTemplate(`@mullion/template-${scenario}`);
  await copy(templatePath + '/src', targetDir + '/server/mullion');
}
```

### 15.1 Package Setup

- [ ] Create `packages/create-mullion/` directory
- [ ] Create `package.json`:
  ```json
  {
    "name": "create-mullion",
    "version": "0.1.0",
    "description": "Create Mullion-powered LLM apps",
    "type": "module",
    "bin": {
      "create-mullion": "./dist/index.js"
    },
    "files": ["dist", "templates"],
    "scripts": {
      "build": "tsup src/index.ts --format esm --dts",
      "dev": "tsup src/index.ts --format esm --watch"
    },
    "dependencies": {
      "citty": "^0.1.6",
      "consola": "^3.2.3",
      "pathe": "^1.1.2",
      "nypm": "^0.3.11"
    },
    "devDependencies": {
      "tsup": "catalog:",
      "typescript": "catalog:"
    }
  }
  ```
- [ ] Create `tsconfig.json`
- [ ] Add to monorepo workspace
- [ ] Update `turbo.json` (exclude templates from build cache)

### 15.2 CLI Implementation

- [ ] Create `src/index.ts` — bin entry with shebang
- [ ] Create `src/cli.ts`:
  - [ ] Parse args with citty
  - [ ] Interactive prompts for missing options
  - [ ] Validate framework + scenario + ui combination
  - [ ] Display summary before generation
- [ ] Create `src/generator.ts`:
  - [ ] Copy base template
  - [ ] Overlay scenario files
  - [ ] Overlay UI files
  - [ ] Copy scenario core from @mullion/template-\*
- [ ] Create `src/deps-merger.ts`:
  - [ ] Merge base + scenario + ui dependencies
  - [ ] Write final `package.json`
- [ ] Create `src/placeholders.ts`:
  - [ ] Replace `{{PROJECT_NAME}}`
  - [ ] Generate `.env.example`

### 15.3 Nuxt Base Template

- [ ] Create `templates/nuxt/base/`:
  - [ ] `nuxt.config.ts`
  - [ ] `app.vue`
  - [ ] `package.json` (base deps: nuxt, @mullion/core, @mullion/ai-sdk)
  - [ ] `tsconfig.json`
  - [ ] `server/mullion/index.ts` — scenario entrypoint (stub)
  - [ ] `pages/index.vue` — minimal landing

### 15.4 Nuxt Scenarios

**RAG Scenario (`templates/nuxt/scenarios/rag/`):**

- [ ] `deps.json` — additional dependencies
- [ ] `server/mullion/` — copied from @mullion/template-rag-sensitive-data
- [ ] `server/api/query.post.ts`
- [ ] `server/api/documents.get.ts`
- [ ] `pages/index.vue` — RAG demo UI

**Helpdesk Scenario (`templates/nuxt/scenarios/helpdesk/`):**

- [ ] `deps.json`
- [ ] `server/mullion/` — copied from @mullion/template-helpdesk
- [ ] `server/api/analyze.post.ts`
- [ ] `pages/index.vue` — Helpdesk demo UI

### 15.5 Nuxt UI Layers

**Minimal (`templates/nuxt/ui/minimal/`):**

- [ ] `deps.json` — no extra deps
- [ ] `assets/main.css` — basic styles
- [ ] `components/ResultCard.vue`
- [ ] `components/QueryInput.vue`

**shadcn (`templates/nuxt/ui/shadcn/`):**

- [ ] `deps.json` — shadcn-vue, tailwindcss
- [ ] `tailwind.config.ts`
- [ ] `components/ui/` — button, card, input
- [ ] `components/ResultCard.vue`
- [ ] `components/QueryInput.vue`

### 15.6 Provider Selection (Mock + Real)

Generated projects support both mock and real providers (same as current examples):

```typescript
// server/mullion/provider.ts (copied from template)
export function getProvider() {
  if (process.env.OPENAI_API_KEY) {
    return openai('gpt-4o-mini');
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic('claude-3-5-haiku-latest');
  }
  return null; // Mock mode
}
```

- [ ] Ensure provider.ts is copied with scenario
- [ ] Generate `.env.example` with provider key placeholders
- [ ] Show "Mock mode" banner in UI when no keys

### 15.7 Post-Generation

- [ ] Generate README with:
  - [ ] Quick start: `pnpm dev`
  - [ ] How to add API key for real provider
  - [ ] Project structure overview
- [ ] Optional: run `pnpm install`
- [ ] Optional: `git init`
- [ ] Display success message:

  ```
  ✅ Created my-app!

  Next steps:
    cd my-app
    pnpm dev

  📝 Add API key to .env to use real LLM (optional)
  ```

### 15.8 Testing

- [ ] Unit tests for overlay merge
- [ ] Unit tests for deps merger
- [ ] Integration: generate project, verify structure
- [ ] Integration: generated project builds
- [ ] Manual: test all combinations

### 15.9 Documentation

- [ ] `packages/create-mullion/README.md`
- [ ] Update root README with create-mullion section

### Success Criteria

- [ ] `npm create mullion` works
- [ ] All Nuxt combinations valid:
  - [ ] nuxt + rag + minimal
  - [ ] nuxt + rag + shadcn
  - [ ] nuxt + helpdesk + minimal
  - [ ] nuxt + helpdesk + shadcn
- [ ] Works without API keys (mock mode)
- [ ] Generated projects run with `pnpm dev`
- [ ] No unused files in output

---

## Task 16: create-mullion + Next.js

**Goal:** Add Next.js framework support to create-mullion

### Philosophy

> 🔄 **Same scenarios** — reuse @mullion/template-\* logic
> 🎯 **App Router** — modern Next.js patterns
> ⚡ **Minimal work** — only framework adapters needed

### 16.1 CLI Updates

- [ ] Add `next` to `--framework` options
- [ ] Update validation for Next combinations

### 16.2 Next.js Base Template

- [ ] Create `templates/next/base/`:
  - [ ] `next.config.js`
  - [ ] `package.json`
  - [ ] `tsconfig.json`
  - [ ] `src/app/layout.tsx`
  - [ ] `src/app/page.tsx`
  - [ ] `src/mullion/index.ts` — scenario entrypoint

### 16.3 Next.js Scenarios

- [ ] `templates/next/scenarios/rag/`
- [ ] `templates/next/scenarios/helpdesk/`

### 16.4 Next.js UI Layers

- [ ] `templates/next/ui/minimal/`
- [ ] `templates/next/ui/shadcn/`

### 16.5 Testing

- [ ] All Next combinations work
- [ ] Generated projects build and run

### Success Criteria

- [ ] `npm create mullion -- --framework next` works
- [ ] All combinations valid
- [ ] Parity with Nuxt features

---

## Future Backlog

### Gemini Adapter (High Priority)

- [ ] Implement `@mullion/ai-sdk` adapter for Google Gemini
- [ ] Support Gemini explicit caching (cache handles with TTL)
- [ ] Enable free tier usage for demos
- [ ] Update demo apps to use Gemini (cost savings)

### ESLint Rules

- [ ] `no-unsafe-bridge` — bridge without validation
- [ ] `no-cross-scope-write` — shared state in fork
- [ ] `prefer-cache-segments` — suggest caching for large content
- [ ] `require-fork-strategy` — warn on implicit strategy

### Provider Adapters

- [ ] Azure OpenAI
- [ ] AWS Bedrock

### create-mullion Extensions

- [ ] More scenarios: multi-agent, chatbot, document-qa
- [ ] More UI: daisyui, radix
- [ ] `--auth` flag for pre-configured OAuth

### Documentation

- [ ] Docs site (VitePress)
- [ ] Caching best practices guide
- [ ] Fork/merge patterns guide

### Post-Release

- [ ] Canary repo for real npm install testing
- [ ] Paid scenarios infrastructure (@mullion/scenario-\*)
