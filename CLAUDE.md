# Mullion Development Guide

## Project Overview

**Mullion** — TypeScript library for type-safe LLM context management.

**Core philosophy:** Compile-time safety, not runtime orchestration. We are ESLint + TypeScript for LLM workflows, not a new LangChain.

**One-liner:** "Catch context leaks and confidence issues before runtime"

**Current version:** 0.2.0 (all packages)
**Repository:** https://github.com/mullionlabs/mullion-ts

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Versioning:** Changesets (independent releases)
- **Build:** tsup
- **Testing:** Vitest
- **CI/CD:** GitHub Actions
- **Git hooks:** Husky + lint-staged
- **Linting:** ESLint 9 (flat config) + TypeScript ESLint v8
- **Formatting:** Prettier
- **Schemas:** Zod v4.1.8+ (for AI SDK 5+ compatibility)

## Project Structure

```
mullion/
├── packages/
│   ├── core/                 # @mullion/core
│   │   ├── src/
│   │   │   ├── owned.ts      # Owned<T, S> type
│   │   │   ├── semantic-value.ts # SemanticValue type
│   │   │   ├── context.ts    # Context implementation
│   │   │   ├── scope.ts      # scope() function
│   │   │   ├── bridge.ts     # bridge utilities
│   │   │   ├── brand.ts      # nominal typing utilities
│   │   │   ├── fork/         # fork/merge implementations
│   │   │   ├── merge/        # merge strategies
│   │   │   ├── trace/        # OpenTelemetry tracing
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── eslint-plugin/        # @mullion/eslint-plugin
│   │   ├── src/
│   │   │   ├── rules/
│   │   │   │   ├── no-context-leak.ts
│   │   │   │   └── require-confidence-check.ts
│   │   │   └── index.ts
│   │   └── ...
│   │
│   └── ai-sdk/               # @mullion/ai-sdk
│       ├── src/
│       │   ├── client.ts     # Mullion client implementation
│       │   ├── cache/        # provider-aware caching
│       │   ├── cost/         # cost estimation & tracking
│       │   └── index.ts
│       └── ...
│
├── examples/
│   └── basic/                # Working examples
│
├── docs/
│   ├── adr/                  # Architecture Decision Records
│   ├── contributing/         # Contribution guides
│   ├── design/               # Design documents
│   ├── guides/               # User guides
│   ├── reference/            # API reference
│   └── README.md             # Documentation index
│
├── .changeset/               # Changesets config
├── .github/workflows/        # CI/CD
├── turbo.json               # Turborepo config
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

Root `README.md` is intentionally marketing + orientation.
`docs/` folder contains detailed guides, API reference, and design documentation.

## Key Commands

```bash
# Install dependencies
pnpm install

# Build all packages (with caching)
pnpm build

# Build specific package
pnpm --filter @mullion/core build

# Run tests
pnpm test

# Test in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format code
pnpm format

# Check formatting
pnpm format:check

# Clean all (including node_modules)
pnpm clean

# Clean only node_modules
pnpm clean:node_modules

# Dev mode (watch mode for builds)
pnpm dev
```

## Release Workflow

Mullion uses Changesets with GitHub Actions for automated releases.

### Step 1: Create a Changeset

When you make a change that should be released:

```bash
pnpm changeset
```

- Select affected packages
- Choose bump type (major/minor/patch)
- Write a clear summary of changes
- Commit the changeset file with your changes

### Step 2: Create PR and Merge

```bash
git add .changeset/*.md
git commit -m "feat(core): Add new feature"
git push origin your-branch
```

Create a PR and merge it to `main`.

### Step 3: Automated Release Process

**After merging to main, GitHub Actions automatically:**

1. ✅ Detects changeset files
2. ✅ Creates a "Version Packages" PR with:
   - Updated `package.json` versions
   - Generated `CHANGELOG.md` entries
   - Removed processed changeset files
3. ⏸️ Waits for you to review and merge

**When you merge the "Version Packages" PR:**

4. ✅ Builds all packages
5. ✅ Publishes to npm
6. ✅ Creates GitHub releases

### ⚠️ Important: Never Do This Manually

```bash
# ❌ DON'T run these manually - CI does it automatically!
pnpm version          # Wrong: runs npm version, not changeset version
pnpm changeset version # Only CI should run this
pnpm release          # Only CI should run this
```

### Troubleshooting

If the release workflow fails:

1. Check `.github/workflows/release.yml` has correct config:

   ```yaml
   version: pnpm changeset version # ✅ Correct
   # NOT: pnpm version              # ❌ Wrong - runs npm version
   commit: 'chore(release): Version packages' # Must pass commitlint
   ```

2. Verify commitlint allows the commit message format
3. Check that `changeset-release/main` branch isn't stuck
4. Review GitHub Actions logs for errors

## Package Dependencies

```
@mullion/core (standalone)
     ↓ dependency: zod
     ↑
     │ peerDependency
     │
@mullion/eslint-plugin ←── peerDep: @mullion/core (optional), @typescript-eslint/parser, eslint, typescript
@mullion/ai-sdk ←─────── dependency: @mullion/core
                          peerDep: ai (Vercel AI SDK v3+), zod
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
  import {scope} from './scope.js';
  import type {Owned, Context} from './types.js';

  // ❌ BAD: Types mixed with values
  import {scope, Owned, Context} from './scope.js';
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

### Task Management (NEW: 2026-01-17)

**Modular TODO Structure:**

The project uses a hierarchical TODO system to minimize context load:

```
TODO/
├── README.md              # 🎯 Main navigator (start here)
├── ACTIVE.md              # 📍 Current task (what I'm working on now)
├── COMPLETED.md           # ✅ Summary of finished work
└── tasks/
    ├── 01-11-foundation.md    # Completed tasks (summary only)
    ├── 12-examples.md         # Completed tasks (summary only)
    ├── 13-demo-apps.md        # Completed tasks (summary only)
    ├── 14-integration-tests.md # ✅ Completed task (summary only)
    ├── 15-create-mullion.md    # ✅ Completed task (summary only)
    ├── 16-scoped-sinks.md      # ✅ Completed task (summary only)
    └── 17-nextjs-support.md    # 🔥 Active task (full detailed plan)
```

**Workflow for new sessions:**

1. **Read `TODO/README.md`** - Get overview and task status
2. **Read `TODO/ACTIVE.md`** - See current focus
3. **Read specific task file** from `TODO/tasks/` for details
4. **Update progress** - Mark items complete in task file
5. **Update ACTIVE.md** - Move to next task when done

**Benefits:**

- ✅ Minimal context (3 files instead of 1 giant file)
- ✅ Fast navigation (clear hierarchy)
- ✅ Scalable (add tasks/17, 18, 19...)
- ✅ History preserved (archive/ for old TODOs)

**Old TODO files archived:**

- `TODO/archive/TODO-legacy.md`
- `TODO/archive/TODO-history-legacy.md`

### Task Size

Break work into small tasks:

- ✅ "Implement `Owned<T, S>` type with JSDoc"
- ✅ "Create ESLint rule skeleton for no-context-leak"
- ❌ "Build the entire ESLint plugin" (too big)

### Before Implementation

1. Read relevant section of this CLAUDE.md
2. **Read TODO/README.md → TODO/ACTIVE.md → specific task file**
3. Look at existing code for patterns
4. Review related documentation in `docs/` folder
5. Write tests first when possible

### Turborepo Commands

```bash
# Only build what changed
pnpm build

# See what will be built
turbo run build --dry-run

# Force rebuild everything
turbo run build --force
```

## Additional Features

### Tracing & Observability

- **Zero-dependency OTLP exporter** with OpenTelemetry compatibility
- **Pre-configured presets** for Jaeger, Honeycomb, Datadog, New Relic, Grafana
- **Mullion-specific attributes** tracking scope, confidence, cost, and cache metrics
- Located in `packages/core/src/trace/`
- See package READMEs for detailed usage

### Cost Tracking & Estimation

- **Token estimation** before API calls
- **Real-time cost tracking** per inference
- **Cache savings calculation**
- **Multi-provider pricing** (OpenAI, Anthropic with custom overrides)
- Located in `packages/ai-sdk/src/cost/`

### Provider-Aware Caching

- **Model-specific thresholds** (Anthropic: 1024-4096 tokens, OpenAI: 1024 tokens)
- **TTL support** ('5m', '1h', '1d')
- **Safe-by-default** (never caches user content without explicit opt-in)
- **Automatic cache warmup** for fork branches
- Located in `packages/ai-sdk/src/cache/`

### Fork/Merge Patterns

- **Parallel execution** with intelligent cache reuse
- **6 Built-in merge strategies** (weighted vote, average, fieldwise, etc.)
- **Warmup strategies** for optimal cache utilization
- Located in `packages/core/src/fork/` and `packages/core/src/merge/`

## Decision Log

| Date    | Decision                  | Rationale                                                     |
| ------- | ------------------------- | ------------------------------------------------------------- |
| 2026-01 | TypeScript only           | Stronger type system, less competition                        |
| 2026-01 | ESLint plugin first       | Lowest adoption friction                                      |
| 2026-01 | Turborepo + Changesets    | Independent releases, build caching                           |
| 2026-01 | Integrate with AI SDK     | 2.7M weekly downloads                                         |
| 2026-01 | Separate type imports     | Better tree-shaking, clearer code intent, enforced via ESLint |
| 2026-01 | Zod dependency in core    | Schema validation is fundamental to Owned<T> operations       |
| 2026-01 | OpenTelemetry integration | Production observability without vendor lock-in               |
| 2026-01 | Provider-aware caching    | Maximize cache efficiency across different LLM providers      |
| 2026-01 | Changesets automation     | Use `pnpm changeset version` in CI, not `pnpm version` (npm)  |
| 2026-01 | Commitlint in CI          | Release commits must follow format: `chore(release): Message` |

## Documentation Structure

The project has comprehensive documentation in the `docs/` folder:
Root `README.md` is intentionally marketing + orientation.  
This `docs/` folder is the technical source of truth.

- **`docs/README.md`** - Documentation index and navigation
- **`docs/guides/`** - How-to guides and tutorials
- **`docs/reference/`** - API reference documentation
- **`docs/design/`** - Design documents and architecture
- **`docs/adr/`** - Architecture Decision Records
- **`docs/contributing/`** - Contribution guides (including integration tests)

Each package also has its own README with specific implementation details.

## Links

- [Vercel AI SDK](https://sdk.vercel.ai/)
- [ESLint Plugin Development](https://eslint.org/docs/latest/extend/plugins)
- [Turborepo](https://turbo.build/)
- [Changesets](https://github.com/changesets/changesets)
- [OpenTelemetry](https://opentelemetry.io/)
- [Zod](https://zod.dev/)
