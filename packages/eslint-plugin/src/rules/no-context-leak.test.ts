import {RuleTester} from '@typescript-eslint/rule-tester';
import * as tsParser from '@typescript-eslint/parser';
import {afterAll, describe, it} from 'vitest';
import rule from './no-context-leak.js';

// Configure RuleTester to use Vitest
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

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

ruleTester.run('no-context-leak', rule, {
  valid: [
    // Test: Using Owned value in same scope - OK
    {
      name: 'Owned value used in same scope',
      code: `
        import type { Context, Owned } from '@mullion/core';

        async function handleAdmin(ctx: Context<'admin'>) {
          const notes: Owned<string, 'admin'> = {
            value: 'data',
            confidence: 1,
            __scope: 'admin',
            traceId: '123'
          };
          return ctx.use(notes);
        }
      `,
    },

    // Test: Bridged value - OK
    {
      name: 'Owned value bridged with ctx.bridge()',
      code: `
        import type { Context, Owned } from '@mullion/core';

        const adminNotes: Owned<string, 'admin'> = {
          value: 'data',
          confidence: 1,
          __scope: 'admin',
          traceId: '123'
        };

        async function handleCustomer(ctx: Context<'customer'>) {
          const bridged = ctx.bridge(adminNotes);
          return ctx.use(bridged);
        }
      `,
    },

    // Test: Standalone bridge() function - OK
    {
      name: 'Owned value bridged with standalone bridge()',
      code: `
        import { bridge } from '@mullion/core';
        import type { Context, Owned } from '@mullion/core';

        const adminData: Owned<string, 'admin'> = {
          value: 'data',
          confidence: 1,
          __scope: 'admin',
          traceId: '123'
        };

        async function handleCustomer(ctx: Context<'customer'>) {
          const bridged = bridge(adminData, 'customer');
          return bridged.value;
        }
      `,
    },

    // Test: bridgeSemantic() function - OK
    {
      name: 'SemanticValue bridged with bridgeSemantic()',
      code: `
        import { bridgeSemantic } from '@mullion/core';
        import type { Context, SemanticValue } from '@mullion/core';

        const analysis: SemanticValue<string, 'ai'> = {
          value: 'positive',
          confidence: 0.9,
          __scope: 'ai',
          traceId: '123',
          alternatives: [],
          reasoning: 'test'
        };

        async function handleReport(ctx: Context<'report'>) {
          const bridged = bridgeSemantic(analysis, 'report');
          return bridged.value;
        }
      `,
    },

    // Test: No Context parameter (not in scope) - OK
    {
      name: 'Owned value used outside any scope context',
      code: `
        import type { Owned } from '@mullion/core';

        const data: Owned<string, 'test'> = {
          value: 'data',
          confidence: 1,
          __scope: 'test',
          traceId: '123'
        };

        function processData() {
          return data.value;
        }
      `,
    },

    // Test: Allowed pairs configuration - OK
    {
      name: 'Scope pairs in allowedPairs list',
      code: `
        import type { Context, Owned } from '@mullion/core';

        const internalData: Owned<string, 'internal'> = {
          value: 'data',
          confidence: 1,
          __scope: 'internal',
          traceId: '123'
        };

        async function handlePublic(ctx: Context<'public'>) {
          return internalData.value;
        }
      `,
      options: [{allowedPairs: [['internal', 'public']]}],
    },

    // Test: Type annotations don't trigger - OK
    {
      name: 'Type references are ignored',
      code: `
        import type { Context, Owned } from '@mullion/core';

        function test(ctx: Context<'test'>) {
          type MyType = Owned<string, 'admin'>;
          const x: MyType = {
            value: 'data',
            confidence: 1,
            __scope: 'test',
            traceId: '123'
          };
          return x;
        }
      `,
    },

    // Test: Nested scopes - OK when properly scoped
    {
      name: 'Nested scopes with proper isolation',
      code: `
        import type { Context, Owned } from '@mullion/core';

        async function outer(outerCtx: Context<'outer'>) {
          const outerData: Owned<string, 'outer'> = {
            value: 'data',
            confidence: 1,
            __scope: 'outer',
            traceId: '123'
          };

          return outerCtx.use(outerData);
        }
      `,
    },
  ],

  invalid: [
    // Test: Basic context leak
    {
      name: 'Owned value from admin scope used in customer scope',
      code: `
        interface Owned<T, S extends string> {
          value: T;
          confidence: number;
          __scope: S;
          traceId: string;
        }

        interface Context<S extends string> {
          readonly scope: S;
        }

        const adminNotes: Owned<string, 'admin'> = {
          value: 'secret',
          confidence: 1,
          __scope: 'admin',
          traceId: '123'
        };

        async function handleCustomer(ctx: Context<'customer'>) {
          return adminNotes.value;
        }
      `,
      errors: [
        {
          messageId: 'contextLeak',
          data: {
            variable: 'adminNotes',
            sourceScope: 'admin',
            targetScope: 'customer',
          },
        },
      ],
    },

    // Test: Multiple violations in same function
    {
      name: 'Multiple Owned values leaked',
      code: `
        interface Owned<T, S extends string> {
          value: T;
          confidence: number;
          __scope: S;
          traceId: string;
        }

        interface Context<S extends string> {
          readonly scope: S;
        }

        const data1: Owned<string, 'scope1'> = {
          value: 'a',
          confidence: 1,
          __scope: 'scope1',
          traceId: '1'
        };
        const data2: Owned<string, 'scope2'> = {
          value: 'b',
          confidence: 1,
          __scope: 'scope2',
          traceId: '2'
        };

        async function handleScope3(ctx: Context<'scope3'>) {
          return data1.value + data2.value;
        }
      `,
      errors: [
        {
          messageId: 'contextLeak',
          data: {
            variable: 'data1',
            sourceScope: 'scope1',
            targetScope: 'scope3',
          },
        },
        {
          messageId: 'contextLeak',
          data: {
            variable: 'data2',
            sourceScope: 'scope2',
            targetScope: 'scope3',
          },
        },
      ],
    },

    // Test: Property access on leaked value
    {
      name: 'Accessing properties of leaked Owned value',
      code: `
        interface Owned<T, S extends string> {
          value: T;
          confidence: number;
          __scope: S;
          traceId: string;
        }

        interface Context<S extends string> {
          readonly scope: S;
        }

        const adminData: Owned<{ secret: string }, 'admin'> = {
          value: { secret: 'data' },
          confidence: 1,
          __scope: 'admin',
          traceId: '123'
        };

        async function handleUser(ctx: Context<'user'>) {
          console.log(adminData.value.secret);
        }
      `,
      errors: [
        {
          messageId: 'contextLeak',
          data: {
            variable: 'adminData',
            sourceScope: 'admin',
            targetScope: 'user',
          },
        },
      ],
    },

    // Test: Passed as argument (still a leak)
    {
      name: 'Leaked value passed to function',
      code: `
        interface Owned<T, S extends string> {
          value: T;
          confidence: number;
          __scope: S;
          traceId: string;
        }

        interface Context<S extends string> {
          readonly scope: S;
        }

        const source: Owned<string, 'source'> = {
          value: 'data',
          confidence: 1,
          __scope: 'source',
          traceId: '123'
        };

        function logData(data: any) {
          console.log(data);
        }

        async function handleTarget(ctx: Context<'target'>) {
          logData(source);
        }
      `,
      errors: [
        {
          messageId: 'contextLeak',
          data: {
            variable: 'source',
            sourceScope: 'source',
            targetScope: 'target',
          },
        },
      ],
    },

    // Test: Arrow function context
    {
      name: 'Context leak in arrow function',
      code: `
        interface Owned<T, S extends string> {
          value: T;
          confidence: number;
          __scope: S;
          traceId: string;
        }

        interface Context<S extends string> {
          readonly scope: S;
        }

        const data: Owned<string, 'admin'> = {
          value: 'secret',
          confidence: 1,
          __scope: 'admin',
          traceId: '123'
        };

        const handler = async (ctx: Context<'public'>) => {
          return data.value;
        };
      `,
      errors: [
        {
          messageId: 'contextLeak',
          data: {
            variable: 'data',
            sourceScope: 'admin',
            targetScope: 'public',
          },
        },
      ],
    },

    // Test: Function expression
    {
      name: 'Context leak in function expression',
      code: `
        interface Owned<T, S extends string> {
          value: T;
          confidence: number;
          __scope: S;
          traceId: string;
        }

        interface Context<S extends string> {
          readonly scope: S;
        }

        const secretData: Owned<string, 'secret'> = {
          value: 'classified',
          confidence: 1,
          __scope: 'secret',
          traceId: '123'
        };

        const process = async function(ctx: Context<'public'>) {
          return secretData.value;
        };
      `,
      errors: [
        {
          messageId: 'contextLeak',
          data: {
            variable: 'secretData',
            sourceScope: 'secret',
            targetScope: 'public',
          },
        },
      ],
    },
  ],
});
