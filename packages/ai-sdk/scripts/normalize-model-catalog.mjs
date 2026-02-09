#!/usr/bin/env node

import {readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateSchema = z
  .string()
  .regex(DATE_PATTERN, 'Expected date in YYYY-MM-DD format');

const generatedAtSchema = z
  .string()
  .refine(
    (value) => DATE_PATTERN.test(value) || !Number.isNaN(Date.parse(value)),
    'Expected ISO date or datetime string',
  );

const providerSchema = z.enum(['anthropic', 'openai', 'google']);
const ttlSchema = z.enum(['5m', '1h']);

const pricingEntrySchema = z
  .object({
    provider: providerSchema.optional(),
    inputPer1M: z.number().nonnegative().optional(),
    outputPer1M: z.number().nonnegative().optional(),
    cachedInputPer1M: z.number().nonnegative().optional(),
    cacheWritePer1M: z.number().nonnegative().optional(),
    asOfDate: dateSchema.optional(),
  })
  .strict()
  .refine((entry) => Object.keys(entry).length > 0, {
    message: 'Pricing entry must include at least one field',
  });

const capabilityEntrySchema = z
  .object({
    supported: z.boolean().optional(),
    minTokens: z.number().int().nonnegative().optional(),
    maxBreakpoints: z.number().int().nonnegative().optional(),
    supportsTtl: z.boolean().optional(),
    supportedTtl: z.array(ttlSchema).optional(),
    supportsToolCaching: z.boolean().optional(),
    isAutomatic: z.boolean().optional(),
  })
  .strict()
  .refine((entry) => Object.keys(entry).length > 0, {
    message: 'Capability entry must include at least one field',
  });

const providerPricingSchema = z
  .object({
    default: pricingEntrySchema.optional(),
    models: z.record(z.string().min(1), pricingEntrySchema).optional(),
  })
  .strict();

const providerCapabilitySchema = z
  .object({
    default: capabilityEntrySchema.optional(),
    models: z.record(z.string().min(1), capabilityEntrySchema).optional(),
  })
  .strict();

const modelCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    snapshotDate: dateSchema,
    generatedAt: generatedAtSchema,
    sources: z.array(z.string().min(1)).min(1),
    pricing: z
      .object({
        default: pricingEntrySchema.optional(),
        providers: z
          .object({
            anthropic: providerPricingSchema.optional(),
            openai: providerPricingSchema.optional(),
            google: providerPricingSchema.optional(),
          })
          .strict()
          .optional(),
        models: z.record(z.string().min(1), pricingEntrySchema).optional(),
      })
      .strict()
      .optional(),
    capabilities: z
      .object({
        default: capabilityEntrySchema.optional(),
        providers: z
          .object({
            anthropic: providerCapabilitySchema.optional(),
            openai: providerCapabilitySchema.optional(),
            google: providerCapabilitySchema.optional(),
          })
          .strict()
          .optional(),
        models: z.record(z.string().min(1), capabilityEntrySchema).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, '..');
const sourcePath = resolve(packageDir, 'catalog/model-catalog.source.json');
const outputPath = resolve(packageDir, 'catalog/model-catalog.baseline.json');
const checkMode = process.argv.includes('--check');

async function main() {
  const sourcePayload = await readJsonFile(sourcePath);
  const parsed = modelCatalogSchema.safeParse(sourcePayload);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.join('.') || '<root>';
      return `${path}: ${issue.message}`;
    });

    console.error('Model catalog source is invalid:');
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exit(1);
  }

  const normalizedCatalog = sortKeysDeep(parsed.data);
  const normalizedJson = `${JSON.stringify(normalizedCatalog, null, 2)}\n`;

  if (checkMode) {
    const currentOutput = await tryReadFile(outputPath);
    if (currentOutput === null) {
      console.error(
        `Model catalog baseline is missing at ${outputPath}. Run: pnpm --filter @mullion/ai-sdk catalog:normalize`,
      );
      process.exit(1);
    }

    const currentParsed = parseJsonString(currentOutput, outputPath);
    const currentNormalizedJson = `${JSON.stringify(sortKeysDeep(currentParsed), null, 2)}\n`;

    if (currentNormalizedJson !== normalizedJson) {
      console.error(
        'Model catalog baseline is out of date. Run: pnpm --filter @mullion/ai-sdk catalog:normalize',
      );
      process.exit(1);
    }

    console.log('Model catalog baseline is up to date.');
    return;
  }

  await writeFile(outputPath, normalizedJson, 'utf8');
  console.log(`Wrote normalized model catalog baseline to ${outputPath}`);
}

async function readJsonFile(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return parseJsonString(raw, filePath);
}

async function tryReadFile(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function parseJsonString(raw, filePath) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse JSON at ${filePath}`, {cause: error});
  }
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysDeep(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => compareKeysStable(leftKey, rightKey))
        .map(([key, nestedValue]) => [key, sortKeysDeep(nestedValue)]),
    );
  }

  return value;
}

function compareKeysStable(leftKey, rightKey) {
  if (leftKey === rightKey) {
    return 0;
  }

  return leftKey < rightKey ? -1 : 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
