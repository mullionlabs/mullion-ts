# Examples

This repo is currently **pre-release** (packages are not published to npm yet).  
You can still run examples from source and use workspace packages locally.

## Start here

```bash
pnpm install
pnpm build
```

### Run the basic example

- `examples/basic/` — the smallest runnable example that demonstrates scopes, `Owned<T>`, and explicit boundary crossing.

## Deep-dive examples guide

The comprehensive examples & patterns guide lives here:

- `docs/guides/examples.md`

It includes:

- basic concepts (scopes, bridging)
- real-world use cases (support automation, document processing, multi-tenant)
- security patterns (admin/user boundary, classification)
- error handling patterns (confidence gates)
- advanced patterns (parallel analysis / fork/merge)
- ESLint integration examples

## Related docs

- Docs index: `docs/README.md`
- Patterns & recipes: `docs/guides/patterns.md`
- Security model: `docs/guides/security-model.md`
- ESLint reference: `docs/reference/eslint-plugin.md`
- Integration testing: `docs/contributing/integration-tests.md`
