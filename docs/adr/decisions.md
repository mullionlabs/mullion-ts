# Architecture Decision Records

## ADR-001: TypeScript as Primary Language

**Status:** Accepted

**Context:**
We need to choose between TypeScript and Python for Mullion. Python has a larger ML/AI ecosystem (LangChain, DSPy), but TypeScript has unique advantages for our use case.

**Decision:**
Use TypeScript as the primary and only language for v1.

**Rationale:**

1. TypeScript's type system is significantly stronger — we can express `Owned<T, Scope>` with compile-time checking
2. Less competition in the TypeScript LLM tooling space
3. Large Vercel AI SDK ecosystem (2.7M weekly downloads) is TypeScript-native
4. Team expertise is in TypeScript (8+ years)

**Consequences:**

- Smaller initial market than Python
- May need Python version later if successful
- Can leverage template literal types for advanced type inference

---

## ADR-002: ESLint Plugin as Entry Point

**Status:** Accepted

**Context:**
We could build a full runtime framework or focus on compile-time tooling first.

**Decision:**
Build ESLint plugin first, runtime primitives second.

**Rationale:**

1. Lowest adoption friction — works with existing codebases
2. Immediate value without changing runtime
3. Validates the "context leak detection" hypothesis
4. Can be used standalone or with our runtime

**Consequences:**

- Must design runtime API to be lint-friendly
- ESLint rule development has learning curve
- Some checks only possible at runtime (will document limitations)

---

## ADR-003: Integration with Vercel AI SDK

**Status:** Accepted

**Context:**
We could build our own LLM abstraction or integrate with existing solutions.

**Decision:**
Build thin wrapper around Vercel AI SDK, not a new abstraction.

**Rationale:**

1. Vercel AI SDK has massive adoption (2.7M weekly downloads)
2. Already supports multiple providers (OpenAI, Anthropic, etc.)
3. We add value through types and safety, not through API design
4. Lower maintenance burden

**Consequences:**

- Dependent on AI SDK API stability
- May need adapters for other ecosystems later (OpenAI Agents SDK)
- Must track AI SDK updates

---

## ADR-004: Confidence as Required Field

**Status:** Accepted

**Context:**
LLM outputs have inherent uncertainty. We need to decide how to handle this.

**Decision:**
Make `confidence` a required field on all `Owned` values.

**Rationale:**

1. Forces developers to think about uncertainty
2. Enables ESLint rule "require-confidence-check"
3. Makes provenance tracking meaningful
4. Differentiates from "just structured output" solutions

**Consequences:**

- Need strategy for models that don't provide logprobs
- May use self-evaluation or ensemble for confidence
- Some overhead in simple cases

---

## ADR-005: Scope Names as String Literals

**Status:** Accepted

**Context:**
We need to track which scope owns each value. Options: runtime symbols, string literals, branded types.

**Decision:**
Use TypeScript string literal types for scope names.

**Rationale:**

1. Compile-time checking of scope boundaries
2. IDE autocomplete for scope names
3. Can be used in ESLint rules via type information
4. No runtime overhead

**Example:**

```typescript
type AdminScope = 'admin';
type CustomerScope = 'customer';

const notes: Owned<string, AdminScope> = ...;
// TypeScript error if used in CustomerScope context
```

**Consequences:**

- Requires TypeScript strict mode
- Complex scope combinations need union types
- Type inference must be carefully designed

---

## Template for New ADRs

```markdown
## ADR-XXX: [Title]

**Status:** Proposed | Accepted | Deprecated | Superseded

**Context:**
[What is the issue we're addressing?]

**Decision:**
[What did we decide to do?]

**Rationale:**
[Why did we make this decision?]

**Consequences:**
[What are the implications, both positive and negative?]
```
