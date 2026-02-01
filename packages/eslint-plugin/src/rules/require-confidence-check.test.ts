import {RuleTester} from '@typescript-eslint/rule-tester';
import * as tsParser from '@typescript-eslint/parser';
import {afterAll, describe, it} from 'vitest';
import rule from './require-confidence-check.js';

// Configure RuleTester to use Vitest
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = (name, fn) => it(name, fn, 10000);

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts'],
      },
      tsconfigRootDir: import.meta.dirname,
    },
  },
});

// Type definitions for tests (since we can't import from @mullion/core in tests)
const typeDefinitions = `
interface Owned<T, S extends string> {
  value: T;
  confidence: number;
  __scope: S;
  traceId: string;
}

interface SemanticValue<T, S extends string> extends Owned<T, S> {
  alternatives: Array<{ value: T; confidence: number }>;
  reasoning?: string;
}

interface Context<S extends string> {
  readonly scope: S;
}
`;

ruleTester.run('require-confidence-check', rule, {
  valid: [
    // 1. Confidence checked with if statement
    {
      name: 'Valid: if statement checks confidence before using value',
      code: `
        ${typeDefinitions}

        async function process(sentiment: Owned<string, 'user'>) {
          if (sentiment.confidence >= 0.8) {
            return sentiment.value;
          }
          return 'unknown';
        }
      `,
    },

    // 2. Ternary operator with confidence check
    {
      name: 'Valid: ternary operator checks confidence',
      code: `
        ${typeDefinitions}

        async function process(sentiment: Owned<string, 'user'>) {
          return sentiment.confidence >= 0.8 ? sentiment.value : 'fallback';
        }
      `,
    },

    // 3. Using handler function
    {
      name: 'Valid: handler function processes Owned value',
      code: `
        ${typeDefinitions}

        function handleLowConfidence<T>(owned: Owned<T, any>): T {
          return owned.value;
        }

        async function process(sentiment: Owned<string, 'user'>) {
          const resolved = handleLowConfidence(sentiment);
          return resolved;
        }
      `,
      options: [{handlerFunctions: ['handleLowConfidence']}],
    },

    // 4. Logical AND with confidence check
    {
      name: 'Valid: logical AND checks confidence',
      code: `
        ${typeDefinitions}

        async function process(sentiment: Owned<string, 'user'>) {
          const value = sentiment.confidence >= 0.8 && sentiment.value;
          return value || 'fallback';
        }
      `,
    },

    // 5. Not an Owned type - should not trigger
    {
      name: 'Valid: regular object with .value property',
      code: `
        ${typeDefinitions}

        interface RegularObject {
          value: string;
          confidence: number;
        }

        function process(obj: RegularObject) {
          return obj.value;
        }
      `,
    },

    // 6. SemanticValue with confidence check
    {
      name: 'Valid: SemanticValue with confidence check',
      code: `
        ${typeDefinitions}

        async function process(result: SemanticValue<string, 'user'>) {
          if (result.confidence >= 0.9) {
            return result.value;
          }
          return result.alternatives[0]?.value || 'fallback';
        }
      `,
    },

    // 7. Confidence checked in else-if
    {
      name: 'Valid: confidence checked in else-if chain',
      code: `
        ${typeDefinitions}

        async function process(sentiment: Owned<string, 'user'>) {
          if (sentiment.confidence >= 0.9) {
            return 'high: ' + sentiment.value;
          } else if (sentiment.confidence >= 0.7) {
            return 'medium: ' + sentiment.value;
          }
          return 'low confidence';
        }
      `,
    },

    // 8. Confidence accessed but not value
    {
      name: 'Valid: only accessing confidence property',
      code: `
        ${typeDefinitions}

        async function getConfidence(sentiment: Owned<string, 'user'>) {
          return sentiment.confidence;
        }
      `,
    },

    // 9. Custom threshold from options
    {
      name: 'Valid: custom threshold in options',
      code: `
        ${typeDefinitions}

        async function process(sentiment: Owned<string, 'user'>) {
          if (sentiment.confidence >= 0.5) {
            return sentiment.value;
          }
          return 'fallback';
        }
      `,
      options: [{threshold: 0.5}],
    },

    // 10. Method call handler
    {
      name: 'Valid: method call as handler',
      code: `
        ${typeDefinitions}

        class Resolver {
          resolve<T>(owned: Owned<T, any>): T {
            return owned.value;
          }
        }

        async function process(sentiment: Owned<string, 'user'>, resolver: Resolver) {
          return resolver.resolve(sentiment);
        }
      `,
      options: [{handlerFunctions: ['resolve']}],
    },
  ],

  invalid: [
    // 1. Basic missing confidence check
    {
      name: 'Invalid: using .value without confidence check',
      code: `
        ${typeDefinitions}

        async function process(sentiment: Owned<string, 'user'>) {
          return sentiment.value;
        }
      `,
      errors: [
        {
          messageId: 'missingConfidenceCheck',
          data: {
            variable: 'sentiment',
            threshold: '0.8',
          },
        },
      ],
    },

    // 2. Multiple missing checks
    {
      name: 'Invalid: multiple Owned values used without checks',
      code: `
        ${typeDefinitions}

        async function process(
          sentiment: Owned<string, 'user'>,
          category: Owned<string, 'user'>
        ) {
          const s = sentiment.value;
          const c = category.value;
          return s + c;
        }
      `,
      errors: [
        {
          messageId: 'missingConfidenceCheck',
          data: {
            variable: 'sentiment',
            threshold: '0.8',
          },
        },
        {
          messageId: 'missingConfidenceCheck',
          data: {
            variable: 'category',
            threshold: '0.8',
          },
        },
      ],
    },

    // 3. Confidence checked but value used outside of conditional
    {
      name: 'Invalid: confidence checked but value used outside',
      code: `
        ${typeDefinitions}

        async function process(sentiment: Owned<string, 'user'>) {
          if (sentiment.confidence >= 0.8) {
            console.log('high confidence');
          }
          return sentiment.value;
        }
      `,
      errors: [
        {
          messageId: 'missingConfidenceCheck',
        },
      ],
    },

    // 4. SemanticValue without check
    {
      name: 'Invalid: SemanticValue used without confidence check',
      code: `
        ${typeDefinitions}

        async function process(result: SemanticValue<string, 'user'>) {
          return result.value;
        }
      `,
      errors: [
        {
          messageId: 'missingConfidenceCheck',
          data: {
            variable: 'result',
            threshold: '0.8',
          },
        },
      ],
    },

    // 5. Handler not in config
    {
      name: 'Invalid: handler function not in configuration',
      code: `
        ${typeDefinitions}

        function unknownHandler<T>(owned: Owned<T, any>): T {
          return owned.value;
        }

        async function process(sentiment: Owned<string, 'user'>) {
          const resolved = unknownHandler(sentiment);
          return resolved;
        }
      `,
      errors: [
        {
          messageId: 'missingConfidenceCheck',
        },
      ],
    },

    // 6. Confidence accessed but value used without check
    {
      name: 'Invalid: confidence accessed separately, but value used without check',
      code: `
        ${typeDefinitions}

        async function process(sentiment: Owned<string, 'user'>) {
          const conf = sentiment.confidence;
          console.log('Confidence:', conf);
          return sentiment.value;
        }
      `,
      errors: [
        {
          messageId: 'missingConfidenceCheck',
        },
      ],
    },

    // 7. Wrong comparison operator (no check)
    {
      name: 'Invalid: accessing value in property assignment',
      code: `
        ${typeDefinitions}

        async function process(sentiment: Owned<string, 'user'>) {
          const result = {
            data: sentiment.value,
            conf: sentiment.confidence,
          };
          return result;
        }
      `,
      errors: [
        {
          messageId: 'missingConfidenceCheck',
        },
      ],
    },

    // 8. Custom threshold violation
    {
      name: 'Invalid: value used without check (custom threshold)',
      code: `
        ${typeDefinitions}

        async function process(sentiment: Owned<string, 'user'>) {
          return sentiment.value;
        }
      `,
      options: [{threshold: 0.95}],
      errors: [
        {
          messageId: 'missingConfidenceCheck',
          data: {
            variable: 'sentiment',
            threshold: '0.95',
          },
        },
      ],
    },
  ],
});
