# Positioning & comparisons

This page is intentionally short: it explains **what Mullion is** (and what it is not) so you can quickly decide if it fits your stack.

## Mullion in one sentence

**Mullion is middleware for AI trust:** it helps you build **typed, auditable, boundary-aware** dataflow around LLM calls in TypeScript.

## What Mullion is (and isn’t)

Mullion is:

- A **safety + correctness layer** for LLM workflows in TypeScript
- A way to make **trust boundaries explicit** (via scopes) and enforce them (via types + lint rules)
- A way to treat LLM output as **probabilistic** data that becomes **deterministic** only after validation

Mullion is _not_:

- An orchestration engine
- A graph / agent runtime
- A provider abstraction layer

## How it relates to popular tools

### Mullion vs Vercel AI SDK (`ai`) — “raw AI SDK”

Vercel AI SDK is great for _calling models_ and streaming responses.  
Mullion focuses on what happens **around** those calls:

- **Prevent leaks** across trust boundaries (admin → public, tenant A → tenant B)
- Attach **provenance + trace IDs** to values (“where did this come from?”)
- Make “unsafe patterns” visible via **ESLint rules**, not code review folklore
- Model confidence/validation and make “use of output” explicit

In practice: use AI SDK for provider calls, and Mullion for **data contracts + boundaries**.

### Mullion vs LangChain / LangGraph

LangChain/LangGraph focus on **how to connect steps** (chains/graphs/agents).  
Mullion focuses on **what flows through those steps**:

- Can sensitive data cross into a public prompt?
- Can untrusted output be used in a privileged computation?
- Can we prove, later, where a value came from?

In practice: you can use Mullion **inside** nodes/tools to make data contracts safer.

### Mullion vs “provider wrappers”

Libraries that unify providers (OpenAI/Anthropic/etc.) solve a different layer: **how you call** a model.  
Mullion sits above that: **what you do with** the result and how it can safely flow through the codebase.

### Mullion vs “just Zod + conventions”

Zod is great for validation, but it doesn’t model:

- **trust zones** (admin vs user vs tenant)
- **explicit boundary crossing**
- **provenance / audit trail** attached to values
- **static analysis** that prevents unsafe patterns before runtime

Mullion’s value is in the combination: **types + scopes + lint rules + provenance**.

## When Mullion is a strong fit

- Multi-tenant SaaS copilots (prevent cross-tenant context leaks)
- Admin tooling + public UI (avoid privileged hints in user-facing prompts)
- RAG over sensitive documents (control what can cross boundaries + keep provenance)
- Regulated domains (audit trails, trace IDs, confidence-aware pipelines)

See also:

- [Security model](./security-model.md)
- [Use cases](./use-cases.md)
- [Core concepts](../reference/concepts.md)

## When you might skip Mullion (for now)

- You’re prototyping and don’t have boundary / audit requirements yet
- Your system is pure “chat” with no sensitive data or critical side effects
- You want an agent runtime/graph engine more than data contracts

If/when you hit the “context leak” wall, Mullion is designed for incremental adoption: start with one scope boundary and a couple of rules, then grow.
