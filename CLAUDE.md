# ScopeStack Development Guide

## Project Overview

**ScopeStack** — TypeScript library for type-safe LLM context management.

**Core philosophy:** Compile-time safety, not runtime orchestration. We are ESLint + TypeScript for LLM workflows, not a new LangChain.

**One-liner:** "Catch context leaks and confidence issues before runtime"

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Versioning:** Changesets (independent releases)
- **Build:** tsup
- **Testing:** Vitest
- **CI/CD:** GitHub Actions

## Project Structure

```
scopestack/
├── packages/
│   ├── core/                 # @scopestack/core
│   │   ├── src/
│   │   │   ├── types.ts      # Owned, Context, SemanticValue
│   │   │   ├── scope.ts      # scope() function
│   │   │   ├── bridge.ts     # bridge utilities
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── eslint-plugin/        # eslint-plugin-scopestack
│   │   ├── src/
│   │   │   ├── rules/
│   │   │   │   ├── no-context-leak.ts
│   │   │   │   └── require-confidence-check.ts
│   │   │   └── index.ts
│   │   └── ...
│   │
│   └── ai-sdk/               # @scopestack/ai-sdk
│       ├── src/
│       │   ├── client.ts
│       │   └── index.ts
│       └── ...
│
├── examples/
│   ├── basic/
│   └── nextjs/
│
├── .changeset/               # Changesets config
├── .github/workflows/        # CI/CD
├── turbo.json               # Turborepo config
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Key Commands

```bash
# Install dependencies
pnpm install

# Build all packages (with caching)
pnpm build

# Build specific package
pnpm --filter @scopestack/core build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Clean all
pnpm clean
```

## Release Workflow

### Adding a Changeset

When you make a change that should be released:

```bash
pnpm changeset
```

Select packages, bump type (major/minor/patch), and write summary.

### Releasing

```bash
# Update versions from changesets
pnpm version

# Publish to npm (CI does this automatically)
pnpm release
```

## Package Dependencies

```
@scopestack/core (standalone)
     ↑
     │ peerDependency
     │
eslint-plugin-scopestack ←── peerDep: @typescript-eslint/parser, eslint
@scopestack/ai-sdk ←─────── peerDep: ai (Vercel AI SDK), zod
```

## Key Concepts

### Owned Values

Every value from LLM has an "owner" (scope):

```typescript
interface Owned<T, S extends string> {
  value: T;
  confidence: number;
  __scope: S;
  traceId: string;
}
```

### Context Scopes

Execution contexts are typed:

```typescript
interface Context<S extends string> {
  readonly scope: S;
  infer<T>(schema: Schema<T>, input: string): Promise<Owned<T, S>>;
  bridge<T, OS extends string>(owned: Owned<T, OS>): Owned<T, S | OS>;
}
```

### The Problem We Solve

```typescript
// ❌ BAD: Context leak - admin data flows to customer
const adminNotes = await adminCtx.infer(Notes, doc);
await customerCtx.respond(adminNotes.value); // LEAK!

// ✅ GOOD: Explicit bridge, trackable
const adminNotes = await adminCtx.infer(Notes, doc);
const safe = customerCtx.bridge(adminNotes);
await customerCtx.respond(safe.value);
```

## Code Style & Conventions

### TypeScript

- Strict mode always (`"strict": true`)
- No `any` — use `unknown` and narrow
- Prefer `interface` over `type` for objects
- Use branded types for nominal typing
- **Import types separately**: Use `import type` for type-only imports

  ```typescript
  // ✅ GOOD: Types imported separately
  import { scope } from './scope.js';
  import type { Owned, Context } from './types.js';

  // ❌ BAD: Types mixed with values
  import { scope, Owned, Context } from './scope.js';
  ```

  (Enforced by `@typescript-eslint/consistent-type-imports`)

### Naming

- Types: PascalCase (`Owned`, `Context`)
- Functions: camelCase (`createScope`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_CONFIDENCE_THRESHOLD`)
- Files: kebab-case (`no-context-leak.ts`)

### Testing

- Every ESLint rule: test valid AND invalid cases
- Type tests using `expectType` / `tsd`
- Unit tests with Vitest

## Working with Claude Code

### Task Size

Break work into small tasks:

- ✅ "Implement `Owned<T, S>` type with JSDoc"
- ✅ "Create ESLint rule skeleton for no-context-leak"
- ❌ "Build the entire ESLint plugin" (too big)

### Before Implementation

1. Read relevant section of this CLAUDE.md
2. Check TODO.md for current task
3. Look at existing code for patterns
4. Write tests first when possible

### Turborepo Commands

```bash
# Only build what changed
pnpm build

# See what will be built
turbo run build --dry-run

# Force rebuild everything
turbo run build --force
```

## Decision Log

| Date    | Decision               | Rationale                                                     |
| ------- | ---------------------- | ------------------------------------------------------------- |
| 2026-01 | TypeScript only        | Stronger type system, less competition                        |
| 2026-01 | ESLint plugin first    | Lowest adoption friction                                      |
| 2026-01 | Turborepo + Changesets | Independent releases, build caching                           |
| 2026-01 | Integrate with AI SDK  | 2.7M weekly downloads                                         |
| 2026-01 | Separate type imports  | Better tree-shaking, clearer code intent, enforced via ESLint |

## Links

- [Vercel AI SDK](https://sdk.vercel.ai/)
- [ESLint Plugin Development](https://eslint.org/docs/latest/extend/plugins)
- [Turborepo](https://turbo.build/)
- [Changesets](https://github.com/changesets/changesets)
