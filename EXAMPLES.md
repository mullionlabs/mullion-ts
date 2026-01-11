# Examples

### Available Examples

1. [**Basic Example**](./examples/basic/)
   - The smallest runnable example
   - Demonstrates: scopes, `Owned<T>`, explicit boundary crossing
   - Perfect starting point for learning Mullion
   - [Read more →](./examples/basic/README.md)

2. [**Helpdesk Leak Prevention**](./examples/helpdesk-leak-prevention/)
   - Real-world scenario: Customer support system
   - Demonstrates: scope isolation (`admin` vs `public`), data sanitization, ESLint leak detection
   - Shows how to prevent internal notes from leaking to customer responses
   - [Read more →](./examples/helpdesk-leak-prevention/README.md)

3. [**RAG with Sensitive Data**](./examples/rag-sensitive-data/)
   - Production-ready RAG pipeline with access-level enforcement
   - Demonstrates: document classification (fork/merge), access control, query analysis, caching
   - Shows how to handle documents with different access levels (public/internal/confidential)
   - [Read more →](./examples/rag-sensitive-data/README.md)

### Quick Start

```bash
pnpm install
pnpm build
```

```bash
# Run any example:
pnpm --filter mullion-example-helpdesk-leak-prevention start
pnpm --filter mullion-example-rag-sensitive-data start
```

## Deep-dive examples guide

The comprehensive examples & patterns guide lives here:

- [docs/guides/examples.md](./docs/guides/examples.md)

It includes:

- basic concepts (scopes, bridging)
- real-world use cases (support automation, document processing, multi-tenant)
- security patterns (admin/user boundary, classification)
- error handling patterns (confidence gates)
- advanced patterns (parallel analysis / fork/merge)
- ESLint integration examples

## Related docs

- Docs index: [docs/README.md](./docs/README.md)
- Patterns & recipes: [docs/guides/patterns.md](./docs/guides/patterns.md)
- Security model: [docs/guides/security-model.md](./docs/guides/security-model.md)
- ESLint reference: [docs/reference/eslint-plugin.md](./docs/reference/eslint-plugin.md)
- Integration testing: [docs/contributing/integration-tests.md](./docs/contributing/integration-tests.md)
