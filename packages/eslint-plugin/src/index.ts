/**
 * @mullion/eslint-plugin
 *
 * ESLint rules for type-safe LLM context management with Mullion.
 *
 * @see https://github.com/mullionlabs/mullion-ts
 */

import noContextLeak from './rules/no-context-leak.js';
import noSinkLeak from './rules/no-sink-leak.js';
import requireConfidenceCheck from './rules/require-confidence-check.js';

const rules = {
  'no-context-leak': noContextLeak,
  'no-sink-leak': noSinkLeak,
  'require-confidence-check': requireConfidenceCheck,
};

/**
 * Recommended configuration for Mullion ESLint rules.
 *
 * Enables all rules with sensible defaults:
 * - no-context-leak: error - Prevents accidental context leaks
 * - require-confidence-check: warn - Suggests confidence validation
 */
const recommended = {
  plugins: {
    '@mullion': {rules},
  },
  rules: {
    '@mullion/no-context-leak': 'error',
    '@mullion/no-sink-leak': 'error',
    '@mullion/require-confidence-check': 'warn',
  },
};

/**
 * Strict configuration with all rules as errors.
 */
const strict = {
  plugins: {
    '@mullion': {rules},
  },
  rules: {
    '@mullion/no-context-leak': 'error',
    '@mullion/no-sink-leak': 'error',
    '@mullion/require-confidence-check': 'error',
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
export {rules, configs, recommended, strict};
