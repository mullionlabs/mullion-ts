import {z} from 'zod';

export type CatalogProvider = 'anthropic' | 'openai' | 'google';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_MODEL_CATALOG_TTL_MS = 5 * 60 * 1000;

const catalogDateSchema = z
  .string()
  .regex(DATE_PATTERN, 'Expected date in YYYY-MM-DD format');

const generatedAtSchema = z
  .string()
  .refine(
    (value) => DATE_PATTERN.test(value) || !Number.isNaN(Date.parse(value)),
    'Expected ISO date or datetime string',
  );

const catalogProviderSchema = z.enum(['anthropic', 'openai', 'google']);
const catalogTtlSchema = z.enum(['5m', '1h']);

const catalogPricingEntrySchema = z
  .object({
    provider: catalogProviderSchema.optional(),
    inputPer1M: z.number().nonnegative().optional(),
    outputPer1M: z.number().nonnegative().optional(),
    cachedInputPer1M: z.number().nonnegative().optional(),
    cacheWritePer1M: z.number().nonnegative().optional(),
    asOfDate: catalogDateSchema.optional(),
  })
  .strict()
  .refine((entry) => Object.keys(entry).length > 0, {
    message: 'Catalog pricing entry must include at least one field',
  });

const catalogCapabilityEntrySchema = z
  .object({
    supported: z.boolean().optional(),
    minTokens: z.number().int().nonnegative().optional(),
    maxBreakpoints: z
      .union([
        z.literal(Number.POSITIVE_INFINITY),
        z.number().int().nonnegative(),
      ])
      .optional(),
    supportsTtl: z.boolean().optional(),
    supportedTtl: z.array(catalogTtlSchema).optional(),
    supportsToolCaching: z.boolean().optional(),
    isAutomatic: z.boolean().optional(),
  })
  .strict()
  .refine((entry) => Object.keys(entry).length > 0, {
    message: 'Catalog capability entry must include at least one field',
  });

const catalogPricingProviderSchema = z
  .object({
    default: catalogPricingEntrySchema.optional(),
    models: z.record(z.string().min(1), catalogPricingEntrySchema).optional(),
  })
  .strict();

const catalogCapabilityProviderSchema = z
  .object({
    default: catalogCapabilityEntrySchema.optional(),
    models: z
      .record(z.string().min(1), catalogCapabilityEntrySchema)
      .optional(),
  })
  .strict();

const modelCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    snapshotDate: catalogDateSchema,
    generatedAt: generatedAtSchema,
    sources: z.array(z.string().min(1)).min(1),
    pricing: z
      .object({
        default: catalogPricingEntrySchema.optional(),
        providers: z
          .object({
            anthropic: catalogPricingProviderSchema.optional(),
            openai: catalogPricingProviderSchema.optional(),
            google: catalogPricingProviderSchema.optional(),
          })
          .strict()
          .optional(),
        models: z
          .record(z.string().min(1), catalogPricingEntrySchema)
          .optional(),
      })
      .strict()
      .optional(),
    capabilities: z
      .object({
        default: catalogCapabilityEntrySchema.optional(),
        providers: z
          .object({
            anthropic: catalogCapabilityProviderSchema.optional(),
            openai: catalogCapabilityProviderSchema.optional(),
            google: catalogCapabilityProviderSchema.optional(),
          })
          .strict()
          .optional(),
        models: z
          .record(z.string().min(1), catalogCapabilityEntrySchema)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type CatalogPricingEntry = z.infer<typeof catalogPricingEntrySchema>;
export type CatalogCapabilityEntry = z.infer<
  typeof catalogCapabilityEntrySchema
>;
export type CatalogPricingProvider = z.infer<
  typeof catalogPricingProviderSchema
>;
export type CatalogCapabilityProvider = z.infer<
  typeof catalogCapabilityProviderSchema
>;
export type ModelCatalog = z.infer<typeof modelCatalogSchema>;

export interface LoadModelCatalogOptions {
  url?: string;
  filePath?: string;
  json?: string | ModelCatalog;
  ttlMs?: number;
  forceRefresh?: boolean;
  fetchFn?: typeof fetch;
  throwOnError?: boolean;
}

export interface LoadModelCatalogResult {
  catalog: ModelCatalog | null;
  source: 'url' | 'file' | 'json';
  fromCache: boolean;
  usedFallback: boolean;
  error?: ModelCatalogError;
}

interface CatalogCacheEntry {
  sourceKey: string;
  expiresAt: number;
  catalog: ModelCatalog;
}

const modelCatalogState: {
  overrides: ModelCatalog | null;
  cache: CatalogCacheEntry | null;
} = {
  overrides: null,
  cache: null,
};

export class ModelCatalogError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ModelCatalogError';
  }
}

export class ModelCatalogValidationError extends ModelCatalogError {
  readonly issues: string[];

  constructor(issues: string[], options?: ErrorOptions) {
    super(
      issues.length === 0
        ? 'Model catalog validation failed'
        : `Model catalog validation failed: ${issues.join('; ')}`,
      options,
    );
    this.name = 'ModelCatalogValidationError';
    this.issues = issues;
  }
}

export class ModelCatalogLoadError extends ModelCatalogError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ModelCatalogLoadError';
  }
}

type CatalogSource =
  | {
      kind: 'url';
      key: string;
      value: string;
    }
  | {
      kind: 'file';
      key: string;
      value: string;
    }
  | {
      kind: 'json';
      key: string;
      value: string;
    };

export function setModelCatalogOverrides(catalog: ModelCatalog): ModelCatalog {
  const parsed = parseModelCatalog(catalog);
  const frozen = deepFreeze(cloneCatalog(parsed));

  modelCatalogState.overrides = frozen;
  return frozen;
}

export function clearModelCatalogOverrides(): void {
  modelCatalogState.overrides = null;
  modelCatalogState.cache = null;
}

export function getModelCatalogOverrides(): Readonly<ModelCatalog> | null {
  return modelCatalogState.overrides;
}

export async function loadModelCatalog(
  options: LoadModelCatalogOptions,
): Promise<LoadModelCatalogResult> {
  const source = resolveCatalogSource(options);
  const ttlMs = Math.max(0, options.ttlMs ?? DEFAULT_MODEL_CATALOG_TTL_MS);

  if (!options.forceRefresh && modelCatalogState.cache) {
    const {cache} = modelCatalogState;
    if (cache.sourceKey === source.key && cache.expiresAt > Date.now()) {
      modelCatalogState.overrides = cache.catalog;
      return {
        catalog: cache.catalog,
        source: source.kind,
        fromCache: true,
        usedFallback: false,
      };
    }
  }

  try {
    const parsed = await loadCatalogFromSource(source, options.fetchFn);
    const frozen = deepFreeze(cloneCatalog(parsed));

    modelCatalogState.overrides = frozen;
    modelCatalogState.cache =
      ttlMs > 0
        ? {
            sourceKey: source.key,
            expiresAt: Date.now() + ttlMs,
            catalog: frozen,
          }
        : null;

    return {
      catalog: frozen,
      source: source.kind,
      fromCache: false,
      usedFallback: false,
    };
  } catch (error) {
    const catalogError = toModelCatalogError(error);

    if (options.throwOnError) {
      throw catalogError;
    }

    return {
      catalog: modelCatalogState.overrides,
      source: source.kind,
      fromCache: false,
      usedFallback: true,
      error: catalogError,
    };
  }
}

export function getCatalogPricingOverride(
  provider: CatalogProvider | 'unknown',
  model: string,
): CatalogPricingEntry | null {
  const pricingSection = modelCatalogState.overrides?.pricing;
  if (!pricingSection) {
    return null;
  }

  const merged = mergeEntries<CatalogPricingEntry>([
    pricingSection.default,
    provider === 'unknown'
      ? undefined
      : pricingSection.providers?.[provider]?.default,
    findCatalogModelEntry(pricingSection.models, model),
    provider === 'unknown'
      ? undefined
      : findCatalogModelEntry(
          pricingSection.providers?.[provider]?.models,
          model,
        ),
  ]);

  return merged;
}

export function getCatalogCapabilityOverride(
  provider: CatalogProvider | 'other',
  model: string,
): CatalogCapabilityEntry | null {
  const capabilitySection = modelCatalogState.overrides?.capabilities;
  if (!capabilitySection) {
    return null;
  }

  const merged = mergeEntries<CatalogCapabilityEntry>([
    capabilitySection.default,
    provider === 'other'
      ? undefined
      : capabilitySection.providers?.[provider]?.default,
    findCatalogModelEntry(capabilitySection.models, model),
    provider === 'other'
      ? undefined
      : findCatalogModelEntry(
          capabilitySection.providers?.[provider]?.models,
          model,
        ),
  ]);

  return merged;
}

export function getCatalogPricingModelKeys(
  provider?: CatalogProvider,
): string[] {
  const pricingSection = modelCatalogState.overrides?.pricing;
  if (!pricingSection) {
    return [];
  }

  const keys = new Set<string>();

  if (!provider) {
    Object.keys(pricingSection.models ?? {}).forEach((key) => keys.add(key));
    Object.values(pricingSection.providers ?? {}).forEach((providerEntry) => {
      Object.keys(providerEntry?.models ?? {}).forEach((key) => keys.add(key));
    });

    return [...keys];
  }

  Object.entries(pricingSection.models ?? {}).forEach(([modelKey, entry]) => {
    const modelProvider =
      entry.provider ?? inferCatalogProviderFromModel(modelKey);
    if (modelProvider === provider) {
      keys.add(modelKey);
    }
  });

  Object.keys(pricingSection.providers?.[provider]?.models ?? {}).forEach(
    (key) => keys.add(key),
  );

  return [...keys];
}

export function inferCatalogProviderFromModel(
  model: string,
): CatalogProvider | 'unknown' {
  const normalizedModel = normalizeModelName(model);

  if (normalizedModel.includes('claude')) {
    return 'anthropic';
  }

  if (normalizedModel.includes('gemini')) {
    return 'google';
  }

  if (
    normalizedModel.startsWith('gpt-') ||
    normalizedModel.startsWith('chatgpt-') ||
    normalizedModel.startsWith('o1') ||
    normalizedModel.startsWith('o3') ||
    normalizedModel.startsWith('o4') ||
    normalizedModel.startsWith('o5') ||
    normalizedModel.includes('gpt')
  ) {
    return 'openai';
  }

  return 'unknown';
}

function parseModelCatalog(payload: unknown): ModelCatalog {
  const result = modelCatalogSchema.safeParse(payload);

  if (!result.success) {
    throw new ModelCatalogValidationError(
      result.error.issues.map((issue) => {
        const path = issue.path.join('.') || '<root>';
        return `${path}: ${issue.message}`;
      }),
    );
  }

  return result.data;
}

async function loadCatalogFromSource(
  source: CatalogSource,
  fetchFn?: typeof fetch,
): Promise<ModelCatalog> {
  switch (source.kind) {
    case 'url': {
      const effectiveFetch = fetchFn ?? globalThis.fetch;
      if (!effectiveFetch) {
        throw new ModelCatalogLoadError(
          'Global fetch is unavailable. Pass fetchFn explicitly.',
        );
      }

      const response = await effectiveFetch(source.value, {
        headers: {
          accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new ModelCatalogLoadError(
          `Failed to load model catalog from URL (${response.status} ${response.statusText})`,
        );
      }

      const rawJson = await response.text();
      return parseCatalogJson(rawJson, `URL ${source.value}`);
    }

    case 'file': {
      const {readFile} = await import('node:fs/promises');
      const rawJson = await readFile(source.value, 'utf8');
      return parseCatalogJson(rawJson, `file ${source.value}`);
    }

    case 'json':
      return parseCatalogJson(source.value, 'inline JSON payload');

    default:
      return assertNever(source);
  }
}

function parseCatalogJson(
  rawJson: string,
  sourceDescription: string,
): ModelCatalog {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawJson);
  } catch (error) {
    throw new ModelCatalogLoadError(
      `Failed to parse model catalog JSON from ${sourceDescription}`,
      {
        cause: error,
      },
    );
  }

  return parseModelCatalog(parsedJson);
}

function resolveCatalogSource(options: LoadModelCatalogOptions): CatalogSource {
  const hasUrl = typeof options.url === 'string';
  const hasFilePath = typeof options.filePath === 'string';
  const hasJson = options.json !== undefined;

  const sourcesCount = Number(hasUrl) + Number(hasFilePath) + Number(hasJson);
  if (sourcesCount !== 1) {
    throw new ModelCatalogLoadError(
      'Exactly one source must be provided: url, filePath, or json',
    );
  }

  if (hasUrl) {
    const url = options.url!.trim();
    if (url.length === 0) {
      throw new ModelCatalogLoadError('Model catalog URL cannot be empty');
    }

    return {
      kind: 'url',
      key: `url:${url}`,
      value: url,
    };
  }

  if (hasFilePath) {
    const filePath = options.filePath!.trim();
    if (filePath.length === 0) {
      throw new ModelCatalogLoadError('Model catalog filePath cannot be empty');
    }

    return {
      kind: 'file',
      key: `file:${filePath}`,
      value: filePath,
    };
  }

  if (typeof options.json === 'string') {
    const json = options.json;
    return {
      kind: 'json',
      key: `json:${hashString(json)}`,
      value: json,
    };
  }

  return {
    kind: 'json',
    key: 'json:inline-object',
    value: JSON.stringify(options.json),
  };
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function findCatalogModelEntry<T extends Record<string, unknown>>(
  modelMap: Record<string, T> | undefined,
  model: string,
): T | undefined {
  if (!modelMap) {
    return undefined;
  }

  if (model in modelMap) {
    return modelMap[model];
  }

  const normalizedModel = normalizeModelName(model);

  for (const [candidate, entry] of Object.entries(modelMap)) {
    const normalizedCandidate = normalizeModelName(candidate);

    if (normalizedCandidate === normalizedModel) {
      return entry;
    }
  }

  for (const [candidate, entry] of Object.entries(modelMap)) {
    const normalizedCandidate = normalizeModelName(candidate);

    if (
      normalizedModel.startsWith(normalizedCandidate) ||
      normalizedCandidate.startsWith(normalizedModel)
    ) {
      return entry;
    }
  }

  return undefined;
}

function normalizeModelName(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/^models\//, '');
}

function mergeEntries<T extends Record<string, unknown>>(
  entries: (T | undefined)[],
): T | null {
  const merged: Record<string, unknown> = {};

  for (const entry of entries) {
    if (!entry) {
      continue;
    }

    for (const [key, value] of Object.entries(entry)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }

  return Object.keys(merged).length > 0 ? (merged as T) : null;
}

function cloneCatalog<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  Object.freeze(value);

  for (const propertyValue of Object.values(value)) {
    if (
      propertyValue !== null &&
      (typeof propertyValue === 'object' ||
        typeof propertyValue === 'function') &&
      !Object.isFrozen(propertyValue)
    ) {
      deepFreeze(propertyValue);
    }
  }

  return value;
}

function toModelCatalogError(error: unknown): ModelCatalogError {
  if (error instanceof ModelCatalogError) {
    return error;
  }

  if (error instanceof Error) {
    return new ModelCatalogLoadError(error.message, {cause: error});
  }

  return new ModelCatalogLoadError('Unknown catalog loading error', {
    cause: error,
  });
}

function assertNever(value: never): never {
  throw new ModelCatalogLoadError(
    `Unexpected catalog source: ${String(value)}`,
  );
}
