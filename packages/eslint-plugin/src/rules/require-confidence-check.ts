/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

/**
 * ESLint rule: require-confidence-check
 *
 * Requires confidence check before using Owned or SemanticValue values.
 *
 * This rule ensures that LLM-generated values are validated for confidence
 * before being used, preventing the use of low-confidence results without
 * proper handling.
 *
 * @example
 * ```typescript
 * // ❌ Warning: Using Owned value without confidence check
 * const sentiment = await ctx.infer(SentimentSchema, input);
 * return sentiment.value; // No confidence check!
 *
 * // ✅ OK: Confidence checked
 * const sentiment = await ctx.infer(SentimentSchema, input);
 * if (sentiment.confidence >= 0.8) {
 *   return sentiment.value;
 * }
 * return fallback;
 *
 * // ✅ OK: Using handler function
 * const sentiment = await ctx.infer(SentimentSchema, input);
 * const resolved = handleLowConfidence(sentiment);
 * return resolved.value;
 * ```
 */

type MessageIds = 'missingConfidenceCheck';

type Options = [
  {
    /**
     * Minimum confidence threshold to check for.
     * @default 0.8
     */
    threshold?: number;

    /**
     * Functions that count as confidence handling.
     * These functions are assumed to properly handle low confidence values.
     * @example ["bridge.resolve", "handleLowConfidence"]
     */
    handlerFunctions?: string[];
  },
];

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/scopestack/scopestack-ts/blob/main/packages/eslint-plugin/docs/rules/${name}.md`
);

export default createRule<Options, MessageIds>({
  name: 'require-confidence-check',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require confidence check before using Owned or SemanticValue values',
    },
    messages: {
      missingConfidenceCheck:
        "Missing confidence check for '{{variable}}'. LLM-generated values should be validated (e.g., if ({{variable}}.confidence >= {{threshold}}) before use, or passed to a handler function.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          threshold: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Minimum confidence threshold to check for',
          },
          handlerFunctions: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Functions that count as confidence handling (e.g., ["handleLowConfidence"])',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  defaultOptions: [
    {
      threshold: 0.8,
      handlerFunctions: [],
    },
  ],

  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();
    const options = context.options[0] || {
      threshold: 0.8,
      handlerFunctions: [],
    };

    /**
     * Helper: Check if a TypeScript type is Owned<T, S> or SemanticValue<T, S>
     */
    function isOwnedOrSemanticType(type: ts.Type): boolean {
      const symbol = type.getSymbol();
      if (!symbol) return false;

      const typeName = checker.typeToString(type);
      return (
        typeName.startsWith('Owned<') || typeName.startsWith('SemanticValue<')
      );
    }

    /**
     * Helper: Check if node is inside a confidence check conditional
     * Looks for patterns like: if (variable.confidence >= threshold)
     */
    function isInsideConfidenceCheck(
      node: TSESTree.Node,
      variableName: string
    ): boolean {
      let current: TSESTree.Node | undefined = node;

      while (current) {
        // Check if we're inside an IfStatement
        if (current.type === 'IfStatement') {
          const test = current.test;

          // Check if test references variable.confidence
          if (referencesConfidence(test, variableName)) {
            return true;
          }
        }

        // Check if we're inside a ConditionalExpression (ternary)
        if (current.type === 'ConditionalExpression') {
          const test = current.test;
          if (referencesConfidence(test, variableName)) {
            return true;
          }
        }

        // Check if we're inside a LogicalExpression (&&, ||)
        if (current.type === 'LogicalExpression') {
          if (referencesConfidence(current.left, variableName)) {
            return true;
          }
        }

        current = current.parent;
      }

      return false;
    }

    /**
     * Helper: Check if an expression references variable.confidence
     */
    function referencesConfidence(
      node: TSESTree.Node,
      variableName: string
    ): boolean {
      if (node.type === 'BinaryExpression') {
        // Check left or right side for variable.confidence
        return (
          referencesConfidence(node.left, variableName) ||
          referencesConfidence(node.right, variableName)
        );
      }

      if (node.type === 'MemberExpression') {
        // Check for variable.confidence pattern
        return (
          node.object.type === 'Identifier' &&
          node.object.name === variableName &&
          node.property.type === 'Identifier' &&
          node.property.name === 'confidence'
        );
      }

      if (node.type === 'LogicalExpression') {
        return (
          referencesConfidence(node.left, variableName) ||
          referencesConfidence(node.right, variableName)
        );
      }

      if (node.type === 'UnaryExpression') {
        return referencesConfidence(node.argument, variableName);
      }

      return false;
    }

    /**
     * Helper: Check if variable is passed to a handler function
     */
    function isPassedToHandler(node: TSESTree.Identifier): boolean {
      const parent = node.parent;

      // Check if this identifier is an argument to a function call
      if (parent?.type === 'CallExpression') {
        const callee = parent.callee;

        // Check if the callee is one of the configured handler functions
        if (callee.type === 'Identifier') {
          return options.handlerFunctions?.includes(callee.name) ?? false;
        }

        if (callee.type === 'MemberExpression') {
          if (callee.property.type === 'Identifier') {
            return (
              options.handlerFunctions?.includes(callee.property.name) ?? false
            );
          }
        }
      }

      return false;
    }

    /**
     * Helper: Check if we're inside a handler function
     */
    function isInsideHandlerFunction(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node;

      while (current) {
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression'
        ) {
          // Check if this function is a handler
          const parent = current.parent;

          // Check for function declaration names
          if (
            current.type === 'FunctionDeclaration' &&
            current.id?.type === 'Identifier'
          ) {
            if (options.handlerFunctions?.includes(current.id.name) ?? false) {
              return true;
            }
          }

          // Check for variable declarator (const handler = ...)
          if (
            parent?.type === 'VariableDeclarator' &&
            parent.id.type === 'Identifier'
          ) {
            if (options.handlerFunctions?.includes(parent.id.name) ?? false) {
              return true;
            }
          }

          // Check for method definition
          if (parent?.type === 'MethodDefinition') {
            if (parent.key.type === 'Identifier') {
              if (
                options.handlerFunctions?.includes(parent.key.name) ??
                false
              ) {
                return true;
              }
            }
          }

          // Check for property (method: function() {})
          if (parent?.type === 'Property' && parent.key.type === 'Identifier') {
            if (options.handlerFunctions?.includes(parent.key.name) ?? false) {
              return true;
            }
          }
        }

        current = current.parent;
      }

      return false;
    }

    /**
     * Track Owned/SemanticValue variables (just need to know which are Owned)
     * Set of variable names
     */
    const ownedVariables = new Set<string>();

    return {
      /**
       * Track variable declarations with Owned/SemanticValue type
       */
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== 'Identifier') return;

        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.id);
        const type = checker.getTypeAtLocation(tsNode);

        if (isOwnedOrSemanticType(type)) {
          ownedVariables.add(node.id.name);
        }
      },

      /**
       * Track function parameters with Owned/SemanticValue type
       */
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(
        node:
          | TSESTree.FunctionDeclaration
          | TSESTree.FunctionExpression
          | TSESTree.ArrowFunctionExpression
      ) {
        for (const param of node.params) {
          if (param.type === 'Identifier') {
            const tsNode = parserServices.esTreeNodeToTSNodeMap.get(param);
            const type = checker.getTypeAtLocation(tsNode);

            if (isOwnedOrSemanticType(type)) {
              ownedVariables.add(param.name);
            }
          }
        }
      },

      /**
       * Check .value access on Owned variables
       */
      MemberExpression(node: TSESTree.MemberExpression) {
        // Check for .value access on Owned variables
        if (
          node.object.type === 'Identifier' &&
          node.property.type === 'Identifier' &&
          node.property.name === 'value'
        ) {
          const variableName = node.object.name;

          // Check if this is an Owned variable
          if (!ownedVariables.has(variableName)) return;

          // Check if we're inside a handler function
          if (isInsideHandlerFunction(node)) {
            return;
          }

          // Check if we're inside a confidence check
          if (isInsideConfidenceCheck(node, variableName)) {
            return;
          }

          // Check if passed to a handler function
          if (isPassedToHandler(node.object)) {
            return;
          }

          // Report missing confidence check
          context.report({
            node: node.object,
            messageId: 'missingConfidenceCheck',
            data: {
              variable: variableName,
              threshold: options.threshold?.toString() ?? '0.8',
            },
          });
        }
      },
    };
  },
});
