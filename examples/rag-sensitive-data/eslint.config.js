import mullion from '@mullion/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
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
      '@mullion/no-context-leak': 'error',
      '@mullion/require-confidence-check': 'warn',
    },
  },
];
