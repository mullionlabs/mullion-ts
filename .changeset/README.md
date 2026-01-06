# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelogs.

## Adding a Changeset

When you make a change that should be released, run:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages have changed
2. Choose the bump type (major/minor/patch) for each
3. Write a summary of the changes

## Example Workflow

### Making Changes

```bash
# Make your code changes
git checkout -b feature/new-eslint-rule

# Add a changeset describing the change
pnpm changeset
# Select: eslint-plugin-intentkit
# Bump type: minor
# Summary: "Add new rule 'no-unhandled-alternatives'"

# Commit everything
git add .
git commit -m "feat(eslint-plugin): add no-unhandled-alternatives rule"
```

### Releasing

```bash
# Update versions based on changesets
pnpm version

# This creates:
# - Updated package.json versions
# - Updated CHANGELOG.md files
# - Removes consumed changesets

# Review and commit
git add .
git commit -m "chore: release"

# Publish to npm
pnpm release
```

## Versioning Strategy

We use **independent versioning**:
- Each package has its own version
- Changes to `@intentkit/core` don't auto-bump other packages
- Peer dependency updates are handled automatically

### Peer Dependencies

- `eslint-plugin-intentkit` has `@intentkit/core` as peer dependency
- `@intentkit/ai-sdk` has `@intentkit/core` as peer dependency

When releasing a breaking change to `core`, you may need to update peer dep ranges in other packages.

## CI Integration

GitHub Actions will:
1. Create a "Version Packages" PR when changesets exist on main
2. Merge the PR to trigger npm publish
3. Create GitHub releases with changelogs

See `.github/workflows/release.yml` for details.
