/**
 * eslint-plugin-scopestack
 *
 * ESLint rules for type-safe LLM context management with ScopeStack.
 *
 * @see https://github.com/scopestack/scopestack-ts
 */

import noContextLeak from './rules/no-context-leak.js';

const rules = {
  'no-context-leak': noContextLeak,
};

/**
 * Recommended configuration for ScopeStack ESLint rules.
 *
 * Enables all rules with sensible defaults:
 * - no-context-leak: error - Prevents accidental context leaks
 */
const recommended = {
  plugins: {
    scopestack: { rules },
  },
  rules: {
    'scopestack/no-context-leak': 'error',
  },
};

/**
 * Strict configuration with all rules as errors.
 *
 * Same as recommended for now, but allows room for warn-level rules in the future.
 */
const strict = {
  plugins: {
    scopestack: { rules },
  },
  rules: {
    'scopestack/no-context-leak': 'error',
  },
};

/**
 * All available configurations.
 */
const configs = {
  recommended,
  strict,
};

// Default export for ESLint flat config
export default {
  rules,
  configs,
};

// Named exports for compatibility
export { rules, configs, recommended, strict };
