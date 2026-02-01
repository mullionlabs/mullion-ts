# Task 16: Scoped Sinks (Logs / Traces / Caches)

**Status:** 📋 Planned  
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

## Deliverables

### 16.1 Core: “sink-safe” primitives

- Introduce a `Redacted` / `LogSafe` value type (name TBD)
- Provide helpers:
  - `redact(value)` -> safe summary (no raw content)
  - `summarize(value, opts?)` -> safe short string
  - optional: `assertSafeFor(scope, value)` for explicit gating

Acceptance:

- It’s impossible (or very hard) to pass `Owned<*, Confidential>` into a sink API without calling `redact()` or an explicit bridge.

### 16.2 ESLint: rules for sink APIs

Add rules that flag scoped values passed to:

- `console.*`
- popular loggers (`pino`, `winston`, generic `logger.*`)
- error reporting (`captureException`, `Sentry.*`) via heuristics
- OpenTelemetry usage patterns:
  - `span.setAttribute`
  - `span.addEvent`
  - `trace.*`

Acceptance:

- Lint catches “log this Owned value” by default.
- Docs show “how to allow it safely” via `redact()` / `summarize()`.

### 16.3 Telemetry wrapper: safe tracing helpers

Provide optional helpers (thin wrappers, no lock-in):

- `safeSetAttribute(span, key, value)`
- `safeAddEvent(span, name, attrs)`
- enforce: only LogSafe / Public-safe values go through unless explicitly redacted.

Acceptance:

- Example shows how a team can adopt this gradually without rewriting their tracing setup.

### 16.4 Cache boundary: scoped cache keys

Introduce a scoped cache pattern:

- `CacheKey<Scope>` and/or `ScopedCache<Scope>`
- rule: key and value scopes must match, or require explicit bridge
- include a “tenant id must be in key” guidance/example

Acceptance:

- Example: “tenant A cached retrieval result cannot be read by tenant B” becomes hard to implement incorrectly.

### 16.5 Docs + demos update

Add docs page:

- “Sinks: logs, traces, caches”
  Include 3 patterns:

1. tool metadata -> trace -> reused later by lower-privileged workflow
2. debug logs copied into prompts during triage
3. shared cache across tenants/roles

Optional demo extension:

- toggle that shows a “leaky trace attribute” path blocked by lint/safe wrappers.

## Out of scope (for this task)

- Full taint tracking across arbitrary code
- Deep integration with every logger/vendor SDK
