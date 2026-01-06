export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only changes
        'style',    // Changes that don't affect code meaning (white-space, formatting, etc)
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf',     // Performance improvement
        'test',     // Adding missing tests or correcting existing tests
        'build',    // Changes that affect the build system or external dependencies
        'ci',       // Changes to CI configuration files and scripts
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Reverts a previous commit
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'core',
        'eslint-plugin',
        'ai-sdk',
        'deps',
        'release',
        'monorepo',
      ],
    ],
    'scope-empty': [1, 'never'], // Warn if scope is empty
    'subject-case': [2, 'always', 'sentence-case'],
  },
};
