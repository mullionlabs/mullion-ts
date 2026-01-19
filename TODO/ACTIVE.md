# Active Task: create-mullion CLI (Task 15)

**Status:** 📋 Planned
**Started:** 2026-01-19
**Full Plan:** [tasks/15-create-mullion.md](./tasks/15-create-mullion.md)

## Current Focus

Prepare package setup for `create-mullion` and align template sources.

### Next Steps

1. Start Task 15.1 package setup in `packages/create-mullion/`
2. Define Nuxt base template layout and scenario copy points
3. Confirm CLI flags/defaults before implementation

## Context

Task 14 is complete; integration tests live in `tests/integration/`.

**Dependencies:**

- ✅ Task 12 templates
- ✅ Task 13 demo apps
- ✅ Task 14 integration tests

## Notes

- CLI should generate apps that run without API keys (mock mode).
- Keep scenarios aligned with `@mullion/template-*` sources.

## When This Task is Complete

Mark complete when the CLI generates working Nuxt apps and the package is wired into CI.

---

**Last Updated:** 2026-01-19
