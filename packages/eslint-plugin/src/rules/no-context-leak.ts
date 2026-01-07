/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

/**
 * ESLint rule: no-context-leak
 *
 * Detects when an Owned value crosses scope boundary without explicit bridge.
 *
 * This rule prevents accidental context leaks by ensuring that Owned values
 * from one scope cannot be used in another scope without explicitly bridging
 * them using Context.bridge() or the standalone bridge() function.
 *
 * @example
 * ```typescript
 * // ❌ Error: Context leak - 'adminNotes' from scope 'admin' used in scope 'customer'
 * async function handleCustomer(ctx: Context<'customer'>) {
 *   const adminNotes = await adminCtx.infer(Notes, doc);
 *   return ctx.respond(adminNotes.value); // LEAK!
 * }
 *
 * // ✅ OK: Explicit bridge
 * async function handleCustomer(ctx: Context<'customer'>) {
 *   const adminNotes = await adminCtx.infer(Notes, doc);
 *   const bridged = ctx.bridge(adminNotes);
 *   return ctx.respond(bridged.value);
 * }
 * ```
 */

type MessageIds = 'contextLeak';

type Options = [
  {
    /**
     * Pairs of scopes that are always allowed to access each other.
     * @example [["internal", "public"]]
     */
    allowedPairs?: [string, string][];
  },
];

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/scopestack/scopestack-ts/blob/main/packages/eslint-plugin/docs/rules/${name}.md`
);

export default createRule<Options, MessageIds>({
  name: 'no-context-leak',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow using Owned values across scope boundaries without explicit bridge',
    },
    messages: {
      contextLeak:
        "Context leak detected: '{{variable}}' from scope '{{sourceScope}}' used in scope '{{targetScope}}' without bridge(). Use ctx.bridge() or bridge() to explicitly transfer values across scopes.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedPairs: {
            type: 'array',
            items: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              maxItems: 2,
            },
            description:
              'Pairs of scopes that are always allowed to access each other',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  defaultOptions: [
    {
      allowedPairs: [],
    },
  ],

  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();
    const options = context.options[0] || { allowedPairs: [] };

    /**
     * Helper: Check if a TypeScript type is Owned<T, S>
     */
    function isOwnedType(type: ts.Type): boolean {
      const symbol = type.getSymbol();
      if (!symbol) return false;

      const typeName = checker.typeToString(type);
      return typeName.startsWith('Owned<');
    }

    /**
     * Helper: Extract scope parameter from Owned<T, S> type
     * Returns the literal type of S, or null if not extractable
     */
    function extractScopeFromOwnedType(type: ts.Type): string | null {
      // Get type arguments from Owned<T, S>
      if (!type.aliasTypeArguments || type.aliasTypeArguments.length < 2) {
        // Try getting from type reference
        const typeRef = type as ts.TypeReference;
        if (!typeRef.typeArguments || typeRef.typeArguments.length < 2) {
          return null;
        }

        const scopeTypeArg = typeRef.typeArguments[1];
        if (scopeTypeArg.isStringLiteral()) {
          return scopeTypeArg.value;
        }

        // Handle union types (for bridged values like 'scope1' | 'scope2')
        if (scopeTypeArg.isUnion()) {
          // For now, we'll accept union types (bridged values)
          // In the future, we could track the union to detect partial bridges
          return null;
        }

        return null;
      }

      const scopeTypeArg = type.aliasTypeArguments[1];
      if (scopeTypeArg.isStringLiteral()) {
        return scopeTypeArg.value;
      }

      return null;
    }

    /**
     * Helper: Check if two scopes are allowed to access each other
     */
    function isScopePairAllowed(scope1: string, scope2: string): boolean {
      if (!options.allowedPairs) return false;

      return options.allowedPairs.some(
        ([a, b]) =>
          (a === scope1 && b === scope2) || (a === scope2 && b === scope1)
      );
    }

    /**
     * Helper: Get the Context<S> scope from a parameter type
     */
    function getContextScopeFromParameter(
      param: TSESTree.Parameter
    ): string | null {
      const tsNode = parserServices.esTreeNodeToTSNodeMap.get(param);
      const type = checker.getTypeAtLocation(tsNode);

      const typeName = checker.typeToString(type);
      const contextRegex = /Context<["'](.+?)["']>/;
      const contextMatch = contextRegex.exec(typeName);
      if (contextMatch) {
        return contextMatch[1];
      }

      return null;
    }

    /**
     * Track Owned variables and their scopes
     * Map<variable identifier, scope string>
     */
    const ownedVariables = new Map<string, string>();

    /**
     * Track current scope context (from Context<S> parameters)
     * Stack because scopes can be nested
     */
    const scopeStack: string[] = [];

    return {
      /**
       * Track variable declarations with Owned type
       */
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== 'Identifier') return;

        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.id);
        const type = checker.getTypeAtLocation(tsNode);

        if (isOwnedType(type)) {
          const scope = extractScopeFromOwnedType(type);
          if (scope) {
            ownedVariables.set(node.id.name, scope);
          }
        }
      },

      /**
       * Track function parameters with Context<S> type to know current scope
       */
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(
        node:
          | TSESTree.FunctionDeclaration
          | TSESTree.FunctionExpression
          | TSESTree.ArrowFunctionExpression
      ) {
        // Check parameters for Context<S>
        for (const param of node.params) {
          if (param.type === 'Identifier') {
            const contextScope = getContextScopeFromParameter(param);
            if (contextScope) {
              scopeStack.push(contextScope);
            }
          }
        }
      },

      /**
       * Pop scope when exiting function
       */
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression:exit'() {
        if (scopeStack.length > 0) {
          scopeStack.pop();
        }
      },

      /**
       * Detect when an Owned variable is used
       */
      Identifier(node: TSESTree.Identifier) {
        // Skip if this identifier is being declared
        if (
          node.parent?.type === 'VariableDeclarator' &&
          node.parent.id === node
        ) {
          return;
        }

        // Skip if this is a type reference
        const parent = node.parent;
        if (
          parent?.type === 'TSTypeReference' ||
          parent?.type === 'TSTypeQuery'
        ) {
          return;
        }

        // Check if this identifier references an Owned variable
        const variableScope = ownedVariables.get(node.name);
        if (!variableScope) return;

        // Check if we're in a different scope context
        const currentScope = scopeStack[scopeStack.length - 1];
        if (!currentScope) return; // Not in a scoped context

        // If variable scope matches current scope, it's OK
        if (variableScope === currentScope) return;

        // Check if this scope pair is allowed
        if (isScopePairAllowed(variableScope, currentScope)) return;

        // Check if this identifier is being passed to bridge()
        if (parent?.type === 'CallExpression') {
          const callee = parent.callee;
          if (
            (callee.type === 'MemberExpression' &&
              callee.property.type === 'Identifier' &&
              callee.property.name === 'bridge') ||
            (callee.type === 'Identifier' && callee.name === 'bridge') ||
            (callee.type === 'Identifier' && callee.name === 'bridgeSemantic')
          ) {
            // This variable is being bridged, so it's OK
            return;
          }
        }

        // Report context leak
        context.report({
          node,
          messageId: 'contextLeak',
          data: {
            variable: node.name,
            sourceScope: variableScope,
            targetScope: currentScope,
          },
        });
      },
    };
  },
});
