# Task 12: Example Code Snippets (COMPLETED ✅)

**Status:** ✅ Complete
**Completed:** 2026-01-15

## Goal

Create documentation-ready code examples with reusable scenario logic for demo apps and CLI templates.

## Summary

Refactored RAG and Helpdesk examples into importable workspace packages:

- `@mullion/template-rag-sensitive-data`
- `@mullion/template-helpdesk`

Both templates are now reusable by demo apps (Task 13) and future CLI generator (Task 15).

## What Was Built

### RAG Sensitive Data Template ✅

**Package:** `@mullion/template-rag-sensitive-data`
**Location:** `examples/rag-sensitive-data/`

**Structure:**

```
examples/rag-sensitive-data/
├── package.json              # name: "@mullion/template-rag-sensitive-data"
│                             # exports: { ".": "./src/index.ts" }
└── src/
    ├── index.ts              # Re-exports all modules
    ├── cli.ts                # CLI guide (renamed from index.ts)
    ├── pipeline.ts           # executeRAGPipeline + CLI entrypoint
    ├── classifier.ts         # Classification logic
    ├── generator.ts          # Generation logic
    ├── retriever.ts          # Retrieval logic
    ├── schemas.ts            # Zod schemas
    ├── provider.ts           # Provider selection (mock + real)
    └── data/
        └── sample-docs.ts    # Sample documents
```

**Exports:**

- `executeRAGPipeline()` - Main pipeline function
- `sampleDocuments` - Test data
- `UserQuery`, `ClassificationResult`, etc. - Types/schemas
- Provider utilities

**Usage:**

```typescript
import { executeRAGPipeline, sampleDocuments } from '@mullion/template-rag-sensitive-data';

const result = await executeRAGPipeline('query', { providerConfig: {...} });
```

**CLI still works:** `pnpm start` runs the guide

### Helpdesk Template ✅

**Package:** `@mullion/template-helpdesk`
**Location:** `examples/helpdesk-leak-prevention/`

**Structure:**

```
examples/helpdesk-leak-prevention/
├── package.json              # name: "@mullion/template-helpdesk"
│                             # exports: { ".": "./src/index.ts" }
└── src/
    ├── index.ts              # Re-exports all modules
    ├── cli.ts                # CLI guide (renamed from index.ts)
    ├── safe-flow.ts          # executeSafeHelpdeskFlow + CLI
    ├── unsafe-flow.ts        # executeUnsafeHelpdeskFlow (demo)
    ├── schemas.ts            # Zod schemas
    └── provider.ts           # Provider selection
```

**Exports:**

- `executeSafeHelpdeskFlow()` - Safe pipeline with bridging
- `executeUnsafeHelpdeskFlow()` - Unsafe demo (shows leaks)
- `TicketInput`, `AdminAnalysis`, etc. - Types/schemas
- Provider utilities

**Usage:**

```typescript
import {executeSafeHelpdeskFlow} from '@mullion/template-helpdesk';

const result = await executeSafeHelpdeskFlow(ticket);
```

**CLI still works:** `pnpm start` runs the guide

## Key Changes

1. **Renamed `index.ts` → `cli.ts`** - Separates CLI from exports
2. **New `index.ts`** - Re-exports all modules for imports
3. **Updated `package.json`:**
   - New scoped names
   - Added `exports` field pointing to `src/index.ts`
   - Scripts updated (`start` runs `cli.ts`)
4. **READMEs updated** - Import examples and usage docs

## Verification

✅ Both templates importable as workspace packages
✅ CLI demos still work independently (`pnpm start`)
✅ TypeScript types exported correctly
✅ Tested with test files (verified imports)
✅ Documentation complete with examples

## Design Rationale

**Why reusable packages:**

- Demo apps (Task 13) can import scenario logic - zero duplication
- CLI generator (Task 15) can copy from source of truth
- Examples stay documentation-ready
- Single source of truth for scenario implementations

**Why NOT npm packages:**

- Scenarios are open-source reference implementations
- Users should copy/modify, not depend on them
- Package names `@mullion/template-*` indicate "template" nature

## Future: Paid Scenarios

When monetization needed, can extract to private packages:

```
# 1. Create private package with license check
packages/scenarios-pro/rag-enterprise/
├── src/                # Extended logic + license validation
└── package.json        # @mullion/scenario-rag-enterprise

# 2. Template becomes thin wrapper or deprecated
examples/rag-sensitive-data/
└── src/index.ts        # re-export from @mullion/scenario-rag-enterprise
```

## Files Changed

**RAG Template:**

- `examples/rag-sensitive-data/package.json` - Name, exports
- `examples/rag-sensitive-data/src/index.ts` - New re-export file
- `examples/rag-sensitive-data/src/cli.ts` - Renamed from index.ts
- `examples/rag-sensitive-data/README.md` - Updated docs

**Helpdesk Template:**

- `examples/helpdesk-leak-prevention/package.json` - Name, exports
- `examples/helpdesk-leak-prevention/src/index.ts` - New re-export file
- `examples/helpdesk-leak-prevention/src/cli.ts` - Renamed from index.ts
- `examples/helpdesk-leak-prevention/README.md` - Updated docs

## Related Tasks

- **Task 13:** Demo apps import these templates
- **Task 15:** create-mullion CLI copies from these templates

---

**For detailed implementation steps, see:** `TODO/archive/TODO-legacy.md` (Task 12 section)
