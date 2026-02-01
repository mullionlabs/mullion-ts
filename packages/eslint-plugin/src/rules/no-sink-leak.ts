/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import {ESLintUtils} from '@typescript-eslint/utils';
import type {TSESTree} from '@typescript-eslint/utils';
import type * as ts from 'typescript';

/**
 * ESLint rule: no-sink-leak
 *
 * Detects when an Owned value is sent to logging, tracing, or error-reporting sinks
 * without explicit redaction or safe marking.
 */

type MessageIds = 'sinkLeak';

type Options = [];

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/mullionlabs/mullion-ts/blob/main/packages/eslint-plugin/docs/rules/${name}.md`,
);

const LOGGER_OBJECT_NAMES = new Set(['logger', 'log', 'pino', 'winston']);
const SINK_FUNCTION_NAMES = new Set(['captureException']);
const SINK_OBJECT_NAMES = new Set(['console', 'Sentry', 'trace']);
const SPAN_METHODS = new Set(['setAttribute', 'addEvent']);
const SAFE_WRAPPERS = new Set(['redact', 'summarize', 'assertSafeFor']);

export default createRule<Options, MessageIds>({
  name: 'no-sink-leak',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow passing Owned values into logging/tracing/error-reporting sinks without redaction',
    },
    messages: {
      sinkLeak:
        "Unsafe sink usage: Owned value passed to '{{sink}}'. Use redact(), summarize(), or assertSafeFor() before logging/tracing.",
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();

    function unwrapExpression(node: TSESTree.Expression): TSESTree.Expression {
      if (node.type === 'ChainExpression') {
        return unwrapExpression(node.expression);
      }
      if (
        node.type === 'TSAsExpression' ||
        node.type === 'TSTypeAssertion' ||
        node.type === 'TSNonNullExpression'
      ) {
        return unwrapExpression(node.expression);
      }
      return node;
    }

    function getPropertyName(
      node: TSESTree.MemberExpression['property'],
    ): string | null {
      if (node.type === 'Identifier') return node.name;
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return node.value;
      }
      return null;
    }

    function getRootIdentifierName(node: TSESTree.Expression): string | null {
      const unwrapped = unwrapExpression(node);
      if (unwrapped.type === 'Identifier') return unwrapped.name;
      if (unwrapped.type === 'MemberExpression') {
        if (unwrapped.object.type === 'Identifier') {
          return unwrapped.object.name;
        }
        return getRootIdentifierName(unwrapped.object);
      }
      return null;
    }

    function isOwnedType(type: ts.Type): boolean {
      const typeName = checker.typeToString(type);
      return typeName.startsWith('Owned<');
    }

    function isLogSafeType(type: ts.Type): boolean {
      const typeName = checker.typeToString(type);
      return (
        typeName.startsWith('LogSafe<') || typeName.startsWith('Redacted<')
      );
    }

    function isSpanLikeExpression(node: TSESTree.Expression): boolean {
      const rootName = getRootIdentifierName(node);
      if (rootName && /span/i.test(rootName)) return true;

      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
      const type = checker.getTypeAtLocation(tsNode);
      const typeName = checker.typeToString(type);
      return typeName.includes('Span');
    }

    function describeSink(node: TSESTree.CallExpression): string | null {
      const callee = node.callee;
      const unwrapped =
        callee.type === 'ChainExpression' ? callee.expression : callee;

      if (unwrapped.type === 'Identifier') {
        if (SINK_FUNCTION_NAMES.has(unwrapped.name)) return unwrapped.name;
        return null;
      }

      if (unwrapped.type !== 'MemberExpression') return null;

      const objectName = getRootIdentifierName(unwrapped.object);
      const propertyName = getPropertyName(unwrapped.property);

      if (objectName && SINK_OBJECT_NAMES.has(objectName)) {
        return propertyName ? `${objectName}.${propertyName}` : objectName;
      }

      if (objectName && LOGGER_OBJECT_NAMES.has(objectName)) {
        return propertyName ? `${objectName}.${propertyName}` : objectName;
      }

      if (propertyName && SPAN_METHODS.has(propertyName)) {
        if (isSpanLikeExpression(unwrapped.object)) {
          return `span.${propertyName}`;
        }
      }

      return null;
    }

    function isSafeWrapperCall(node: TSESTree.Expression): boolean {
      const unwrapped = unwrapExpression(node);
      if (unwrapped.type !== 'CallExpression') return false;

      const callee = unwrapped.callee;
      if (callee.type === 'Identifier') {
        return SAFE_WRAPPERS.has(callee.name);
      }

      if (callee.type === 'MemberExpression') {
        const propertyName = getPropertyName(callee.property);
        if (propertyName && SAFE_WRAPPERS.has(propertyName)) {
          return true;
        }
      }

      return false;
    }

    function isOwnedValueAccess(node: TSESTree.Expression): boolean {
      const unwrapped = unwrapExpression(node);
      if (unwrapped.type !== 'MemberExpression') return false;

      const propertyName = getPropertyName(unwrapped.property);
      if (propertyName !== 'value') return false;

      const objectNode = unwrapExpression(unwrapped.object);
      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(objectNode);
      const type = checker.getTypeAtLocation(tsNode);
      return isOwnedType(type);
    }

    function shouldReport(node: TSESTree.Expression): boolean {
      if (isSafeWrapperCall(node)) return false;

      const unwrapped = unwrapExpression(node);
      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(unwrapped);
      const type = checker.getTypeAtLocation(tsNode);

      if (isLogSafeType(type)) return false;
      if (isOwnedType(type)) return true;
      if (isOwnedValueAccess(unwrapped)) return true;

      return false;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const sink = describeSink(node);
        if (!sink) return;

        for (const arg of node.arguments) {
          if (arg.type === 'SpreadElement') {
            if (shouldReport(arg.argument)) {
              context.report({node: arg, messageId: 'sinkLeak', data: {sink}});
            }
            continue;
          }

          if (shouldReport(arg)) {
            context.report({node: arg, messageId: 'sinkLeak', data: {sink}});
          }
        }
      },
    };
  },
});
