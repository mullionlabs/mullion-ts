# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm + Turborepo monorepo. Core packages live under `packages/`:

- `packages/core` for `@mullion/core`
- `packages/eslint-plugin` for `@mullion/eslint-plugin`
- `packages/ai-sdk` for `@mullion/ai-sdk`

Examples and integration notes are in `examples/` and `INTEGRATION_TEST_INSTRUCTIONS.md`. Shared configs sit at the repo root (`tsconfig.base.json`, `turbo.json`, `eslint.config.mjs`, `commitlint.config.mjs`).

## Build, Test, and Development Commands

Use pnpm from the repo root:

- `pnpm install` installs workspace dependencies.
- `pnpm build` builds all packages via Turborepo.
- `pnpm dev` runs package dev tasks (where defined).
- `pnpm test` runs all tests; `pnpm test:watch` watches.
- `pnpm lint` runs ESLint across packages.
- `pnpm typecheck` runs TypeScript checks.
- `pnpm format` / `pnpm format:check` run Prettier.

## Coding Style & Naming Conventions

TypeScript strict mode is expected. Prefer `interface` for object shapes and `import type` for type-only imports. Use `kebab-case` for filenames, `PascalCase` for types, `camelCase` for functions, and `UPPER_SNAKE_CASE` for constants. Formatting is enforced with Prettier; linting with ESLint and `lint-staged` via Husky.

## Testing Guidelines

Tests use Vitest. Keep rule tests paired with valid and invalid cases, and include type-level tests where relevant. Run all tests with `pnpm test` or a targeted run via `pnpm --filter <package> test`.

## Commit & Pull Request Guidelines

Commit messages follow Conventional Commits with a required scope, e.g. `feat(core): Add scoped bridge helper`. Allowed types include `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`, and more; scopes include `core`, `eslint-plugin`, `ai-sdk`, `deps`, `release`, `monorepo`. Subjects must be sentence-case. For PRs, include a clear summary, linked issue (if any), and notes on tests or manual checks. Add a Changeset (`pnpm changeset`) when changes affect published packages.

## Configuration & Environment Notes

Node.js >= 20 and pnpm >= 9 are required. Avoid introducing `any`; use `unknown` and narrow types. For manual API checks, follow `INTEGRATION_TEST_INSTRUCTIONS.md`.
