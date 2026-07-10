---
'@mullion/core': patch
'@mullion/ai-sdk': patch
---

Fix `Context.use()` rejecting bridged values at compile time.

The documented `bridge() -> use()` flow did not type-check: `bridge()` returns a
union scope `Owned<T, S | OS>`, but `use()` only accepted the exact `Owned<T, S>`,
so `ctx.use(ctx.bridge(x))` failed with a `TS2345` scope-mismatch error — the very
pattern shown in the JSDoc and README.

`use()` now accepts any `Owned` value whose scope **includes** the current context
scope `S` (a single scope or a union of bridged scopes), while still rejecting
unbridged values from foreign scopes at compile time. No runtime behavior changes.

A type-level regression test (`context-use.type-test.ts`) locks in both the
positive (bridged value is usable) and negative (foreign-scope value is rejected)
cases.
