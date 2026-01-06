# Claude Code Commands Reference

## Quick Start Commands

```bash
# Start new task
claude "Start Task 1.1 from TODO.md"

# Continue work
claude "Continue with the next subtask"

# Review
claude "Review the changes and run tests"
```

## Task-Specific Commands

### Project Setup
```bash
claude "Create root package.json for pnpm monorepo with workspaces"
claude "Create tsconfig.base.json with strict TypeScript settings"
claude "Set up packages/core with package.json and tsconfig"
```

### Core Types
```bash
claude "Implement Owned<T, S> type in packages/core/src/owned.ts with JSDoc"
claude "Implement Context<S> interface in packages/core/src/context.ts"
claude "Create scope() function in packages/core/src/scope.ts"
```

### ESLint Plugin
```bash
claude "Create ESLint rule skeleton for no-context-leak"
claude "Implement AST detection logic for no-context-leak rule"
claude "Write tests for no-context-leak rule with valid and invalid cases"
```

### Testing
```bash
claude "Run tests and fix any failures"
claude "Add missing test cases for edge scenarios"
```

### Documentation
```bash
claude "Update README with usage examples"
claude "Add JSDoc comments to all public APIs"
```

## Best Practices

### Do
- Reference specific task numbers: "Start Task 2.1"
- Ask for one file at a time
- Request tests alongside implementation
- Ask to verify with build/typecheck

### Don't
- Ask to "build everything"
- Skip the TODO.md structure
- Implement without reading CLAUDE.md first

## Debugging Commands

```bash
# If something breaks
claude "The build is failing with [error]. Fix it."

# If tests fail
claude "Test [name] is failing. Analyze and fix."

# If types are wrong
claude "TypeScript shows error [error] in [file]. Fix the types."
```

## Review Commands

```bash
# Code review
claude "Review [file] for potential issues"

# Architecture review
claude "Does this implementation follow the patterns in CLAUDE.md?"

# Before commit
claude "Prepare a commit message for the current changes"
```
