# Task 15: create-mullion CLI (Nuxt MVP)

**Status:** ✅ Complete
**Priority:** High (Next after Task 14)
**Completed:** 2026-01-20

## Goal

Project generator via `npm create mullion` that creates ready-to-run Mullion apps.

## Philosophy

> 🎯 **Composable templates** — overlay merge, no unused files
> ♻️ **Reuse** — copies logic from @mullion/template-\* packages
> 🚀 **Try it now** — works without API keys (mock + real provider support)
> 📦 **Monorepo** — `packages/create-mullion` for version consistency

## Nuxt Template Requirements

- Use the latest Nuxt 4+ release (keep templates aligned with official docs).
- Build file structure and architecture using Nuxt 4 best practices.
- If a UI library is needed for the test UI template, use Nuxt UI v4.

## CLI UX

```bash
# Interactive mode
npm create mullion@latest

# With flags
npm create mullion@latest my-app --framework nuxt --scenario rag --ui minimal
```

## Parameters

| Flag                         | Values                       | Default     |
| ---------------------------- | ---------------------------- | ----------- |
| `--framework`                | `nuxt` (Next in Task 16)     | `nuxt`      |
| `--scenario`                 | `rag`, `helpdesk`            | `rag`       |
| `--ui`                       | `minimal`, `shadcn`          | `minimal`   |
| `--pm`                       | `pnpm`, `npm`, `yarn`, `bun` | auto-detect |
| `--install` / `--no-install` | boolean                      | `true`      |
| `--git` / `--no-git`         | boolean                      | `true`      |

## Architecture

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
│   │   ├── base/             # Nuxt 4 app shell (see structure below)
│   │   ├── scenarios/
│   │   │   ├── rag/          # RAG scenario overlay
│   │   │   └── helpdesk/     # Helpdesk scenario overlay
│   │   └── ui/
│   │       ├── minimal/
│   │       └── shadcn/
│   └── next/                 # Prepared for Task 16 (empty)
├── package.json
└── README.md

# Nuxt 4 base template structure:
templates/nuxt/base/
├── app/                      # Client code (Nuxt 4 convention)
│   ├── app.vue
│   ├── pages/
│   └── assets/
├── server/                   # Server code (root level in Nuxt 4)
│   └── mullion/              # Mullion business logic
├── public/
├── nuxt.config.ts
└── ...
```

## Key Decision: Copy from Templates

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

## Checklist

### 15.1 Package Setup ✅

- [x] Create `packages/create-mullion/` directory
- [x] Create `package.json`:
  ```json
  {
    "name": "create-mullion",
    "version": "0.0.1",
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
- [x] Create `tsconfig.json`
- [x] Add to monorepo workspace
- [x] Update `turbo.json` (exclude templates from build cache)

### 15.2 CLI Implementation

- [x] Create `src/index.ts` — bin entry with shebang
- [x] Create `src/cli.ts`:
  - [x] Parse args with citty
  - [x] Interactive prompts for missing options
  - [x] Validate framework + scenario + ui combination
  - [x] Display summary before generation
- [x] Create `src/generator.ts`:
  - [x] Copy base template
  - [x] Overlay scenario files
  - [x] Overlay UI files
  - [x] Copy scenario core from @mullion/template-\*
- [x] Create `src/deps-merger.ts`:
  - [x] Merge base + scenario + ui dependencies
  - [x] Write final `package.json`
- [x] Create `src/placeholders.ts`:
  - [x] Replace `{{PROJECT_NAME}}`
  - [x] Generate `.env.example`

Notes:

- Missing template folders warn and continue (no failure).
- Smoke checks:
  - `pnpm -C packages/create-mullion build`
  - `node packages/create-mullion/dist/index.js --help`
  - `node packages/create-mullion/dist/index.js my-test-app --framework nuxt --scenario rag --ui minimal --no-install --no-git --yes`
  - `ls -la my-test-app`
  - `cat my-test-app/.env.example`
  - `cat my-test-app/package.json`
- Known limitation: templates are optional; package.json defaults to minimal when missing.

### 15.3 Nuxt Base Template ✅

**Nuxt 4 directory structure:**

```
templates/nuxt/base/
├── app/                    # Client-side code (Nuxt 4 convention)
│   ├── app.vue             # Main app component
│   ├── pages/
│   │   └── index.vue       # Minimal landing page
│   └── assets/css/         # Stylesheets
├── server/                 # Server-side code (root level in Nuxt 4)
│   └── mullion/            # Mullion business logic
│       └── index.ts        # Scenario entrypoint (stub)
├── public/                 # Static assets
├── nuxt.config.ts          # Nuxt 4 config with future.compatibilityVersion: 4
├── tsconfig.json           # Extends .nuxt/tsconfig.json
├── package.json            # Base deps (nuxt, @mullion/core, @mullion/ai-sdk)
├── .env.example            # Provider key placeholders
└── .gitignore              # Nuxt-specific ignores
```

- [x] Create `templates/nuxt/base/` with Nuxt 4 structure
- [x] `app/app.vue` — main app component
- [x] `app/pages/index.vue` — minimal landing page
- [x] `server/mullion/index.ts` — scenario entrypoint (import via `~~/server/mullion`)
- [x] `nuxt.config.ts` with `future: { compatibilityVersion: 4 }`
- [x] `package.json` (base deps: nuxt, @mullion/core, @mullion/ai-sdk, ai, zod)
- [x] `.env.example` — environment configuration template
- [x] `.gitignore` — Nuxt-specific ignores

### 15.4 Nuxt Scenarios ✅

**RAG Scenario (`templates/nuxt/scenarios/rag/`):**

- [x] `deps.json` — additional dependencies (@ai-sdk/openai, @ai-sdk/anthropic)
- [x] `server/mullion/` — adapted from @mullion/template-rag-sensitive-data:
  - [x] `index.ts` — exports all modules
  - [x] `schemas.ts` — Zod schemas for RAG types
  - [x] `provider.ts` — mock/OpenAI/Anthropic selection
  - [x] `sample-docs.ts` — sample documents with access levels
  - [x] `retriever.ts` — query analysis and document retrieval
  - [x] `generator.ts` — response generation with sources
  - [x] `pipeline.ts` — full RAG pipeline orchestration
- [x] `server/api/query.post.ts` — POST /api/query endpoint
- [x] `server/api/documents.get.ts` — GET /api/documents endpoint
- [x] `app/pages/index.vue` — RAG demo UI with access level selection

**Helpdesk Scenario (`templates/nuxt/scenarios/helpdesk/`):**

- [x] `deps.json` — additional dependencies (@ai-sdk/openai, @ai-sdk/anthropic)
- [x] `server/mullion/` — adapted from @mullion/template-helpdesk:
  - [x] `index.ts` — exports all modules
  - [x] `schemas.ts` — Zod schemas for ticket analysis
  - [x] `provider.ts` — mock/OpenAI/Anthropic selection
  - [x] `processor.ts` — safe flow with scope isolation
- [x] `server/api/analyze.post.ts` — POST /api/analyze endpoint
- [x] `app/pages/index.vue` — Helpdesk demo UI with ticket input

### 15.5 Nuxt UI Layers ✅

**Minimal (`templates/nuxt/ui/minimal/`):**

- [x] `deps.json` — no extra deps
- [x] `app/assets/css/main.css` — basic styles (Nuxt 4 path)
- [x] `app/components/ResultCard.vue`
- [x] `app/components/QueryInput.vue`

**shadcn (`templates/nuxt/ui/shadcn/`):**

- [x] `deps.json` — @nuxt/ui, tailwindcss
- [x] `app/assets/css/main.css` — Tailwind CSS + Nuxt UI imports
- [x] `app/app.vue` — UApp wrapper for Nuxt UI
- [x] `app/components/ResultCard.vue` — Nuxt UI Card component
- [x] `app/components/QueryInput.vue` — Nuxt UI Textarea + Button

Note: Uses Nuxt UI v4 instead of shadcn-vue (per project requirements for Nuxt UI v4).

### 15.6 Provider Selection (Mock + Real) ✅

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

- [x] Ensure provider.ts is copied with scenario (already in both RAG and Helpdesk)
- [x] Generate `.env.example` with provider key placeholders (via `placeholders.ts`)
- [x] Show "Mock mode" banner in UI when no keys (added to both scenario pages)
- [x] Added `isMockMode` to public runtime config in base `nuxt.config.ts`

### 15.6.1 Vue components refactoring

- [x] Refactor Vue components to follow Vue 3 conventions:
  - [x] Use `<script setup lang="ts">` with `defineOptions({ name: 'ComponentName' })`
  - [x] Root element must have a semantic component class name
  - [x] No `lang="scss"` and no BEM (dependency-free CSS only)
  - [x] Prefer utility-style classes defined in `app/assets/css/main.css`
  - [x] Use inline prop and emit typing (no separate interfaces)
  - [x] Prefer emits object syntax: `'update:modelValue': [value: string]`
  - [x] Prefer `const` arrow functions for methods/handlers

### 15.7 Post-Generation

- [x] Generate README with:
  - [x] Quick start: `pnpm dev`
  - [x] How to add API key for real provider
  - [x] Project structure overview
- [x] Optional: run `pnpm install`
- [x] Optional: `git init`
- [x] Display success message:

  ```
  ✅ Created my-app!

  Next steps:
    cd my-app
    pnpm dev

  📝 Add API key to .env to use real LLM (optional)
  ```

### 15.8 Testing ✅

- [x] Unit tests for overlay merge (`src/generator.test.ts`)
- [x] Unit tests for deps merger (`src/deps-merger.test.ts`)
- [x] Unit test: catalog placeholder replacement (`src/placeholders.test.ts`)
- [x] Integration: generate project, verify structure (`src/integration.test.ts`)
- [x] Integration: generated project builds (`src/build.integration.test.ts`)
- [x] All tests passing (52 passed, 1 skipped)

### 15.9 Documentation ✅

- [x] `packages/create-mullion/README.md` - Comprehensive usage guide
  - Quick start with examples
  - All CLI options documented
  - Scenario descriptions (RAG, Helpdesk)
  - UI variant comparison
  - Project structure overview
  - Mock mode explanation
  - Troubleshooting section
- [x] Update root README with create-mullion section
  - Added "Generate a project" as Option 1 in Quick Start
  - Added to Examples section as "Fastest Start"
  - Links to detailed docs

## Success Criteria ✅

- [x] `npm create mullion` works
  - CLI built and functional (`node dist/index.js --help` works)
  - Ready for npm publishing
- [x] All Nuxt combinations valid:
  - [x] nuxt + rag + minimal (tested in build.integration.test.ts)
  - [x] nuxt + rag + shadcn (tested in build.integration.test.ts)
  - [x] nuxt + helpdesk + minimal (tested in build.integration.test.ts)
  - [x] nuxt + helpdesk + shadcn (tested in build.integration.test.ts)
- [x] Works without API keys (mock mode)
  - Implemented in `server/mullion/provider.ts`
  - Mock mode banner in UI
  - Tested in integration tests
- [x] Generated projects run with `pnpm dev`
  - Verified in build integration tests
  - All 4 combinations build successfully
- [x] No unused files in output
  - `deps.json` excluded during copy (EXCLUDE_FILES in generator.ts)
  - Verified in integration tests

## Design Rationale

### Why Copy, Not Import

Generated projects **copy** scenario logic instead of importing from npm:

**Pros:**

- No runtime dependency on @mullion/template-\* packages
- Users can modify scenario code freely
- Standalone projects (easier to understand/customize)
- Templates are documentation, not libraries

**Cons:**

- Updates to templates don't propagate automatically
- Slight code duplication across generated projects

**Decision:** Copy is correct - scenarios are starting points, not dependencies.

### Template Overlay Strategy

1. **Base** - Minimal framework shell (Nuxt setup)
2. **Scenario** - Business logic layer (RAG pipeline, helpdesk flow)
3. **UI** - Presentation layer (minimal CSS vs shadcn components)

Files are merged with scenario/UI overriding base where conflicts exist.

## Example Output

```bash
$ npm create mullion@latest my-rag-app

? Choose framework: nuxt
? Choose scenario: rag
? Choose UI: minimal
? Package manager: pnpm
? Install dependencies? Yes
? Initialize git? Yes

✨ Generating project...

  📁 Copying base template (Nuxt 4.1)
  📦 Adding RAG scenario logic
  🎨 Applying minimal UI
  📝 Generating README & .env.example
  📦 Installing dependencies...
  🎉 Done!

✅ Created my-rag-app!

Next steps:
  cd my-rag-app
  pnpm dev

📝 Add API key to .env to use real LLM (optional)
🚀 Visit http://localhost:3000
```

## Testing Plan

### Unit Tests

- `deps-merger.test.ts` - Merge multiple package.json files
- `placeholders.test.ts` - Replace {{PROJECT_NAME}}
- `generator.test.ts` - Overlay merge logic

### Integration Tests

```bash
# Generate all combinations
npm run test:integration

# Test: nuxt + rag + minimal
create-mullion test-rag-minimal --framework nuxt --scenario rag --ui minimal --no-install --no-git
cd test-rag-minimal && pnpm install && pnpm build

# Test: nuxt + helpdesk + shadcn
create-mullion test-helpdesk-shadcn --framework nuxt --scenario helpdesk --ui shadcn --no-install --no-git
cd test-helpdesk-shadcn && pnpm install && pnpm build

# Cleanup
rm -rf test-*
```

### Manual Testing

- [x] Interactive mode works
- [x] Flag-based mode works
- [x] Generated app runs in mock mode
- [x] Generated app works with real API key
- [x] README instructions are clear
- [x] .env.example has correct structure

## Related Tasks

- **Task 12:** Templates are source of truth
- **Task 13:** Demo apps are reference implementations
- **Task 16:** Next.js support (after Nuxt MVP)

## Notes

- Start with Nuxt only (Task 16 adds Next.js)
- Shadcn UI layer is optional (minimal is default)
- Mock mode is crucial for "try before API key" UX
- CLI should work without Mullion packages published (workspace resolution)

## When Complete

Mark as done when:

- [x] CLI generates all 4 Nuxt combinations
- [x] Generated projects build and run
- [x] Tests passing
- [x] Documentation complete

Then move to: **Task 16 - Next.js Support**

---

## Post-Completion: Nuxt Best Practices Refactoring ✅

**Date:** 2026-01-20
**Issue:** User reported that generated projects weren't following Nuxt 4 conventions for environment variables and runtime config.

### Problems Fixed

1. **Environment Variables**
   - ❌ Was: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (accessed via `process.env.*`)
   - ✅ Now: `NUXT_OPENAI_API_KEY`, `NUXT_ANTHROPIC_API_KEY` (accessed via `useRuntimeConfig(event)`)

2. **Directory Structure**
   - ❌ Was: `server/mullion/` (wrong location)
   - ✅ Now: `server/utils/mullion/` (correct Nuxt auto-import directory)

3. **Runtime Config Access**
   - ❌ Was: Direct `process.env.*` access
   - ✅ Now: `useRuntimeConfig(event)` with H3Event parameter passing

4. **Function Signatures**
   - ❌ Was: Functions didn't accept event parameter
   - ✅ Now: All server functions accept `event: H3Event` as first parameter

5. **Mock Mode Detection**
   - ❌ Was: Build-time detection via `isMockMode` in `nuxt.config.ts`
   - ✅ Now: Runtime detection via `/api/status` endpoint

### Files Updated

**Base Template:**

- `templates/nuxt/base/.env.example` - Updated variable names with `NUXT_` prefix
- `templates/nuxt/base/nuxt.config.ts` - Updated runtime config to read from `NUXT_*` vars
- `templates/nuxt/base/server/utils/mullion/provider.ts` - Moved from `server/mullion/`, updated to use `useRuntimeConfig(event)`
- `templates/nuxt/base/server/api/status.get.ts` - New runtime status endpoint

**RAG Scenario:**

- `templates/nuxt/scenarios/rag/server/utils/mullion/index.ts` - Export both Zod schemas and TypeScript types
- `templates/nuxt/scenarios/rag/server/utils/mullion/retriever.ts` - Accept event parameter, use relative imports
- `templates/nuxt/scenarios/rag/server/utils/mullion/generator.ts` - Accept event parameter, use relative imports
- `templates/nuxt/scenarios/rag/server/utils/mullion/pipeline.ts` - Pass event through call chain
- `templates/nuxt/scenarios/rag/server/utils/mullion/sample-docs.ts` - Add type imports
- `templates/nuxt/scenarios/rag/server/api/query.post.ts` - Pass event to pipeline, use relative imports
- `templates/nuxt/scenarios/rag/server/api/documents.get.ts` - Use relative imports, fix variable names

**Helpdesk Scenario:**

- `templates/nuxt/scenarios/helpdesk/server/utils/mullion/processor.ts` - Accept event parameter, use relative imports
- `templates/nuxt/scenarios/helpdesk/server/api/analyze.post.ts` - Pass event to processor

### Import Pattern Established

1. **API Routes** → Use relative imports: `import {X} from '../utils/mullion/schemas'`
2. **Utility Files** → Use relative imports within same module: `import {X} from './schemas'`
3. **Type Imports** → Always use `import type` syntax for types
4. **Schema Exports** → Export both Zod schemas and TypeScript types separately

### Testing Results

All 4 project combinations now generate and typecheck successfully:

- ✅ `nuxt + rag + minimal` - Typecheck passed
- ✅ `nuxt + rag + shadcn` - Typecheck passed
- ✅ `nuxt + helpdesk + minimal` - Typecheck passed (with expected auto-import warnings)

---

## Post-Completion: OpenAI Structured Output Fix ✅

**Issue:** OpenAI strict JSON schema rejects optional fields in structured outputs.

### Problems Fixed

1. **Optional Output Fields**
   - ❌ Was: `RAGResponse.reasoning` and `TicketAnalysis.suggestedCompensation` were optional
   - ✅ Now: Both fields are required with prompts instructing "None" when not applicable

### Files Updated

- `templates/nuxt/scenarios/rag/schemas.ts` - `reasoning` now required
- `templates/nuxt/scenarios/helpdesk/schemas.ts` - `suggestedCompensation` now required
- `templates/nuxt/scenarios/helpdesk/server/utils/mullion/processor.ts` - Prompt + mock data updated

---

## Post-Completion: Nuxt Server Utils Auto-Import Cleanup ✅

**Issue:** Nuxt auto-imports server utils (values only). Re-exports and manual imports caused template import errors.

### Problems Fixed

1. **Auto-Import Conflicts**
   - ❌ Was: `server/utils/mullion/index.ts` re-exported runtime values (duplicate auto-import names)
   - ✅ Now: Removed scenario index entrypoints to avoid duplicate auto-imports

2. **Manual Imports in Server API**
   - ❌ Was: API routes manually imported values from `server/utils`
   - ✅ Now: API routes rely on Nuxt auto-imports and keep explicit `import type` only

### Files Updated

- `templates/nuxt/scenarios/helpdesk/server/api/analyze.post.ts` - Removed value import
- `templates/nuxt/scenarios/rag/server/api/query.post.ts` - Removed value import
- `templates/nuxt/scenarios/rag/server/api/documents.get.ts` - Removed value imports
- `templates/nuxt/scenarios/helpdesk/server/utils/mullion/index.ts` - Deleted
- `templates/nuxt/scenarios/rag/server/utils/mullion/index.ts` - Deleted

---

## Post-Completion: Shared Schemas for Client + Server ✅

**Issue:** Frontend pages duplicated interface declarations that already existed as Zod schemas on the server.

### Problems Fixed

1. **Single Source of Truth**
   - ❌ Was: Schemas lived under `server/utils`, with separate hardcoded TS interfaces in Vue files
   - ✅ Now: Shared schemas live at the project root and are imported by both server and app

### Files Updated

- `templates/nuxt/scenarios/rag/schemas.ts` - New shared schema module (moved from server utils + API response schema)
- `templates/nuxt/scenarios/helpdesk/schemas.ts` - New shared schema module (moved from server utils + API response schema)
- `templates/nuxt/scenarios/rag/app/pages/index.vue` - Use shared types
- `templates/nuxt/scenarios/helpdesk/app/pages/index.vue` - Use shared types
- `templates/nuxt/scenarios/rag/server/utils/mullion/*` - Import schemas from `~/schemas`
- `templates/nuxt/scenarios/helpdesk/server/utils/mullion/processor.ts` - Import schemas from `~/schemas`
- `templates/nuxt/scenarios/rag/server/api/*` - Import types from `~/schemas`

---

## Post-Completion: Nuxt UI Module Configuration ✅

**Issue:** Conditional `require.resolve('@nuxt/ui')` in `nuxt.config.ts` was a workaround.

### Problems Fixed

1. **Nuxt UI Module Registration**
   - ❌ Was: Runtime check for `@nuxt/ui` inside `nuxt.config.ts`
   - ✅ Now: Add `.nuxtrc` when Nuxt UI variant is selected (`modules[]=@nuxt/ui`)

### Files Updated

- `templates/nuxt/base/nuxt.config.ts` - Removed conditional module check
- `templates/nuxt/ui/shadcn/.nuxtrc` - Registers `@nuxt/ui`

---

## Post-Completion: OpenAI strictJsonSchema Config ✅

**Issue:** Need a configurable way to disable OpenAI strict JSON schema validation.

### Problems Fixed

1. **Configurable Strict JSON Schema**
   - ❌ Was: No way to disable strict JSON schema validation in structured outputs
   - ✅ Now: Runtime config controls `strictJsonSchema` via `NUXT_OPENAI_STRICT_JSON_SCHEMA`

### Files Updated

- `packages/ai-sdk/src/client.ts` - Pass providerOptions to generateObject
- `templates/nuxt/base/nuxt.config.ts` - Add `openaiStrictJsonSchema` runtime config
- `templates/nuxt/base/.env.example` - Document `NUXT_OPENAI_STRICT_JSON_SCHEMA`
- `templates/nuxt/base/server/utils/mullion/provider.ts` - Build provider options for Mullion client
- `templates/nuxt/scenarios/rag/server/utils/mullion/*` - Use `getMullionClientOptions`
- `templates/nuxt/scenarios/helpdesk/server/utils/mullion/processor.ts` - Use `getMullionClientOptions`
- ✅ `nuxt + helpdesk + shadcn` - Typecheck passed (with expected auto-import warnings)

**Note:** Nuxt auto-import warnings about "Duplicated imports" are expected and harmless - Nuxt prefers direct file imports over index.ts exports.

### Key Learnings

1. **Nuxt 4 Server Utils**: Files in `server/utils/` are auto-imported globally
2. **Runtime Config**: Server-side code must use `useRuntimeConfig(event)`, not `process.env`
3. **H3 Event Passing**: Runtime config requires H3Event, so pass it through entire call chain
4. **Type Safety**: Separate type exports (`export type`) from value exports for better tree-shaking

---

**Last Updated:** 2026-01-20
