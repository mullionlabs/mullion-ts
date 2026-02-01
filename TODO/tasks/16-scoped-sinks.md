# Task 16: Scoped Sinks (Logs / Traces / Caches)

**Status:** ✅ Complete  
**Priority:** High  
**Why now:** Real-world feedback: logs/traces quietly become a second data channel and bypass code review.

## Goal

Extend Mullion’s “typed trust boundaries” beyond prompts.
Make it hard to accidentally send scoped values into:

- logs (console/logger)
- telemetry/traces (OpenTelemetry attributes/events, error reporting)
- caches (shared retrieval/tool caches across tenants/roles)

## Problem

In production, the nastiest leaks often aren’t prompt text.
They happen when tool outputs / metadata end up in traces or logs,
then get reused by a lower-privileged workflow later.

## Checklist

### 16.1 Core: “sink-safe” primitives

- [x] Introduce a `Redacted` / `LogSafe` value type (name TBD)
- [x] Add `redact(value)` helper (safe summary, no raw content)
- [x] Add `summarize(value, opts?)` helper (safe short string)
- [x] Add optional `assertSafeFor(scope, value)` for explicit gating
- [x] Block `Owned<*, Confidential>` from reaching sink APIs without `redact()` or an explicit bridge

### 16.2 ESLint: rules for sink APIs

- [x] Add rules for `console.*`
- [x] Add rules for popular loggers (`pino`, `winston`, generic `logger.*`)
- [x] Add heuristics for error reporting (`captureException`, `Sentry.*`)
- [x] Add OpenTelemetry patterns:
  - [x] `span.setAttribute`
  - [x] `span.addEvent`
  - [x] `trace.*`
- [x] Lint catches “log this Owned value” by default
- [x] Docs show “how to allow it safely” via `redact()` / `summarize()`

### 16.3 Telemetry wrapper: safe tracing helpers

- [x] Provide `safeSetAttribute(span, key, value)`
- [x] Provide `safeAddEvent(span, name, attrs)`
- [x] Enforce only LogSafe / Public-safe values unless explicitly redacted
- [x] Example shows gradual adoption without rewriting tracing setup

### 16.4 Cache boundary: scoped cache keys

- [x] Introduce `CacheKey<Scope>` and/or `ScopedCache<Scope>`
- [x] Enforce key/value scope match or require explicit bridge
- [x] Include “tenant id must be in key” guidance/example
- [x] Example: tenant A cached retrieval result cannot be read by tenant B

### 16.5 Docs + demos update

- [x] Add docs page: “Sinks: logs, traces, caches”
- [x] Include pattern: tool metadata -> trace -> reused later by lower-privileged workflow
- [x] Include pattern: debug logs copied into prompts during triage
- [x] Include pattern: shared cache across tenants/roles
- [x] Optional: demo toggle that shows a “leaky trace attribute” path blocked by lint/safe wrappers

## Out of scope (for this task)

- Full taint tracking across arbitrary code
- Deep integration with every logger/vendor SDK
