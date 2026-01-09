# Security model (trust boundaries & context leaks)

Mullion’s primary goal is to make **LLM dataflow reviewable**.

## Trust boundaries

A scope represents a boundary such as:

- public user session
- admin tooling
- payment processor
- internal analysis
- long-lived memory

Boundaries exist whether you model them or not. Mullion makes them explicit.

## What is a context leak?

A context leak is when:

- privileged data influences a less-privileged prompt/response path
- a value produced in a privileged scope is used elsewhere without explicit transfer
- shared state (captured variables, global caches, outer refs) escapes its intended boundary

## The rule of thumb

If a value crosses a boundary, you should be able to answer:

- **who** created it (scope)
- **why** it moved (explicit bridge)
- **what** it contains (schema)
- **how reliable** it is (confidence)
- **where it went** (trace)

## Explicit bridging

Bridging is a deliberate act:

- It documents intent (“we want to transfer this”)
- It preserves provenance (trace continuity)
- It’s enforceable by lint rules

## Operational policy (recommended)

Define a policy early:

- confidence thresholds for retries / human review / side effects
- which scopes can call which tools/providers
- what kinds of outputs are allowed to cross into public paths

Then enforce it:

- in code (guards)
- in CI (lint rules)
