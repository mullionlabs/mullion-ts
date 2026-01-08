import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import {
  computeSchemaSignature,
  detectSchemaConflict,
  handleSchemaConflict,
  areSchemasCompatible,
  describeSchemasDifference,
} from './schema-conflict.js';

describe('schema-conflict', () => {
  describe('computeSchemaSignature', () => {
    it('should return same signature for identical schemas', () => {
      const schema1 = z.object({ name: z.string() });
      const schema2 = z.object({ name: z.string() });

      const sig1 = computeSchemaSignature(schema1);
      const sig2 = computeSchemaSignature(schema2);

      expect(sig1).toBe(sig2);
    });

    it('should return different signatures for different schemas', () => {
      const schema1 = z.object({ name: z.string() });
      const schema2 = z.object({ age: z.number() });

      const sig1 = computeSchemaSignature(schema1);
      const sig2 = computeSchemaSignature(schema2);

      expect(sig1).not.toBe(sig2);
    });

    it('should handle nested objects', () => {
      const schema1 = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      });

      const schema2 = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      });

      const sig1 = computeSchemaSignature(schema1);
      const sig2 = computeSchemaSignature(schema2);

      expect(sig1).toBe(sig2);
    });

    it('should handle arrays', () => {
      const schema1 = z.array(z.string());
      const schema2 = z.array(z.string());
      const schema3 = z.array(z.number());

      expect(computeSchemaSignature(schema1)).toBe(
        computeSchemaSignature(schema2)
      );
      expect(computeSchemaSignature(schema1)).not.toBe(
        computeSchemaSignature(schema3)
      );
    });

    it('should handle enums', () => {
      const schema1 = z.enum(['a', 'b', 'c']);
      const schema2 = z.enum(['a', 'b', 'c']);
      const schema3 = z.enum(['x', 'y', 'z']);

      expect(computeSchemaSignature(schema1)).toBe(
        computeSchemaSignature(schema2)
      );
      expect(computeSchemaSignature(schema1)).not.toBe(
        computeSchemaSignature(schema3)
      );
    });

    it('should handle optional fields', () => {
      const schema1 = z.object({ name: z.string().optional() });
      const schema2 = z.object({ name: z.string().optional() });
      const schema3 = z.object({ name: z.string() });

      expect(computeSchemaSignature(schema1)).toBe(
        computeSchemaSignature(schema2)
      );
      expect(computeSchemaSignature(schema1)).not.toBe(
        computeSchemaSignature(schema3)
      );
    });

    it('should handle unions', () => {
      const schema1 = z.union([z.string(), z.number()]);
      const schema2 = z.union([z.string(), z.number()]);

      expect(computeSchemaSignature(schema1)).toBe(
        computeSchemaSignature(schema2)
      );
    });

    it('should handle literals', () => {
      const schema1 = z.literal('hello');
      const schema2 = z.literal('hello');
      const schema3 = z.literal('world');

      expect(computeSchemaSignature(schema1)).toBe(
        computeSchemaSignature(schema2)
      );
      expect(computeSchemaSignature(schema1)).not.toBe(
        computeSchemaSignature(schema3)
      );
    });

    it('should handle nullable', () => {
      const schema1 = z.string().nullable();
      const schema2 = z.string().nullable();

      expect(computeSchemaSignature(schema1)).toBe(
        computeSchemaSignature(schema2)
      );
    });

    it('should include description in signature', () => {
      const schema1 = z.object({ name: z.string() }).describe('User schema');
      const schema2 = z.object({ name: z.string() }).describe('User schema');
      const schema3 = z.object({ name: z.string() }).describe('Other schema');

      expect(computeSchemaSignature(schema1)).toBe(
        computeSchemaSignature(schema2)
      );
      expect(computeSchemaSignature(schema1)).not.toBe(
        computeSchemaSignature(schema3)
      );
    });
  });

  describe('detectSchemaConflict', () => {
    it('should detect no conflict for identical schemas', () => {
      const schema = z.object({ name: z.string() });

      const result = detectSchemaConflict([schema, schema, schema]);

      expect(result.hasConflict).toBe(false);
      expect(result.conflictingBranches).toEqual([]);
      expect(result.message).toContain('compatible');
    });

    it('should detect conflict for different schemas', () => {
      const RiskSchema = z.object({ risk: z.string() });
      const OpportunitySchema = z.object({ opportunity: z.string() });
      const SummarySchema = z.object({ summary: z.string() });

      const result = detectSchemaConflict([
        RiskSchema,
        OpportunitySchema,
        SummarySchema,
      ]);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBranches).toHaveLength(3);
      expect(result.message).toContain('3 different schemas');
      expect(result.message).toContain('Anthropic cache reuse');
    });

    it('should group branches by schema', () => {
      const SchemaA = z.object({ a: z.string() });
      const SchemaB = z.object({ b: z.string() });

      // Branches 0 and 2 use SchemaA, branches 1 and 3 use SchemaB
      const result = detectSchemaConflict([SchemaA, SchemaB, SchemaA, SchemaB]);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBranches).toHaveLength(2);

      // Check that branches are properly grouped
      const group0 = result.conflictingBranches.find((g) => g.includes(0));
      const group1 = result.conflictingBranches.find((g) => g.includes(1));

      expect(group0).toContain(2);
      expect(group1).toContain(3);
    });

    it('should handle empty array', () => {
      const result = detectSchemaConflict([]);

      expect(result.hasConflict).toBe(false);
    });

    it('should handle single schema', () => {
      const schema = z.object({ name: z.string() });

      const result = detectSchemaConflict([schema]);

      expect(result.hasConflict).toBe(false);
    });

    it('should skip conflict detection for non-Anthropic providers', () => {
      const SchemaA = z.object({ a: z.string() });
      const SchemaB = z.object({ b: z.string() });

      const result = detectSchemaConflict([SchemaA, SchemaB], {
        provider: 'openai',
      });

      expect(result.hasConflict).toBe(false);
      expect(result.message).toContain('only applies to Anthropic');
    });

    it('should include suggestions in conflict result', () => {
      const SchemaA = z.object({ a: z.string() });
      const SchemaB = z.object({ b: z.string() });

      const result = detectSchemaConflict([SchemaA, SchemaB]);

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(
        result.suggestions.some((s) => s.includes('universal schema'))
      ).toBe(true);
    });

    it('should include schema groups in result', () => {
      const SchemaA = z.object({ a: z.string() });
      const SchemaB = z.object({ b: z.string() });

      const result = detectSchemaConflict([SchemaA, SchemaB], {
        includeDetails: true,
      });

      expect(result.schemaGroups).toHaveLength(2);
      expect(result.schemaGroups[0]).toHaveLength(1);
      expect(result.schemaGroups[1]).toHaveLength(1);
    });
  });

  describe('handleSchemaConflict', () => {
    it('should return undefined for no conflict', () => {
      const conflict = {
        hasConflict: false,
        message: 'No conflict',
        conflictingBranches: [],
      };

      expect(handleSchemaConflict(conflict, 'warn')).toBeUndefined();
      expect(handleSchemaConflict(conflict, 'error')).toBeUndefined();
      expect(handleSchemaConflict(conflict, 'allow')).toBeUndefined();
    });

    it('should return warning message for warn behavior', () => {
      const conflict = {
        hasConflict: true,
        message: 'Conflict detected',
        conflictingBranches: [[0], [1]],
      };

      const result = handleSchemaConflict(conflict, 'warn');

      expect(result).toBeDefined();
      expect(result).toContain('Warning');
      expect(result).toContain('Conflict detected');
      expect(result).toContain('Consider');
    });

    it('should throw error for error behavior', () => {
      const conflict = {
        hasConflict: true,
        message: 'Conflict detected',
        conflictingBranches: [[0], [1]],
      };

      expect(() => handleSchemaConflict(conflict, 'error')).toThrow(
        /Schema conflict detected/
      );
    });

    it('should return undefined for allow behavior', () => {
      const conflict = {
        hasConflict: true,
        message: 'Conflict detected',
        conflictingBranches: [[0], [1]],
      };

      expect(handleSchemaConflict(conflict, 'allow')).toBeUndefined();
    });
  });

  describe('areSchemasCompatible', () => {
    it('should return true for empty array', () => {
      expect(areSchemasCompatible([])).toBe(true);
    });

    it('should return true for single schema', () => {
      const schema = z.object({ name: z.string() });
      expect(areSchemasCompatible([schema])).toBe(true);
    });

    it('should return true for identical schemas', () => {
      const schema = z.object({ name: z.string() });
      expect(areSchemasCompatible([schema, schema, schema])).toBe(true);
    });

    it('should return false for different schemas', () => {
      const SchemaA = z.object({ a: z.string() });
      const SchemaB = z.object({ b: z.string() });

      expect(areSchemasCompatible([SchemaA, SchemaB])).toBe(false);
    });

    it('should return true for structurally identical schemas', () => {
      const schema1 = z.object({ name: z.string(), age: z.number() });
      const schema2 = z.object({ name: z.string(), age: z.number() });

      expect(areSchemasCompatible([schema1, schema2])).toBe(true);
    });
  });

  describe('describeSchemasDifference', () => {
    it('should return message for empty array', () => {
      const result = describeSchemasDifference([]);
      expect(result).toBe('No schemas provided');
    });

    it('should return message for single schema', () => {
      const schema = z.object({ name: z.string() });
      const result = describeSchemasDifference([schema]);
      expect(result).toBe('Only one schema provided');
    });

    it('should return message for identical schemas', () => {
      const schema = z.object({ name: z.string() });
      const result = describeSchemasDifference([schema, schema]);
      expect(result).toBe('All schemas are identical');
    });

    it('should describe different schemas', () => {
      const SchemaA = z.object({ a: z.string() }).describe('Schema A');
      const SchemaB = z.object({ b: z.string() }).describe('Schema B');

      const result = describeSchemasDifference([SchemaA, SchemaB]);

      expect(result).toContain('Schema A');
      expect(result).toContain('Schema B');
      expect(result).toContain('Branches');
    });

    it('should show branch groupings', () => {
      const SchemaA = z.object({ a: z.string() });
      const SchemaB = z.object({ b: z.string() });

      const result = describeSchemasDifference([SchemaA, SchemaB, SchemaA]);

      expect(result).toContain('[0, 2]');
      expect(result).toContain('[1]');
    });
  });

  describe('complex schema scenarios', () => {
    it('should handle real-world schemas', () => {
      const RiskAnalysisSchema = z.object({
        risks: z.array(
          z.object({
            category: z.enum(['financial', 'operational', 'legal']),
            severity: z.enum(['low', 'medium', 'high', 'critical']),
            description: z.string(),
            mitigation: z.string().optional(),
          })
        ),
        overallRiskLevel: z.enum(['low', 'medium', 'high', 'critical']),
        summary: z.string(),
      });

      const OpportunitySchema = z.object({
        opportunities: z.array(
          z.object({
            category: z.string(),
            potential: z.enum(['low', 'medium', 'high']),
            description: z.string(),
            timeline: z.string().optional(),
          })
        ),
        topOpportunity: z.string(),
        summary: z.string(),
      });

      const result = detectSchemaConflict([
        RiskAnalysisSchema,
        OpportunitySchema,
      ]);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBranches).toHaveLength(2);
    });

    it('should detect same schema used for different prompts', () => {
      // Same schema used 3 times - should be compatible
      const AnalysisSchema = z.object({
        points: z.array(z.string()),
        conclusion: z.string(),
        confidence: z.number().min(0).max(1),
      });

      const result = detectSchemaConflict([
        AnalysisSchema,
        AnalysisSchema,
        AnalysisSchema,
      ]);

      expect(result.hasConflict).toBe(false);
    });

    it('should handle deeply nested schemas', () => {
      const DeepSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              data: z.string(),
            }),
          }),
        }),
      });

      const result = detectSchemaConflict([DeepSchema, DeepSchema]);

      expect(result.hasConflict).toBe(false);
    });
  });
});
