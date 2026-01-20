import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      '**/examples/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/packages/create-mullion/templates/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/.changeset/**',
      '**/pnpm-lock.yaml',
    ],
  },

  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript configuration for all TS files
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        defaultProject: './tsconfig.json',
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'function',
          format: ['camelCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
        },
      ],

      // TypeScript strict mode enforcement
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

      // Additional quality rules
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Stylistic preferences
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
    },
  },

  // Test files - disable type-aware linting
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Config files - disable type checking
  {
    files: ['**/*.config.{js,ts,mjs}', '**/eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Nuxt demo apps - relax strict type checking for auto-imports
  {
    files: ['apps/demo-*/**/*.{ts,tsx,vue}'],
    rules: {
      // Nuxt auto-imports cause false positives with these rules
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // Allow explicit any in demo code
      '@typescript-eslint/no-explicit-any': 'off',
      // Turn off type-aware rules that don't work well with Nuxt
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      // Allow async functions without await (for future-proofing/consistency)
      '@typescript-eslint/require-await': 'off',
    },
  }
);
