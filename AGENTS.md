# Repository Guidelines

## Project Overview

Mullion is a TypeScript library for type-safe LLM context management. This is a pnpm workspaces + Turborepo monorepo using Changesets for versioning, tsup for builds, Vitest for tests, ESLint 9 (flat config) + TypeScript ESLint v8 for linting, and Prettier for formatting. Husky + lint-staged enforce pre-commit checks.

## Project Structure & Module Organization

Core packages live under `packages/`:

- `packages/core` for `@mullion/core`
- `packages/eslint-plugin` for `@mullion/eslint-plugin`
- `packages/ai-sdk` for `@mullion/ai-sdk`

Apps and examples:

- `apps/` for demo apps
- `tests/integration/` for real-provider integration tests
- `examples/` for minimal usage examples
- `docs/` for guides, reference, design docs, and contributing notes

Shared configs sit at the repo root (`tsconfig.base.json`, `turbo.json`, `eslint.config.mjs`, `commitlint.config.mjs`, `pnpm-workspace.yaml`).

## Task Management (TODO)

Follow the modular TODO workflow:

1. Read `TODO/README.md`
2. Read `TODO/ACTIVE.md`
3. Read the relevant file in `TODO/tasks/`
4. Update progress in the task file and `TODO/ACTIVE.md` as work completes

## Build, Test, and Development Commands

Use pnpm from the repo root:

- `pnpm install` installs workspace dependencies.
- `pnpm build` builds all packages via Turborepo.
- `pnpm dev` runs package dev tasks (where defined).
- `pnpm test` runs all tests; `pnpm test:watch` watches.
- `pnpm lint` runs ESLint across packages.
- `pnpm typecheck` runs TypeScript checks.
- `pnpm format` / `pnpm format:check` run Prettier.
- `pnpm clean` runs package clean tasks and removes root `node_modules`.
- `pnpm clean:node_modules` removes all `node_modules` folders.

For a single package:

- `pnpm --filter @mullion/core build`
- `pnpm --filter <package> test`

## Coding Style & Naming Conventions

TypeScript strict mode is expected. Prefer `interface` for object shapes and `import type` for type-only imports. Avoid `any`; use `unknown` and narrow types. Use `kebab-case` for filenames, `PascalCase` for types, `camelCase` for functions, and `UPPER_SNAKE_CASE` for constants. Formatting is enforced with Prettier; linting with ESLint and `lint-staged` via Husky.

## Testing Guidelines

Tests use Vitest. Keep ESLint rule tests paired with valid and invalid cases, and include type-level tests where relevant. Run all tests with `pnpm test` or a targeted run via `pnpm --filter <package> test`.

## Release & Changesets

Use Changesets for releases:

- Add a changeset with `pnpm changeset` for any publishable change.
- Do not run `pnpm version`, `pnpm changeset version`, or `pnpm release` manually; CI handles versioning and publishing.

## Commit & Pull Request Guidelines

Commit messages follow Conventional Commits with a required scope, e.g. `feat(core): Add scoped bridge helper`. Allowed types include `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`; scopes include `core`, `eslint-plugin`, `ai-sdk`, `deps`, `release`, `monorepo`, `examples`, and `apps`. Subjects must be sentence-case. For PRs, include a clear summary, linked issue (if any), and notes on tests or manual checks.

## Configuration & Environment Notes

Node.js >= 20 and pnpm >= 9 are required. For manual API checks, follow `docs/contributing/integration-tests.md`.
