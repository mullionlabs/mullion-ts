/**
 * eslint-plugin-scopestack
 *
 * ESLint rules for type-safe LLM context management with ScopeStack.
 *
 * @see https://github.com/scopestack/scopestack-ts
 */

import noContextLeak from './rules/no-context-leak.js';
import requireConfidenceCheck from './rules/require-confidence-check.js';

const rules = {
  'no-context-leak': noContextLeak,
  'require-confidence-check': requireConfidenceCheck,
};

/**
 * Recommended configuration for ScopeStack ESLint rules.
 *
 * Enables all rules with sensible defaults:
 * - no-context-leak: error - Prevents accidental context leaks
 * - require-confidence-check: warn - Suggests confidence validation
 */
const recommended = {
  plugins: {
    scopestack: { rules },
  },
  rules: {
    'scopestack/no-context-leak': 'error',
    'scopestack/require-confidence-check': 'warn',
  },
};

/**
 * Strict configuration with all rules as errors.
 */
const strict = {
  plugins: {
    scopestack: { rules },
  },
  rules: {
    'scopestack/no-context-leak': 'error',
    'scopestack/require-confidence-check': 'error',
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
