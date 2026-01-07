import scopestack from 'eslint-plugin-scopestack';
import tsParser from '@typescript-eslint/parser';

export default [
  // Ignore the config file itself
  {
    ignores: ['eslint.config.js'],
  },
  {
    files: ['*.js'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      scopestack: scopestack,
    },
    rules: {
      // ScopeStack rules - these are what we want to demonstrate
      'scopestack/no-context-leak': 'error',
      'scopestack/require-confidence-check': 'warn',

      // Turn off standard rules for demo purposes
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
  // Special config for bad-example.js - disable ScopeStack rules since they're intentionally violated
  {
    files: ['bad-example.js'],
    rules: {
      'scopestack/no-context-leak': 'off',
      'scopestack/require-confidence-check': 'off',
    },
  },
];
