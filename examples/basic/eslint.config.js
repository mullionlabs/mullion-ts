import mullion from '@mullion/eslint-plugin';
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
      '@mullion': mullion,
    },
    rules: {
      // Mullion rules - these are what we want to demonstrate
      '@mullion/no-context-leak': 'error',
      '@mullion/require-confidence-check': 'warn',

      // Turn off standard rules for demo purposes
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
  // Special config for bad-example.js - disable Mullion rules since they're intentionally violated
  {
    files: ['bad-example.js'],
    rules: {
      '@mullion/no-context-leak': 'off',
      '@mullion/require-confidence-check': 'off',
    },
  },
];
