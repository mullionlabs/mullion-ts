import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
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
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // Code style - following CLAUDE.md conventions
      '@typescript-eslint/naming-convention': [
        'error',
        // Types: PascalCase
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        // Functions: camelCase
        {
          selector: 'function',
          format: ['camelCase'],
        },
        // Variables: camelCase or UPPER_CASE for constants
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

      // Prefer interface over type for objects (CLAUDE.md convention)
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

  // Test files - more lenient rules
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // Config files - disable type checking
  {
    files: ['**/*.config.{js,ts,mjs}', '**/eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  }
);
