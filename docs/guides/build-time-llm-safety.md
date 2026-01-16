# Build-time protection for LLM apps: preventing context leaks as a dataflow problem

**TL;DR:** In production LLM features, “context leaks” (admin → public, tenant A → tenant B, internal → external) are usually **dataflow bugs**. Runtime guards and code review help, but they don’t scale. A different approach is to **shift-left**: encode trust boundaries in types and enforce boundary crossing at **build time** (TypeScript + static analysis).

---

## Why “context leaks” keep happening

Most LLM integrations end up mixing data with different trust levels:

- admin-only notes and internal policies
- cross-tenant data in a multi-tenant SaaS
- user-provided text (untrusted) feeding privileged actions
- retrieval results that might contain sensitive fragments

In practice, leaks don’t come from a single “bad function”. They come from **accidental composition**:

- passing a value into “the wrong” prompt builder
- stashing a value in an outer variable and using it later in another scope
- merging contexts from different sources without realizing a boundary changed
- forgetting to sanitize / validate before reuse

This is why runtime checks alone feel brittle: by the time a guard runs, the value already exists and has already flowed through the codebase.

So it’s useful to treat leaks as a **dataflow constraint**:

> Some values must not cross a trust boundary unless the crossing is explicit, justified, and auditable.

---

## The shift-left thesis

If the boundary is important (e.g. admin → public), it should fail **before deployment**, not during production traffic.

This suggests a “build-time safety” model:

Note: `Context.infer(...)` is implemented by integration packages (e.g. `@mullion/ai-sdk`); `@mullion/core` provides the type-safe boundary and static model.

1. **Tag values** with their trust scope (e.g. `admin`, `tenant:123`, `public`)
2. **Make cross-scope use impossible** without an explicit boundary crossing operation
3. Use **static analysis** to catch “escape hatches” types can’t fully prevent (like outer-scope assignment)

The goal isn’t to make your app “secure by types”. It’s to turn a high-severity production class of bugs into:

- a compile-time error (TypeScript)
- or a lint-time error (ESLint)

---

## A minimal model: scopes + explicit boundary crossing

### Define a scope lattice

Scopes represent trust zones. Examples:

- `public` (user-facing prompts)
- `user` (authenticated, per-user data)
- `admin` (privileged internal tools)
- `tenant:A`, `tenant:B` (multi-tenant separation)
- `internal` vs `external`

You can think of it as an ordering: values produced in a higher-trust scope should not be usable in a lower-trust scope without an explicit decision.

### Tag values with a scope

Represent a scoped value as something like:

- `Owned<T, Scope>`: a value `T` owned by / originating in `Scope`

This tag becomes “sticky”: once a value is derived from an `admin` source, it carries `admin` until you explicitly change its scope.

### Require an explicit “bridge”

A “bridge” is a deliberate boundary crossing. The key is that it must be:

- **explicit** in code
- ideally **auditable** (why did we do this?)
- optionally **validated** (sanitize, redact, approve)

---

## Example: admin → public leak caught at build time

In Mullion, you typically create trust boundaries with `scope(...)`. Each scope gets a `Context<S>` that can `infer(...)` scoped values and enforces that you can only `use(...)` values that belong to that scope.

```ts
import {scope} from '@mullion/core';

// Admin scope generates a scoped value
const adminNotes = await scope('admin', async (adminCtx) => {
  return await adminCtx.infer(NotesSchema, document);
});
// adminNotes: Owned<Notes, 'admin'>

// Public/customer scope tries to use it
await scope('customer', async (customerCtx) => {
  // ❌ BAD: direct use causes a compile-time type error
  // customerCtx.use(adminNotes);

  // ✅ GOOD: explicit boundary crossing
  const bridged = customerCtx.bridge(adminNotes);

  // Now the boundary crossing is visible in code
  customerCtx.use(bridged);
});
```

What matters here:

- The leak is not “blocked by policy at runtime”.
- The leak is prevented as a **type-level incompatibility** unless you bridge.
- The bridge can require _evidence_ (a validator/redactor, a reason string, etc.).

Even if your bridge implementation is lightweight, the key improvement is forcing a conscious boundary decision.

---

## Why types alone are not enough: “escape” patterns

Type-level scoping catches the straightforward case: passing a scoped value where it doesn’t belong.

But many real leaks look like this:

```ts
import {scope} from '@mullion/core';

let leaked: any;

// ❌ Lint should flag: assigning a scoped value to an outer variable
await scope('admin', async (adminCtx) => {
  leaked = await adminCtx.infer(SecretSchema, doc);
});

// ❌ Lint should flag: using a leaked value in another scope (without bridge)
await scope('public', async (publicCtx) => {
  publicCtx.use(leaked);
});
```

Even with a good type system, `any`, mutation, and outer variables can bypass intent.

That’s where **static analysis / linting** matters:

- detect assignments of scoped values to outer scope variables
- detect cross-scope usage without `bridge(...)`
- detect “unscoped sinks” (logging, prompt builders, network calls) receiving scoped data

This is the same philosophy as taint-style analysis: not “perfect security”, but systematically catching the common footguns.

---

## Invariants worth enforcing (practical, not theoretical)

These invariants are simple enough to explain to teams and review:

1. **No implicit downscoping**  
   You can’t use `admin` data in `public` code unless you bridge.

2. **Boundary crossing is visible**  
   A `bridge(...)` (or equivalent) appears in code review and is grep-able.

3. **Unsafe escapes are flagged**  
   Lint catches “store scoped value outside its scope” and “use scoped value in wrong scope”.

4. **Validation turns probabilistic into deterministic**  
   LLM outputs or untrusted inputs must be validated before use in privileged actions.

These invariants are especially useful in multi-team codebases where “we’ll remember to do X” doesn’t scale.

---

## What this approach does NOT solve

Build-time trust boundaries are powerful, but they are not a silver bullet:

- **Prompt injection** is a separate class of issues (adversarial user input). Scopes help prevent data leaks, but not all injection scenarios.
- **Runtime exfiltration** (logs, metrics, debugging endpoints) still needs operational discipline.
- **Dynamic / stringly-typed boundaries** can’t always be proven statically.
- **Provider-side retention** and third-party data handling are governance problems, not type problems.

A good rule of thumb: this approach is best at preventing _accidental_ leaks inside your codebase, not adversarial threats outside it.

---

## Why it’s useful even if imperfect

The real payoff is shifting failure mode:

- from “a subtle incident happened in production”
- to “CI fails” or “lint fails” with a precise location

And that changes team behavior:

- it’s easier to enforce a rule than to train perfect code review
- boundaries become a visible part of the architecture
- audits become tractable: “where do we bridge admin → public?”

---

## Further reading

If you want more detail on the threat model and operational policy, see:

- [**Security model**](security-model.md) (threats, boundaries, incident patterns)
- [**Core concepts**](../reference/concepts.md) (scopes, ownership, bridging, validation)

---
