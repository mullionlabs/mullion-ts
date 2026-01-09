# Use cases

This guide highlights practical scenarios where Mullion adds immediate value:
**security, correctness, and maintainability** for LLM workflows in TypeScript.

---

## 1) Multi-tenant SaaS copilots (cross-tenant leak prevention)

**Problem:** a tenant’s documents or internal notes accidentally influence another tenant’s outputs.

**How Mullion helps:**

- Model each tenant session as a scope (`tenant:acme`, `tenant:globex`)
- Require explicit bridging between tenant scopes (rare)
- ESLint rules catch shared state / captured variables that would cause leaks

**Typical policy:**

- no cross-tenant bridging
- confidence gates before any automated action (tickets, writes, emails)

---

## 2) Admin tooling + public experience (privileged → public boundaries)

**Problem:** admin-only context (support notes, internal flags, PII) leaks into user-visible prompts or responses.

**How Mullion helps:**

- Run admin workflows in privileged scopes (`admin-review`)
- Only bridge the minimum sanitized payload into public scope (`public-chat`)
- Preserve provenance so you can audit “why did the assistant say this?”

---

## 3) RAG over sensitive knowledge bases (control retrieved context)

**Problem:** RAG pipelines fetch sensitive chunks; accidental inclusion in a public prompt is easy.

**How Mullion helps:**

- Treat retrieved chunks as Owned values with scope identity
- Use explicit bridging for “approved” excerpts only
- Keep trace IDs for audit logs: which sources influenced which outputs

---

## 4) Compliance-heavy domains (finance, healthcare, legal)

**Problem:** you need reviewable flows, explicit policies, and evidence of data handling.

**How Mullion helps:**

- Scopes become your trust boundaries and audit units
- Bridging becomes reviewable intent
- Confidence can be treated as a formal gate before side effects
- ESLint rules reduce “unknown unknowns” in code review

---

## 5) Large-scale LLM operations (cost & latency stability)

**Problem:** prompt growth, caching behavior, and parallel fan-out create hidden cost regressions.

**How Mullion helps:**

- Fork/merge patterns for “same context, multiple analyses”
- Strategies that can align with provider caching behavior (adapter-dependent)
- Clear separation of concerns: context construction vs. model calls vs. output handling

---

## When Mullion is NOT the right tool

Mullion is not trying to be:

- a workflow engine / graph runner
- an agent framework replacement
- a prompt template library

If you mostly need “call the model once with a prompt,” you may not need Mullion yet.  
Mullion pays off when **dataflow complexity** and **trust boundaries** matter.
