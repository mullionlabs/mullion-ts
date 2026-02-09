# Task 17: create-mullion + Next.js

**Status:** 🚧 In Progress
**Priority:** Medium (After Task 16)

## Goal

Add Next.js framework support to create-mullion CLI while matching the Task 15 architecture for composable templates and final package assembly.

## Philosophy

> 🧩 **Composable templates** — base + scenario + UI overlays, last one wins
> 📦 **Standalone output** — scenario logic is copied into the generated project (no runtime template deps)
> 🔄 **Same scenarios** — RAG + Helpdesk parity with Nuxt
> ⚡ **Modern App Router** — Next.js App Router only

## Summary

Extend create-mullion to generate Next.js projects using the same overlay + dependency-merge pipeline as Nuxt (Task 15). The output must be standalone, mock-ready, and share Zod schemas across server and client.

## Architecture Parity with Task 15

- **Overlay order:** base → scenario → UI (later overlays override earlier files).
- **Deps merge:** base `package.json` + scenario/UI `deps.json` (scripts/deps/peer deps merged).
- **No stray files:** `deps.json` is excluded from output by the generator.
- **Version catalog:** use `{{CATALOG:...}}` placeholders from `templates/versions.json`.
- **Shared schemas:** `src/schemas.ts` used by both server + client.
- **Provider utils:** `src/mullion/provider.ts` (mock + OpenAI + Anthropic).
- **Mock mode:** `GET /api/status` endpoint for UI banner.
- **No runtime template deps:** generated app does not import `@mullion/template-*`.

## Checklist

### 17.1 CLI + Generator Updates

- [x] Add `next` to `Framework` union and CLI prompts
- [x] Update validation for Next combinations
- [x] Make `copyScenarioCore` framework-aware (`nuxt` → `server/utils/mullion`, `next` → `src/mullion`) or skip if templates already include logic

### 17.2 Next.js Base Template

Create `templates/next/base/`:

- [x] `package.json` with `next`, `react`, `react-dom`, `@mullion/core`, `@mullion/ai-sdk`, `ai`, `zod`
  - Use `{{CATALOG:...}}` placeholders for versions
- [x] `next.config.mjs` (or `.js` if not using `type: module`)
- [x] `tsconfig.json` with `baseUrl` + `paths` (alias `@/*` → `src/*`)
- [x] `src/app/layout.tsx` (imports `globals.css`)
- [x] `src/app/page.tsx` (minimal landing; overridden by scenarios)
- [x] `src/app/api/status/route.ts` (mock mode + provider name)
- [x] `src/mullion/provider.ts` (provider selection + `getMullionClientOptions`)
- [x] `.env.example` (server-only keys)
- [x] `README.md` (Next quick start + env notes to avoid Nuxt fallback)
- [x] `.gitignore`

### 17.3 Next.js Scenarios

**RAG Scenario (`templates/next/scenarios/rag/`):**

- [x] `deps.json` (OpenAI + Anthropic SDKs with catalog placeholders)
- [x] `src/schemas.ts` (shared Zod schemas)
- [x] `src/mullion/` scenario logic (pipeline, retriever, generator, sample docs)
- [x] `src/app/api/query/route.ts`
- [x] `src/app/api/documents/route.ts`
- [x] `src/app/page.tsx` (RAG UI, uses `/api/status` for mock banner)

**Helpdesk Scenario (`templates/next/scenarios/helpdesk/`):**

- [x] `deps.json`
- [x] `src/schemas.ts`
- [x] `src/mullion/` scenario logic (processor, schemas usage)
- [x] `src/app/api/analyze/route.ts`
- [x] `src/app/page.tsx` (Helpdesk UI, uses `/api/status`)

### 17.4 Next.js UI Layers

**Minimal (`templates/next/ui/minimal/`):**

- [x] `deps.json` (empty or minimal)
- [x] `src/app/globals.css` (basic styles)
- [x] `src/components/ResultCard.tsx`
- [x] `src/components/QueryInput.tsx`
- [x] `src/components/Header.tsx`

**shadcn (`templates/next/ui/shadcn/`):**

- [x] `deps.json` (tailwind + shadcn/ui deps with catalog placeholders)
- [x] `tailwind.config.ts`
- [x] `postcss.config.cjs`
- [x] `src/app/globals.css` (Tailwind directives + base styles)
- [x] `src/components/ui/` (button, card, input, textarea)
- [x] `src/components/ResultCard.tsx`
- [x] `src/components/QueryInput.tsx`
- [x] `src/components/Header.tsx`

### 17.5 Dependency & Version Catalog

- [x] Add Next + React deps to `templates/versions.json`
  - `next`, `react`, `react-dom`
  - `@types/react`, `@types/react-dom`
  - `tailwindcss`, `postcss`, `autoprefixer` (for shadcn)
  - shadcn/ui dependencies as needed

### 17.6 Testing

- [x] Add integration tests for Next combinations
- [x] Add build integration tests for Next
- [x] Verify `deps.json` is excluded in Next output

### 17.7 Documentation

- [x] Update `packages/create-mullion/README.md` with Next usage
- [x] Document Next env vars and mock mode behavior
- [x] Highlight differences vs Nuxt (env names, file structure)

## Success Criteria

- [ ] `npm create mullion -- --framework next` works
- [ ] All 4 Next combinations valid:
  - [ ] next + rag + minimal
  - [ ] next + rag + shadcn
  - [ ] next + helpdesk + minimal
  - [ ] next + helpdesk + shadcn
- [ ] Feature parity with Nuxt templates:
  - [ ] Mock + real provider support
  - [ ] Shared schemas at `src/schemas.ts`
  - [ ] Standalone output (no runtime template deps)

## Design Notes

### Next.js vs Nuxt Differences

| Aspect           | Nuxt                        | Next.js                  |
| ---------------- | --------------------------- | ------------------------ |
| **API Routes**   | `server/api/*.ts`           | `src/app/api/*/route.ts` |
| **Pages**        | `app/pages/*.vue`           | `src/app/*/page.tsx`     |
| **Components**   | `.vue` files                | `.tsx` files             |
| **Server Utils** | `server/utils/mullion/`     | `src/mullion/`           |
| **Schemas**      | `schemas.ts` (project root) | `src/schemas.ts`         |

### Scenario Logic Reuse (Copy, Not Import)

Generated apps should **not** import from `@mullion/template-*`. The CLI copies scenario logic into `src/mullion/` during generation.

```ts
// Next.js: src/app/api/query/route.ts
import {executeRAGPipeline} from '@/mullion/pipeline';

export async function POST(request: Request) {
  const body = await request.json();
  const result = await executeRAGPipeline(body.query);
  return Response.json(result);
}
```

### Mock Mode

Expose `GET /api/status` that returns `{mockMode, provider}` and use it in the UI banner.

## Implementation Strategy

1. **Add Next templates** under `packages/create-mullion/templates/next/` (base/scenario/ui).
2. **Update CLI + generator** to accept `framework: 'next'`.
3. **Align scenario logic** with Nuxt patterns (shared schemas + provider utils).
4. **Update versions catalog** for Next dependencies.
5. **Expand tests** to cover Next combinations.

## Testing Plan

```bash
# Generate all Next.js combinations
npm run test:integration:next

# Test: next + rag + minimal
create-mullion test-next-rag-minimal --framework next --scenario rag --ui minimal --no-install --no-git
cd test-next-rag-minimal && pnpm install && pnpm build

# Test: next + helpdesk + shadcn
create-mullion test-next-helpdesk-shadcn --framework next --scenario helpdesk --ui shadcn --no-install --no-git
cd test-next-helpdesk-shadcn && pnpm install && pnpm build

# Cleanup
rm -rf test-next-*
```

## When Complete

- [ ] All 4 Next.js combinations generate successfully
- [ ] Generated projects build and run
- [ ] Tests passing
- [ ] Documentation updated

Then: **Next queued task** (TBD - possibly Gemini adapter or more scenarios)

---

**Last Updated:** 2026-02-01
