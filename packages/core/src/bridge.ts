import type {Owned} from './owned.js';
import type {SemanticValue} from './semantic-value.js';

/**
 * Bridge utilities for transferring values across scope boundaries.
 *
 * This module provides standalone functions for bridging Owned values between scopes,
 * complementing the Context.bridge() method available within scope() calls.
 *
 * @module bridge
 */

/**
 * Bridges an Owned value from one scope to include another scope.
 *
 * This is a standalone utility function that creates a new Owned value with a union
 * scope type, making the cross-scope data flow explicit and trackable.
 *
 * Unlike Context.bridge() which is called within a scope, this function can be used
 * anywhere to create bridged values.
 *
 * @template T - The type of the wrapped value
 * @template S1 - The source scope
 * @template S2 - The target scope to bridge to
 * @param owned - The Owned value to bridge
 * @param targetScope - The scope identifier to bridge to
 * @returns A new Owned value with union scope type (S1 | S2)
 *
 * @example
 * ```typescript
 * const adminValue: Owned<Data, 'admin'> = createOwned({
 *   value: { secret: 'data' },
 *   scope: 'admin',
 * });
 *
 * // Bridge to customer scope
 * const bridged = bridge(adminValue, 'customer');
 * // bridged: Owned<Data, 'admin' | 'customer'>
 *
 * // Now both scopes are tracked in the type
 * console.log(bridged.__scope); // 'customer' (runtime value is target scope)
 * ```
 *
 * @example
 * ```typescript
 * // Chain multiple bridges to track full provenance
 * const original: Owned<string, 'input'> = createOwned({
 *   value: 'data',
 *   scope: 'input',
 * });
 *
 * const step1 = bridge(original, 'processing');
 * // step1: Owned<string, 'input' | 'processing'>
 *
 * const step2 = bridge(step1, 'output');
 * // step2: Owned<string, 'input' | 'processing' | 'output'>
 * // Full data flow visible in the type!
 * ```
 */
export function bridge<T, S1 extends string, S2 extends string>(
  owned: Owned<T, S1>,
  targetScope: S2,
): Owned<T, S1 | S2> {
  return {
    value: owned.value,
    confidence: owned.confidence,
    __scope: targetScope as S1 | S2,
    traceId: owned.traceId,
  };
}

/**
 * Bridges a SemanticValue from one scope to include another scope.
 *
 * Preserves all semantic metadata (alternatives and reasoning) while
 * updating the scope to include the target scope.
 *
 * @template T - The type of the wrapped value
 * @template S1 - The source scope
 * @template S2 - The target scope to bridge to
 * @param semantic - The SemanticValue to bridge
 * @param targetScope - The scope identifier to bridge to
 * @returns A new SemanticValue with union scope type (S1 | S2)
 *
 * @example
 * ```typescript
 * const analysis: SemanticValue<Category, 'ai-analysis'> = {
 *   value: 'positive',
 *   confidence: 0.85,
 *   __scope: 'ai-analysis',
 *   traceId: 'trace-123',
 *   alternatives: [
 *     { value: 'neutral', confidence: 0.7 }
 *   ],
 *   reasoning: 'Overall positive sentiment detected'
 * };
 *
 * const bridged = bridgeSemantic(analysis, 'reporting');
 * // bridged: SemanticValue<Category, 'ai-analysis' | 'reporting'>
 *
 * // All semantic metadata is preserved
 * console.log(bridged.alternatives); // Still has alternatives
 * console.log(bridged.reasoning);    // Still has reasoning
 * ```
 */
export function bridgeSemantic<T, S1 extends string, S2 extends string>(
  semantic: SemanticValue<T, S1>,
  targetScope: S2,
): SemanticValue<T, S1 | S2> {
  return {
    value: semantic.value,
    confidence: semantic.confidence,
    __scope: targetScope as S1 | S2,
    traceId: semantic.traceId,
    alternatives: semantic.alternatives,
    reasoning: semantic.reasoning,
  };
}

/**
 * Options for bridging multiple values at once.
 */
export interface BridgeMultipleOptions {
  /**
   * Optional metadata to attach to the bridge operation.
   * Useful for tracking why values were bridged.
   */
  metadata?: Record<string, unknown>;

  /**
   * Whether to validate that all values have the same source scope.
   * @default false
   */
  requireSameScope?: boolean;
}

/**
 * Bridges multiple Owned values from their respective scopes to a target scope.
 *
 * Useful when you need to bridge many values at once, such as when aggregating
 * data from multiple sources into a single scope.
 *
 * @template T - The type of the wrapped values
 * @template S - The source scope(s)
 * @template TS - The target scope
 * @param values - Array of Owned values to bridge
 * @param targetScope - The scope to bridge all values to
 * @param options - Optional bridge configuration
 * @returns Array of bridged values with union scope types
 *
 * @example
 * ```typescript
 * const values: Owned<Data, 'source1' | 'source2'>[] = [
 *   createOwned({ value: data1, scope: 'source1' }),
 *   createOwned({ value: data2, scope: 'source2' }),
 * ];
 *
 * const bridged = bridgeMultiple(values, 'aggregator');
 * // bridged: Owned<Data, 'source1' | 'source2' | 'aggregator'>[]
 * ```
 *
 * @example
 * ```typescript
 * // Validate all values come from same scope
 * const bridged = bridgeMultiple(values, 'target', {
 *   requireSameScope: true,  // Throws if values have different scopes
 *   metadata: { reason: 'data-aggregation' }
 * });
 * ```
 */
export function bridgeMultiple<T, S extends string, TS extends string>(
  values: readonly Owned<T, S>[],
  targetScope: TS,
  options: BridgeMultipleOptions = {},
): Owned<T, S | TS>[] {
  const {requireSameScope = false} = options;

  // Validate all values have same scope if required
  if (requireSameScope && values.length > 0) {
    const firstScope = values[0].__scope;
    const allSame = values.every((v) => v.__scope === firstScope);

    if (!allSame) {
      const scopes = Array.from(new Set(values.map((v) => v.__scope)));
      throw new Error(
        `bridgeMultiple with requireSameScope=true received values from different scopes: ${scopes.join(', ')}`,
      );
    }
  }

  return values.map((value) => bridge(value, targetScope));
}

/**
 * Gets the provenance chain for a bridged value by extracting scope information.
 *
 * This is a type-level utility that helps understand which scopes a value has passed through.
 * At runtime, only the target scope is stored, but the union type preserves the full history.
 *
 * @template T - The type of the wrapped value
 * @template S - The scope type (potentially a union)
 * @param owned - The Owned value to inspect
 * @returns Object with current scope and type-level scope information
 *
 * @example
 * ```typescript
 * const value: Owned<Data, 'scope1' | 'scope2' | 'scope3'> = ...;
 *
 * const provenance = getProvenance(value);
 * console.log(provenance.currentScope); // Runtime scope (e.g., 'scope3')
 * console.log(provenance.traceId);      // Trace ID for tracking
 *
 * // Type-level: S is 'scope1' | 'scope2' | 'scope3'
 * // This shows the value has passed through all three scopes
 * ```
 */
export function getProvenance<T, S extends string>(
  owned: Owned<T, S>,
): {
  currentScope: string;
  traceId: string;
  // The type parameter S preserves the union of all scopes
} {
  return {
    currentScope: owned.__scope,
    traceId: owned.traceId,
  };
}

/**
 * Type guard to check if an Owned value has been bridged.
 *
 * A value is considered bridged if its scope type is a union type.
 * Note: This is primarily a type-level check; at runtime we can only
 * see the current scope.
 *
 * @param owned - The value to check
 * @returns True if the value's type indicates it has been bridged
 *
 * @example
 * ```typescript
 * const original: Owned<Data, 'source'> = createOwned({
 *   value: data,
 *   scope: 'source'
 * });
 *
 * const bridged: Owned<Data, 'source' | 'target'> = bridge(original, 'target');
 *
 * // At type level, we can distinguish:
 * // original has scope 'source'
 * // bridged has scope 'source' | 'target'
 * ```
 */
export function isBridged<T, S extends string>(
  _owned: Owned<T, S>,
): _owned is Owned<T, S> {
  // At runtime, we can't distinguish if it's been bridged
  // This function is primarily for type-level documentation
  // In the future, we could add a __bridged flag for runtime detection
  return true;
}

/**
 * Tracks metadata about bridge operations for debugging and auditing.
 */
export interface BridgeMetadata {
  /**
   * Source scope the value originated from.
   */
  source: string;

  /**
   * Target scope the value was bridged to.
   */
  target: string;

  /**
   * Timestamp when the bridge operation occurred.
   */
  timestamp: number;

  /**
   * Trace ID linking this bridge to the original value.
   */
  traceId: string;

  /**
   * Optional reason for the bridge operation.
   */
  reason?: string;
}

/**
 * Creates a bridge with metadata tracking for auditing purposes.
 *
 * This function bridges a value and returns both the bridged value and
 * metadata about the operation, useful for compliance and debugging.
 *
 * @template T - The type of the wrapped value
 * @template S1 - The source scope
 * @template S2 - The target scope
 * @param owned - The Owned value to bridge
 * @param targetScope - The scope to bridge to
 * @param reason - Optional reason for the bridge
 * @returns Object with bridged value and metadata
 *
 * @example
 * ```typescript
 * const adminData: Owned<SensitiveData, 'admin'> = ...;
 *
 * const { bridged, metadata } = bridgeWithMetadata(
 *   adminData,
 *   'audit-log',
 *   'Required for compliance reporting'
 * );
 *
 * // Log the bridge operation
 * console.log(`Bridged ${metadata.source} → ${metadata.target}`);
 * console.log(`Reason: ${metadata.reason}`);
 * console.log(`Timestamp: ${new Date(metadata.timestamp)}`);
 * ```
 */
export function bridgeWithMetadata<T, S1 extends string, S2 extends string>(
  owned: Owned<T, S1>,
  targetScope: S2,
  reason?: string,
): {
  bridged: Owned<T, S1 | S2>;
  metadata: BridgeMetadata;
} {
  const bridged = bridge(owned, targetScope);

  const metadata: BridgeMetadata = {
    source: owned.__scope,
    target: targetScope,
    timestamp: Date.now(),
    traceId: owned.traceId,
    reason,
  };

  return {bridged, metadata};
}
