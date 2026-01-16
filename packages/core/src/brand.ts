/**
 * Brand utility type for nominal typing in TypeScript.
 *
 * Creates a branded type by adding a unique symbol property that only exists at compile-time.
 * This enables type-safe distinctions between primitives that would otherwise be structurally identical.
 *
 * @template T - The base type to brand (e.g., string, number)
 * @template B - The brand identifier (e.g., 'UserId', 'Email')
 *
 * @example
 * ```typescript
 * type UserId = Brand<string, 'UserId'>;
 * type Email = Brand<string, 'Email'>;
 *
 * const userId: UserId = 'user-123' as UserId;
 * const email: Email = 'user@example.com' as Email;
 *
 * // Type error: cannot assign Email to UserId
 * const id: UserId = email; // ❌ Type 'Email' is not assignable to type 'UserId'
 * ```
 *
 * @see {@link https://basarat.gitbook.io/typescript/main-1/nominaltyping | Nominal Typing in TypeScript}
 */
export type Brand<T, B extends string> = T & {readonly __brand: B};

/**
 * ScopeId is a branded string type representing a unique scope identifier.
 *
 * Used throughout Mullion to track ownership and provenance of LLM-generated values.
 * Each scope has a unique identifier that prevents accidental mixing of data from different contexts.
 *
 * @example
 * ```typescript
 * const adminScope: ScopeId = 'admin-context' as ScopeId;
 * const customerScope: ScopeId = 'customer-context' as ScopeId;
 *
 * // Type error: cannot mix scope identifiers
 * const mixed: ScopeId = adminScope === customerScope ? adminScope : customerScope;
 * ```
 *
 * @example
 * ```typescript
 * // Creating scope identifiers
 * function createScopeId(name: string): ScopeId {
 *   return `scope:${name}:${Date.now()}` as ScopeId;
 * }
 *
 * const userScope = createScopeId('user-session');
 * const apiScope = createScopeId('api-integration');
 * ```
 */
export type ScopeId = Brand<string, 'ScopeId'>;
