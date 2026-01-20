# Active Task: create-mullion CLI (Task 15)

**Status:** 🔥 In Progress
**Started:** 2026-01-19
**Full Plan:** [tasks/15-create-mullion.md](./tasks/15-create-mullion.md)

## Current Focus

Task 15: create-mullion CLI (Nuxt MVP) - **COMPLETE** 🎉

### Definition of Done (15.9) ✅

**Documentation Complete:**

- [x] `packages/create-mullion/README.md` - Comprehensive guide with:
  - Quick start and CLI usage
  - All options documented with examples
  - Scenario descriptions (RAG, Helpdesk)
  - UI variant comparison (minimal vs Nuxt UI)
  - Complete project structure overview
  - Mock mode explanation
  - Troubleshooting section
  - Technical details and requirements

- [x] Root `README.md` updated with:
  - "Generate a project" as Option 1 in Quick Start
  - Added to Examples section as "Fastest Start"
  - Links to detailed create-mullion docs

### Task 15 Complete Summary

**What was built:**

- ✅ Full CLI infrastructure with citty + consola
- ✅ Template system (base + scenarios + UI overlays)
- ✅ 4 Nuxt combinations (rag/helpdesk × minimal/shadcn)
- ✅ Mock + real provider support
- ✅ Package.json merging with catalog placeholders
- ✅ 52 passing tests (unit + integration + build)
- ✅ Comprehensive documentation
- ✅ **Nuxt 4 best practices refactoring** (2026-01-20):
  - Environment variables with `NUXT_` prefix
  - Runtime config via `useRuntimeConfig(event)`
  - Server utilities in `server/utils/` (auto-imported)
  - H3 Event passing through call chains
  - Runtime mock mode detection via `/api/status`
  - All 4 combinations typecheck successfully

**Ready for:**

- Publishing to npm as `create-mullion`
- User testing and feedback
- Task 16: Next.js support

### Definition of Done (15.5) ✅

**Minimal UI (`templates/nuxt/ui/minimal/`):**

- [x] `deps.json` — no extra deps
- [x] `app/assets/css/main.css` — complete CSS framework with variables
- [x] `app/components/QueryInput.vue` — textarea with submit
- [x] `app/components/ResultCard.vue` — result display card

**Nuxt UI (`templates/nuxt/ui/shadcn/`):**

- [x] `deps.json` — @nuxt/ui, tailwindcss
- [x] `app/assets/css/main.css` — Tailwind + Nuxt UI imports
- [x] `app/app.vue` — UApp wrapper
- [x] `app/components/QueryInput.vue` — Nuxt UI components
- [x] `app/components/ResultCard.vue` — Nuxt UI Card

**Base config update:**

- [x] Updated `nuxt.config.ts` to conditionally load `@nuxt/ui` module
- [x] Added global CSS import for both UI variants

### Definition of Done (15.6) ✅

**Provider Selection:**

- [x] Both scenarios include `provider.ts` with mock/OpenAI/Anthropic support
- [x] `.env.example` generated with API key placeholders
- [x] Mock mode banner displayed when no API keys configured
- [x] `isMockMode` exposed via public runtime config

### Next Steps

1. Task 16: Next.js support

## Context

Task 14 is complete; integration tests live in `tests/integration/`.

**Dependencies:**

- ✅ Task 12 templates
- ✅ Task 13 demo apps
- ✅ Task 14 integration tests

## Notes

- CLI should generate apps that run without API keys (mock mode).
- Keep scenarios aligned with `@mullion/template-*` sources.
- OpenAI structured outputs require all fields required; templates now avoid optional output fields.
- Server utils auto-imports are values-only; scenario templates avoid index re-exports and manual value imports.
- Shared schemas live at project root for client/server type reuse (no duplicate Vue interfaces).
- Nuxt UI module is configured via `.nuxtrc` on shadcn variant (no conditional require).
- OpenAI strict JSON schema can be disabled via `NUXT_OPENAI_STRICT_JSON_SCHEMA`.

## When This Task is Complete

Mark complete when Task 15.2 is done and Task 15.3 (Nuxt templates) begins.

---

**Last Updated:** 2026-01-22
