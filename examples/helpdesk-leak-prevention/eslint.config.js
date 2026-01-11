import mullion from '@mullion/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  // Ignore the config file itself
  {
    ignores: ['eslint.config.js'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@mullion': mullion,
    },
    rules: {
      // Mullion rules - these catch context leaks at compile time
      '@mullion/no-context-leak': 'error',
      '@mullion/require-confidence-check': 'warn',
    },
  },
  // Special config for unsafe-flow.ts - we want ESLint to catch these but not fail the demo
  {
    files: ['src/unsafe-flow.ts'],
    rules: {
      // Keep rules enabled so we can demonstrate detection
      '@mullion/no-context-leak': 'error',
      '@mullion/require-confidence-check': 'warn',
    },
  },
];
