import {RuleTester} from '@typescript-eslint/rule-tester';
import * as tsParser from '@typescript-eslint/parser';
import {afterAll, describe, it} from 'vitest';
import rule from './no-sink-leak.js';

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

ruleTester.run('no-sink-leak', rule, {
  valid: [
    {
      name: 'Redacted value passed to console',
      code: `
        type LogSafe<T> = T & { readonly __brand: 'LogSafe' };
        type Owned<T, S extends string> = { value: T; confidence: number; __scope: S; traceId: string };
        declare function redact(value: unknown): LogSafe<string>;

        const data: Owned<string, 'admin'> = {
          value: 'secret',
          confidence: 1,
          __scope: 'admin',
          traceId: 't1'
        };

        console.log(redact(data));
      `,
    },
    {
      name: 'Summarized value passed to logger',
      code: `
        type LogSafe<T> = T & { readonly __brand: 'LogSafe' };
        type Owned<T, S extends string> = { value: T; confidence: number; __scope: S; traceId: string };
        declare function summarize(value: unknown): LogSafe<string>;

        const logger = { info: (value: unknown) => value };
        const data: Owned<string, 'admin'> = {
          value: 'secret',
          confidence: 1,
          __scope: 'admin',
          traceId: 't1'
        };

        logger.info(summarize(data));
      `,
    },
    {
      name: 'Explicit safe assertion allowed',
      code: `
        type LogSafe<T> = T & { readonly __brand: 'LogSafe' };
        type Owned<T, S extends string> = { value: T; confidence: number; __scope: S; traceId: string };
        declare function assertSafeFor<T>(scope: string, value: T): LogSafe<T>;

        const data: Owned<string, 'admin'> = {
          value: 'secret',
          confidence: 1,
          __scope: 'admin',
          traceId: 't1'
        };

        console.warn(assertSafeFor('public', data));
      `,
    },
    {
      name: 'Plain string logging allowed',
      code: `
        console.info('ok');
      `,
    },
  ],
  invalid: [
    {
      name: 'Owned value passed to console',
      code: `
        type Owned<T, S extends string> = { value: T; confidence: number; __scope: S; traceId: string };

        const data: Owned<string, 'admin'> = {
          value: 'secret',
          confidence: 1,
          __scope: 'admin',
          traceId: 't1'
        };

        console.log(data);
      `,
      errors: [{messageId: 'sinkLeak'}],
    },
    {
      name: 'Owned value passed to logger',
      code: `
        type Owned<T, S extends string> = { value: T; confidence: number; __scope: S; traceId: string };

        const logger = { info: (value: unknown) => value };
        const data: Owned<string, 'admin'> = {
          value: 'secret',
          confidence: 1,
          __scope: 'admin',
          traceId: 't1'
        };

        logger.info(data);
      `,
      errors: [{messageId: 'sinkLeak'}],
    },
    {
      name: 'Owned value passed to span.setAttribute',
      code: `
        type Owned<T, S extends string> = { value: T; confidence: number; __scope: S; traceId: string };

        const span = { setAttribute: (key: string, value: unknown) => value };
        const data: Owned<string, 'admin'> = {
          value: 'secret',
          confidence: 1,
          __scope: 'admin',
          traceId: 't1'
        };

        span.setAttribute('input', data);
      `,
      errors: [{messageId: 'sinkLeak'}],
    },
    {
      name: 'Owned value passed to captureException',
      code: `
        type Owned<T, S extends string> = { value: T; confidence: number; __scope: S; traceId: string };
        declare function captureException(error: unknown): void;

        const data: Owned<string, 'admin'> = {
          value: 'secret',
          confidence: 1,
          __scope: 'admin',
          traceId: 't1'
        };

        captureException(data);
      `,
      errors: [{messageId: 'sinkLeak'}],
    },
    {
      name: 'Owned value .value passed to logger',
      code: `
        type Owned<T, S extends string> = { value: T; confidence: number; __scope: S; traceId: string };

        const logger = { info: (value: unknown) => value };
        const data: Owned<string, 'admin'> = {
          value: 'secret',
          confidence: 1,
          __scope: 'admin',
          traceId: 't1'
        };

        logger.info(data.value);
      `,
      errors: [{messageId: 'sinkLeak'}],
    },
  ],
});
