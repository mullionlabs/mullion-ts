# Sinks: logs, traces, caches

Sinks are the _secondary_ data channels around your LLM workflows.
They are easy to overlook, but they often outlive the prompt itself:

- logs (console, logger)
- telemetry (OpenTelemetry attributes/events, error reporting)
- caches (shared across tenants/roles)

Mullion treats sinks as trust boundaries. Use explicit, safe summaries
before anything scoped reaches a sink.

## Safe sink primitives

Use these helpers from `@mullion/core`:

```ts
import {redact, summarize, assertSafeFor} from '@mullion/core';

console.log(redact(result));
logger.info(summarize(result));

// Explicitly allow a value you *know* is safe for public sinks.
logger.info(assertSafeFor('public', publicMetadata));
```

- `redact(value)` -> safe summary, no raw content
- `summarize(value)` -> short safe summary
- `assertSafeFor(scope, value)` -> explicit override (use sparingly)

## Safe tracing helpers

Wrap OpenTelemetry spans to enforce safe attributes/events:

```ts
import {safeSetAttribute, safeAddEvent, summarize} from '@mullion/core';

safeSetAttribute(span, 'mullion.input', summarize(result));

safeAddEvent(span, 'mullion.output', {
  summary: summarize(result),
});
```

These helpers only accept `LogSafe` values, so you must
explicitly `summarize()` or `redact()` first.

## Scoped cache keys

Caches are another sink. Keep cache keys and values scoped:

```ts
import {
  createCacheKey,
  createScopedCache,
  assertOwnedScope,
} from '@mullion/core';

const cache = createScopedCache('tenant-a');
const key = createCacheKey('tenant-a', `tenant-a:doc:${docId}`);

const value = assertOwnedScope(result, 'tenant-a');
cache.set(key, value);
```

Guidance:

- Always include tenant or role identifiers in the cache key.
- Keep cache instances scoped to a single trust boundary.
- If you must reuse values, explicitly bridge or assert scope.

## Risk patterns to watch

### 1) Tool metadata -> trace -> reused later

If tool outputs or metadata land in trace attributes,
they can surface in dashboards and get reused by lower-privileged workflows.

```ts
// ❌ Unsafe
span.setAttribute('tool.metadata', toolOutput);

// ✅ Safe
safeSetAttribute(span, 'tool.metadata', redact(toolOutput));
```

### 2) Debug logs copied into prompts during triage

Debug logs are often copy-pasted into prompts for analysis.
If those logs contain scoped values, you just created a leak.

```ts
// ❌ Unsafe
logger.info(result.value);

// ✅ Safe
logger.info(summarize(result));
```

### 3) Shared cache across tenants or roles

A single shared cache can cause cross-tenant leakage.
Use scoped keys and scoped caches to enforce isolation.

```ts
const cache = createScopedCache('tenant-a');
const key = createCacheKey('tenant-a', `tenant-a:doc:${docId}`);
```
