# Core concepts

Mullion is built around 3 ideas:

1. **Scopes** represent trust boundaries and units of work
2. LLM outputs are **Owned values** (not raw primitives)
3. Crossing boundaries is **explicit** (bridge), and can be linted

---

## Scopes

A scope tags all derived values with a compile-time identity and runtime provenance.

Typical scope examples:

- `public-chat`
- `admin-review`
- `payment-processor`
- `internal-analysis`

Scopes are also where you enforce policies:

- allowed tools/providers
- output constraints
- “confidence must be checked” rules

---

## Owned values (`Owned<T>`)

LLM outputs should behave like unsafe input (even if they look structured).

`Owned<T>` is a value plus metadata:

- `value`: the typed payload
- `confidence`: numeric signal you can require
- `traceId`: provenance / auditing
- compile-time scope identity (phantom typing)

---

## Bridging (explicit boundary crossing)

If a value produced in scope A is used in scope B, do it explicitly:

- intent is visible in code review
- provenance stays attached
- lint rules can enforce it

---

## Confidence as a first-class contract

Recommended policy examples:

- “below 0.8 → retry”
- “below 0.7 → human review”
- “below 0.6 → disallow side effects”

---

## Fork / merge (advanced)

Use fork/merge for “same context, multiple analyses”.

See: `../design/architecture.md`
