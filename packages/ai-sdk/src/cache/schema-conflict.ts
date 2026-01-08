/**
 * Schema conflict detection for fork optimization.
 *
 * This module detects when fork branches use different schemas, which
 * breaks Anthropic cache prefix matching. When using `generateObject`
 * with Anthropic, the schema is converted to a tool definition, and
 * different tool definitions result in different cache prefixes.
 *
 * @module cache/schema-conflict
 */

import type { z } from 'zod';
import type {
  SchemaConflictBehavior,
  SchemaConflictResult,
} from '@mullion/core';

/**
 * Information about a schema used in a fork branch.
 */
export interface SchemaInfo {
  /** Branch index (0-based) */
  readonly branchIndex: number;

  /** Schema signature for comparison */
  readonly signature: string;

  /** Original schema object (for debugging) */
  readonly schema: unknown;

  /** Human-readable description of the schema */
  readonly description?: string;
}

/**
 * Options for schema conflict detection.
 */
export interface DetectSchemaConflictOptions {
  /** Provider name (conflict detection is Anthropic-specific) */
  readonly provider?: string;

  /** Include detailed schema information in result */
  readonly includeDetails?: boolean;
}

/**
 * Extended conflict result with detailed schema information.
 */
export interface DetailedSchemaConflictResult extends SchemaConflictResult {
  /** Detailed information about each schema group */
  readonly schemaGroups: readonly SchemaInfo[][];

  /** Suggestions for resolving the conflict */
  readonly suggestions: readonly string[];
}

/**
 * Computes a signature for a Zod schema.
 *
 * The signature captures the structure of the schema in a way that
 * can be compared for equality. Two schemas with the same signature
 * will produce the same tool definition for Anthropic.
 *
 * @param schema - Zod schema to compute signature for
 * @returns A string signature representing the schema structure
 */
export function computeSchemaSignature(schema: z.ZodTypeAny): string {
  try {
    // Get the schema's JSON representation
    // This captures the structure including field names, types, and constraints
    const description = schema.description ?? '';
    const shape = getSchemaShape(schema);

    return JSON.stringify({ description, shape });
  } catch {
    // If we can't compute a signature, use a random one to be safe
    return `unknown-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Type for Zod v4 internal definition structure.
 * Zod v4 uses different property names than v3.
 */
interface ZodDef {
  /** Zod v4 uses 'type' as a string identifier */
  type?: string;
  /** Zod v4 shape is an object directly, not a function */
  shape?: Record<string, z.ZodTypeAny>;
  /** Array element type */
  element?: z.ZodTypeAny;
  /** Enum entries as object { value: value } */
  entries?: Record<string, unknown>;
  /** Literal values (Zod v4 uses 'values' array) */
  values?: unknown[];
  /** Union options */
  options?: z.ZodTypeAny[];
  /** Inner type for wrappers (optional, nullable, default) - this is a schema object in v4 */
  innerType?: z.ZodTypeAny;
  /** Record value type */
  valueType?: z.ZodTypeAny;
  /** Tuple items */
  items?: z.ZodTypeAny[];
}

/**
 * Extracts the shape information from a Zod schema.
 * Compatible with Zod v4 internal structure.
 *
 * @param schema - Zod schema to extract shape from
 * @returns Object representing the schema shape
 */
function getSchemaShape(schema: z.ZodTypeAny): unknown {
  // Access the internal _def property to get schema definition
  const def = (schema as unknown as { _def?: ZodDef })._def;

  if (!def || typeof def !== 'object') {
    return { type: 'unknown' };
  }

  // Zod v4 uses 'type' as a string identifier (e.g., 'object', 'string', 'array')
  const typeName = def.type;

  switch (typeName) {
    case 'object': {
      if (def.shape && typeof def.shape === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(def.shape)) {
          result[key] = getSchemaShape(value);
        }
        return { type: 'object', properties: result };
      }
      return { type: 'object', properties: {} };
    }

    case 'array': {
      return {
        type: 'array',
        items: def.element ? getSchemaShape(def.element) : { type: 'unknown' },
      };
    }

    case 'string':
      return { type: 'string' };

    case 'number':
      return { type: 'number' };

    case 'boolean':
      return { type: 'boolean' };

    case 'enum': {
      // Zod v4 stores enum entries as { a: 'a', b: 'b' }
      const values = def.entries ? Object.values(def.entries) : [];
      return { type: 'enum', values };
    }

    case 'literal': {
      // Zod v4 stores literal values in 'values' array
      return { type: 'literal', value: def.values?.[0] };
    }

    case 'union': {
      return {
        type: 'union',
        options: def.options?.map((o) => getSchemaShape(o)) ?? [],
      };
    }

    case 'optional': {
      return {
        type: 'optional',
        inner: def.innerType
          ? getSchemaShape(def.innerType)
          : { type: 'unknown' },
      };
    }

    case 'nullable': {
      return {
        type: 'nullable',
        inner: def.innerType
          ? getSchemaShape(def.innerType)
          : { type: 'unknown' },
      };
    }

    case 'default': {
      return {
        type: 'default',
        inner: def.innerType
          ? getSchemaShape(def.innerType)
          : { type: 'unknown' },
      };
    }

    case 'record': {
      return {
        type: 'record',
        value: def.valueType
          ? getSchemaShape(def.valueType)
          : { type: 'unknown' },
      };
    }

    case 'tuple': {
      return {
        type: 'tuple',
        items: def.items?.map((i) => getSchemaShape(i)) ?? [],
      };
    }

    case 'null':
      return { type: 'null' };

    case 'undefined':
      return { type: 'undefined' };

    case 'any':
      return { type: 'any' };

    case 'unknown':
      return { type: 'unknown' };

    case 'never':
      return { type: 'never' };

    case 'void':
      return { type: 'void' };

    default:
      return { type: typeName ?? 'unknown' };
  }
}

/**
 * Groups schemas by their signature.
 *
 * @param schemas - Array of schema info objects
 * @returns Groups of schemas with the same signature
 */
function groupSchemasBySignature(
  schemas: readonly SchemaInfo[]
): Map<string, SchemaInfo[]> {
  const groups = new Map<string, SchemaInfo[]>();

  for (const schema of schemas) {
    const existing = groups.get(schema.signature);
    if (existing) {
      existing.push(schema);
    } else {
      groups.set(schema.signature, [schema]);
    }
  }

  return groups;
}

/**
 * Detects schema conflicts among a set of schemas.
 *
 * When fork branches use different schemas with Anthropic's `generateObject`,
 * each different schema produces a different tool definition. This breaks
 * cache prefix matching, meaning branches with different schemas won't
 * share cache even after warmup.
 *
 * @param schemas - Array of Zod schemas used by fork branches
 * @param options - Detection options
 * @returns Conflict detection result
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 *
 * const RiskSchema = z.object({ risk: z.string() });
 * const OpportunitySchema = z.object({ opportunity: z.string() });
 * const SummarySchema = z.object({ summary: z.string() });
 *
 * const result = detectSchemaConflict([
 *   RiskSchema,
 *   OpportunitySchema,
 *   SummarySchema,
 * ]);
 *
 * if (result.hasConflict) {
 *   console.warn(result.message);
 *   // "3 different schemas detected across 3 branches..."
 * }
 * ```
 */
export function detectSchemaConflict(
  schemas: readonly z.ZodTypeAny[],
  options: DetectSchemaConflictOptions = {}
): DetailedSchemaConflictResult {
  // Only Anthropic has this issue - OpenAI uses automatic caching
  if (options.provider && options.provider !== 'anthropic') {
    return {
      hasConflict: false,
      message: 'Schema conflict detection only applies to Anthropic provider',
      conflictingBranches: [],
      schemaGroups: [],
      suggestions: [],
    };
  }

  // Build schema info for each branch
  const schemaInfos: SchemaInfo[] = schemas.map((schema, index) => ({
    branchIndex: index,
    signature: computeSchemaSignature(schema),
    schema: options.includeDetails ? schema : undefined,
    description: schema.description,
  }));

  // Group schemas by signature
  const groups = groupSchemasBySignature(schemaInfos);

  // If all schemas have the same signature, no conflict
  if (groups.size <= 1) {
    return {
      hasConflict: false,
      message: 'All branches use compatible schemas',
      conflictingBranches: [],
      schemaGroups: [schemaInfos],
      suggestions: [],
    };
  }

  // Build conflict result
  const schemaGroups = Array.from(groups.values());
  const conflictingBranches = schemaGroups.map((group) =>
    group.map((info) => info.branchIndex)
  );

  const branchCount = schemas.length;
  const groupCount = groups.size;

  const message =
    `${groupCount} different schemas detected across ${branchCount} branches. ` +
    `Different schemas in fork branches break Anthropic cache reuse. ` +
    `Branches are grouped by schema: ${conflictingBranches.map((g) => `[${g.join(', ')}]`).join(', ')}`;

  const suggestions = [
    'Consider using a universal schema that covers all branches',
    'Use generateText + post-processing instead of generateObject',
    "Accept that branches with different schemas won't share cache",
    'Split into separate fork calls grouped by schema',
  ];

  return {
    hasConflict: true,
    message,
    conflictingBranches,
    schemaGroups,
    suggestions,
  };
}

/**
 * Handles a schema conflict according to the specified behavior.
 *
 * @param conflict - The detected conflict
 * @param behavior - How to handle the conflict
 * @returns Warning message if behavior is 'warn', undefined otherwise
 * @throws Error if behavior is 'error' and conflict exists
 *
 * @example
 * ```typescript
 * const conflict = detectSchemaConflict(schemas);
 *
 * // Warn but continue
 * const warning = handleSchemaConflict(conflict, 'warn');
 * if (warning) console.warn(warning);
 *
 * // Throw on conflict
 * handleSchemaConflict(conflict, 'error'); // throws if conflict
 *
 * // Silent
 * handleSchemaConflict(conflict, 'allow'); // no-op
 * ```
 */
export function handleSchemaConflict(
  conflict: SchemaConflictResult,
  behavior: SchemaConflictBehavior
): string | undefined {
  if (!conflict.hasConflict) {
    return undefined;
  }

  switch (behavior) {
    case 'error':
      throw new Error(
        `Schema conflict detected: ${conflict.message}\n` +
          'Consider: (1) universal schema, (2) generateText + post-process, (3) accept no cache sharing'
      );

    case 'warn':
      return (
        `Warning: ${conflict.message}\n` +
        'Consider: (1) universal schema, (2) generateText + post-process, (3) accept no cache sharing'
      );

    case 'allow':
    default:
      return undefined;
  }
}

/**
 * Checks if schemas are compatible for cache sharing.
 *
 * This is a convenience function that returns a simple boolean
 * for cases where you just need to know if schemas match.
 *
 * @param schemas - Array of Zod schemas to check
 * @returns True if all schemas are compatible (same signature)
 *
 * @example
 * ```typescript
 * const SummarySchema = z.object({ summary: z.string() });
 *
 * // Same schema used multiple times - compatible
 * const compatible = areSchemasCompatible([
 *   SummarySchema,
 *   SummarySchema,
 *   SummarySchema,
 * ]);
 * // true
 *
 * // Different schemas - not compatible
 * const RiskSchema = z.object({ risk: z.string() });
 * const incompatible = areSchemasCompatible([
 *   SummarySchema,
 *   RiskSchema,
 * ]);
 * // false
 * ```
 */
export function areSchemasCompatible(
  schemas: readonly z.ZodTypeAny[]
): boolean {
  if (schemas.length <= 1) {
    return true;
  }

  const firstSignature = computeSchemaSignature(schemas[0]);
  return schemas.every(
    (schema) => computeSchemaSignature(schema) === firstSignature
  );
}

/**
 * Gets a human-readable description of schema differences.
 *
 * Useful for debugging and understanding why schemas don't match.
 *
 * @param schemas - Array of Zod schemas to compare
 * @returns Description of differences between schemas
 *
 * @example
 * ```typescript
 * const diff = describeSchemasDifference([RiskSchema, OpportunitySchema]);
 * console.log(diff);
 * // "Schema 0 has properties: risk. Schema 1 has properties: opportunity."
 * ```
 */
export function describeSchemasDifference(
  schemas: readonly z.ZodTypeAny[]
): string {
  if (schemas.length === 0) {
    return 'No schemas provided';
  }

  if (schemas.length === 1) {
    return 'Only one schema provided';
  }

  const result = detectSchemaConflict(schemas, { includeDetails: true });

  if (!result.hasConflict) {
    return 'All schemas are identical';
  }

  const descriptions = result.schemaGroups.map((group, groupIndex) => {
    const branchIndices = group.map((info) => info.branchIndex).join(', ');
    const desc = group[0].description ?? `Group ${groupIndex + 1}`;
    return `Branches [${branchIndices}]: ${desc}`;
  });

  return descriptions.join('\n');
}
