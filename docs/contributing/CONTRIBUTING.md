# Contributing to Mullion

Thank you for your interest in contributing to Mullion! This guide will help you get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Project Structure](#project-structure)
- [Need Help?](#need-help)

## Getting Started

### Prerequisites

- **Node.js**: 20.0.0 or higher
- **pnpm**: 9.0.0 or higher
- **Git**: For version control

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/mullion-ts.git
   cd mullion-ts
   ```

3. **Add upstream remote:**

   ```bash
   git remote add upstream https://github.com/mullionlabs/mullion-ts.git
   ```

4. **Install dependencies:**

   ```bash
   pnpm install
   ```

5. **Build all packages:**

   ```bash
   pnpm build
   ```

6. **Verify setup:**

   ```bash
   pnpm typecheck
   pnpm test
   pnpm lint
   ```

## Development Workflow

### Creating a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `refactor/` - Code refactoring
- `test/` - Test additions or updates
- `chore/` - Maintenance tasks

### Making Changes

1. **Make your changes** in the appropriate package(s)

2. **Build affected packages:**

   ```bash
   # Build all packages
   pnpm build

   # Build specific package
   pnpm --filter @mullion/core build
   ```

3. **Run tests:**

   ```bash
   # All tests
   pnpm test

   # Watch mode
   pnpm test:watch

   # Specific package
   pnpm --filter @mullion/eslint-plugin test
   ```

4. **Type check:**

   ```bash
   pnpm typecheck
   ```

5. **Lint your code:**

   ```bash
   pnpm lint
   ```

6. **Format code:**

   ```bash
   pnpm format
   ```

### Git Hooks

The project uses Husky and lint-staged to enforce quality:

- **Pre-commit**: Runs Prettier and ESLint on staged files
- **Commit-msg**: Validates commit messages using commitlint

Commits should follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

Examples:

```bash
feat(core): add SemanticValue type
fix(eslint-plugin): correct scope detection in no-context-leak
docs(readme): update installation instructions
test(ai-sdk): add integration tests for Anthropic provider
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

## Code Standards

### TypeScript

- **Strict mode always** (`"strict": true`)
- **No `any`** - use `unknown` and narrow with type guards
- **Prefer `interface` over `type`** for object shapes
- **Use branded types** for nominal typing when needed
- **Separate type imports**: Use `import type` for type-only imports

  ```typescript
  // ✅ GOOD
  import {scope} from './scope.js';
  import type {Owned, Context} from './types.js';

  // ❌ BAD
  import {scope, Owned, Context} from './scope.js';
  ```

### Naming Conventions

- **Types**: PascalCase (`Owned`, `Context`, `SemanticValue`)
- **Functions**: camelCase (`createScope`, `bridgeValues`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CONFIDENCE_THRESHOLD`)
- **Files**: kebab-case (`no-context-leak.ts`, `semantic-value.ts`)

### Code Style

- **2 spaces** for indentation (enforced by Prettier)
- **Single quotes** for strings
- **Trailing commas** in multi-line structures
- **JSDoc comments** for public APIs
- **Meaningful variable names** over abbreviations

### Documentation

- Add JSDoc comments for all public APIs
- Include `@example` tags showing usage
- Document parameters with `@param`
- Document return values with `@returns`
- Add `@throws` for documented error conditions

Example:

````typescript
/**
 * Bridges an owned value from one scope to another, creating a traceable
 * boundary crossing.
 *
 * @param value - The owned value to bridge
 * @returns A new owned value with combined scope types
 *
 * @example
 * ```typescript
 * const adminData = await adminCtx.infer(Schema, input);
 * const bridged = publicCtx.bridge(adminData);
 * // bridged.__scope is now "admin | public"
 * ```
 */
function bridge<T, OS extends string>(value: Owned<T, OS>): Owned<T, S | OS>;
````

## Testing

### Unit Tests

Every package should have comprehensive unit tests using Vitest:

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test -- --coverage
```

### Test Structure

```typescript
import {describe, it, expect} from 'vitest';

describe('feature name', () => {
  it('should handle the happy path', () => {
    // Arrange
    const input = createTestInput();

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expected);
  });

  it('should handle edge cases', () => {
    // ...
  });
});
```

### ESLint Rule Tests

Every ESLint rule must have both valid and invalid test cases:

```typescript
import {RuleTester} from '@typescript-eslint/rule-tester';
import rule from './no-context-leak';

const ruleTester = new RuleTester();

ruleTester.run('no-context-leak', rule, {
  valid: [
    {
      code: `
        const data = await adminCtx.infer(Schema, input);
        const safe = publicCtx.bridge(data);
      `,
    },
  ],
  invalid: [
    {
      code: `
        const data = await adminCtx.infer(Schema, input);
        await publicCtx.respond(data.value); // leak!
      `,
      errors: [{messageId: 'contextLeak'}],
    },
  ],
});
```

### Integration Tests

For real provider testing, see [Integration Tests Guide](./integration-tests.md).

## Pull Request Process

### Before Submitting

1. **Update from upstream:**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure all checks pass:**

   ```bash
   pnpm build
   pnpm typecheck
   pnpm test
   pnpm lint
   pnpm format:check
   ```

3. **Add a changeset** (if your changes affect published packages):

   ```bash
   pnpm changeset
   ```

   - Select affected packages
   - Choose bump type (major/minor/patch)
   - Write a clear summary for the changelog

4. **Commit your changes:**

   ```bash
   git add .
   git commit -m "feat(core): add new feature"
   ```

5. **Push to your fork:**

   ```bash
   git push origin feature/your-feature-name
   ```

### Creating the PR

1. Go to the [Mullion repository](https://github.com/mullionlabs/mullion-ts)
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill out the PR template:
   - **Title**: Clear, descriptive (follows Conventional Commits)
   - **Description**: What changed and why
   - **Testing**: How you tested the changes
   - **Breaking changes**: Any breaking changes and migration path
   - **Related issues**: Link to related issues

### PR Requirements

Your PR must:

- [ ] Pass all CI checks (build, typecheck, test, lint)
- [ ] Include tests for new features or bug fixes
- [ ] Update documentation if needed
- [ ] Include a changeset (if affecting published packages)
- [ ] Follow code standards and conventions
- [ ] Have a clear commit history

### Review Process

1. Maintainers will review your PR
2. Address any feedback by pushing new commits
3. Once approved, a maintainer will merge your PR

## Release Process

Releases are managed using Changesets and automated via GitHub Actions.

### For Contributors

Just add a changeset when making changes:

```bash
pnpm changeset
```

### For Maintainers

1. **Review changesets** in PRs
2. **Merge approved PRs** to main
3. **GitHub Actions** will automatically:
   - Create a "Version Packages" PR
   - Update versions and CHANGELOG.md
4. **Merge the Version Packages PR** to trigger release
5. **Packages are published** to npm automatically

## Project Structure

```
mullion/
├── packages/
│   ├── core/                 # @mullion/core - Core primitives
│   ├── eslint-plugin/        # @mullion/eslint-plugin - ESLint rules
│   └── ai-sdk/               # @mullion/ai-sdk - Vercel AI SDK adapter
├── examples/
│   └── basic/                # Working examples
├── docs/
│   ├── guides/               # User guides
│   ├── reference/            # API reference
│   ├── design/               # Design docs
│   ├── adr/                  # Architecture Decision Records
│   └── contributing/         # Contribution guides (you are here)
├── .changeset/               # Changesets configuration
├── .github/workflows/        # CI/CD workflows
└── turbo.json               # Turborepo configuration
```

### Key Files

- `package.json` - Root package with scripts
- `pnpm-workspace.yaml` - Workspace configuration
- `turbo.json` - Build caching configuration
- `tsconfig.base.json` - Shared TypeScript config
- `CLAUDE.md` - Development guide for AI assistants
- `TODO/` - Project roadmap with modular task structure

## Common Tasks

### Adding a New Package

1. Create package directory: `packages/new-package/`
2. Add `package.json` with proper metadata
3. Add to `pnpm-workspace.yaml` (if not using glob)
4. Create `tsconfig.json` extending base config
5. Add build script to `package.json`
6. Update root documentation

### Debugging Build Issues

```bash
# Clean everything
pnpm clean

# Reinstall dependencies
pnpm install

# Force rebuild
turbo run build --force

# See what will build
turbo run build --dry-run
```

### Working with Specific Packages

```bash
# Build specific package
pnpm --filter @mullion/core build

# Test specific package
pnpm --filter @mullion/eslint-plugin test

# Add dependency to package
pnpm --filter @mullion/core add zod
```

## Need Help?

- **Documentation**: Check [docs/README.md](../README.md)
- **Examples**: See [examples/basic](../../examples/basic)
- **Issues**: Search [existing issues](https://github.com/mullionlabs/mullion-ts/issues)
- **Questions**: Open a [discussion](https://github.com/mullionlabs/mullion-ts/discussions)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the project
- Assume good intentions

## License

By contributing to Mullion, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Mullion! Your efforts help make LLM workflows safer and more reliable for everyone.
