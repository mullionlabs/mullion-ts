# IntentKit TODO

## Current Sprint: Week 1-2 (Foundation)

### Legend

- [ ] Not started
- [~] In progress
- [x] Done

---

## Task 0: Verify Setup

**Goal:** Ensure monorepo tooling works

### 0.1 Initial Setup

- [x] Run `pnpm install`
- [x] Run `pnpm build` (expect empty dist folders)
- [x] Run `pnpm typecheck`
- [x] Verify Turborepo caching works: run `pnpm build` again (should be cached)

### 0.2 First Changeset

- [x] Run `pnpm changeset`
- [x] Create a test changeset for @intentkit/core
- [x] Run `pnpm version` to see version bump
- [x] Revert test changeset

---

## Task 1: Core Types

**Goal:** Implement fundamental types in @intentkit/core

### 1.1 Brand Types (`packages/core/src/brand.ts`)

- [x] Create `Brand<T, B>` utility type
- [x] Create `ScopeId` branded string type
- [x] Add JSDoc with examples
- [x] Export from index.ts

### 1.2 Owned Type (`packages/core/src/owned.ts`)

- [x] Define `Owned<T, S>` interface
- [x] Add all required fields: value, confidence, \_\_scope, traceId
- [x] Create `createOwned()` factory function
- [x] Create `isOwned()` type guard
- [x] Add comprehensive JSDoc
- [x] Write unit tests

### 1.3 SemanticValue Type (`packages/core/src/semantic-value.ts`)

- [x] Define `SemanticValue<T, S>` extending Owned
- [x] Add `alternatives` array
- [x] Add `reasoning` field
- [x] Create factory and type guards
- [x] Write unit tests

### 1.4 Context Type (`packages/core/src/context.ts`)

- [x] Define `Context<S>` interface
- [x] Define `ContextOptions` type
- [x] Add method signatures: `infer`, `bridge`, `use`
- [x] Add JSDoc with examples

### 1.5 Verify Core Package

- [x] Update `packages/core/src/index.ts` with all exports
- [x] Run `pnpm --filter @intentkit/core build`
- [x] Run `pnpm --filter @intentkit/core test`
- [x] Run `pnpm --filter @intentkit/core typecheck`

---

## Task 2: Scope Implementation

**Goal:** Implement scope() and bridge() functions

### 2.1 Scope Function (`packages/core/src/scope.ts`)

- [ ] Implement `scope<S>(name, fn)` function
- [ ] Create context instance inside scope
- [ ] Handle async execution
- [ ] Generate trace IDs
- [ ] Write unit tests

### 2.2 Bridge Function (`packages/core/src/bridge.ts`)

- [ ] Implement `bridge()` for crossing scopes
- [ ] Track provenance (source → target)
- [ ] Maintain type safety with union types
- [ ] Write unit tests

### 2.3 Integration Test

- [ ] Create test with nested scopes
- [ ] Test bridge between scopes
- [ ] Verify type inference works correctly

---

## Task 3: ESLint Rule - no-context-leak

**Goal:** First ESLint rule that detects scope violations

### 3.1 Rule Setup

- [ ] Create `packages/eslint-plugin/src/rules/no-context-leak.ts`
- [ ] Set up rule meta (docs, schema, messages)
- [ ] Create empty `create()` function

### 3.2 Rule Implementation

- [ ] Set up TypeScript type services
- [ ] Track `Owned` values and their scope parameter
- [ ] Detect scope boundary crossings
- [ ] Report when crossing without bridge()

### 3.3 Rule Tests

- [ ] Create test file with RuleTester
- [ ] Test: valid code (no leak)
- [ ] Test: invalid code (leak detected)
- [ ] Test: bridged code (valid)
- [ ] Test: edge cases

### 3.4 Plugin Export

- [ ] Create `packages/eslint-plugin/src/index.ts`
- [ ] Export rules and configs
- [ ] Create `recommended` config

---

## Task 4: ESLint Rule - require-confidence-check

**Goal:** Warn when confidence is not checked

### 4.1 Rule Setup

- [ ] Create rule file
- [ ] Define meta

### 4.2 Rule Implementation

- [ ] Detect `Owned`/`SemanticValue` usage
- [ ] Check for `.confidence` comparison
- [ ] Allow explicit handlers

### 4.3 Rule Tests

- [ ] Valid and invalid cases

---

## Task 5: AI SDK Integration

**Goal:** Wrapper for Vercel AI SDK

### 5.1 Client (`packages/ai-sdk/src/client.ts`)

- [ ] `createIntentClient(provider)` function
- [ ] Scope method on client
- [ ] Type inference

### 5.2 Inference (`packages/ai-sdk/src/infer.ts`)

- [ ] Wrap `generateObject`
- [ ] Return `Owned<T, S>`
- [ ] Confidence extraction

### 5.3 Tests

- [ ] Mock provider tests
- [ ] Integration test with real API (manual)

---

## Task 6: Demo & Documentation

**Goal:** Prove the value

### 6.1 Basic Example (`examples/basic/`)

- [ ] Simple Node.js demo
- [ ] Show scope, Owned, bridge
- [ ] Show ESLint catching leak

### 6.2 README

- [ ] Root README with quick start
- [ ] Package READMEs (already created)
- [ ] Examples in docs

### 6.3 First Changeset

- [ ] Create changesets for all packages
- [ ] Prepare for 0.1.0 release

---

## Future (Week 3+)

### Backlog

- [ ] OpenAI Agents SDK adapter
- [ ] `fork()` and `merge()` primitives
- [ ] Caching strategy helpers
- [ ] Next.js example
- [ ] VSCode extension

---

## Notes

### Turborepo Tips

```bash
# See dependency graph
turbo run build --graph

# Only run affected
turbo run test --filter=...[origin/main]

# Force no cache
turbo run build --force
```

### Changeset Tips

```bash
# Add changeset
pnpm changeset

# See pending changesets
ls .changeset/*.md

# Apply versions
pnpm version
```
