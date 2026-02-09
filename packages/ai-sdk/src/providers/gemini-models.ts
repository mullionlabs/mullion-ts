/**
 * Gemini model discovery via Google Generative Language API.
 *
 * This module intentionally avoids a hardcoded full Gemini model list.
 * Instead, it resolves available models dynamically via `models.list`.
 */

const DEFAULT_GEMINI_MODELS_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

interface GeminiModelsApiResponse {
  readonly models?: unknown[];
  readonly nextPageToken?: string;
}

interface GeminiApiModel {
  readonly name: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly version?: string;
  readonly state?: string;
  readonly inputTokenLimit?: number;
  readonly outputTokenLimit?: number;
  readonly supportedGenerationMethods: readonly string[];
}

/**
 * Normalized Gemini model metadata returned by discovery helpers.
 */
export interface GeminiModel {
  /** Full API name, e.g. "models/gemini-2.0-flash" */
  readonly name: string;

  /** Short model id, e.g. "gemini-2.0-flash" */
  readonly id: string;

  readonly displayName?: string;
  readonly description?: string;
  readonly version?: string;
  readonly state?: string;
  readonly inputTokenLimit?: number;
  readonly outputTokenLimit?: number;
  readonly supportedGenerationMethods: readonly string[];
}

/**
 * Options for listing Gemini models.
 */
export interface ListGeminiModelsOptions {
  /** API key. Falls back to GOOGLE_GENERATIVE_AI_API_KEY when omitted. */
  readonly apiKey?: string;

  /** Override models.list endpoint. */
  readonly baseUrl?: string;

  /** Optional page size hint for models.list pagination. */
  readonly pageSize?: number;

  /** Include models marked as deprecated. Default: false. */
  readonly includeDeprecated?: boolean;

  /**
   * Include models that do not support generateContent.
   * Default: false (inference-focused list).
   */
  readonly includeNonInferenceModels?: boolean;

  /** Optional abort signal for outbound requests. */
  readonly signal?: AbortSignal;

  /** Optional fetch override for tests. */
  readonly fetcher?: typeof fetch;
}

/**
 * Cached list options.
 */
export interface ListGeminiModelsCachedOptions extends ListGeminiModelsOptions {
  /** Force refresh, bypassing in-memory cache. */
  readonly forceRefresh?: boolean;

  /** Cache TTL in milliseconds. Default: 10 minutes. */
  readonly cacheTtlMs?: number;
}

interface GeminiModelsCacheEntry {
  readonly expiresAt: number;
  readonly models: readonly GeminiModel[];
}

const geminiModelsCache = new Map<string, GeminiModelsCacheEntry>();

/**
 * Normalize model name from API format.
 *
 * @example
 * normalizeGeminiModelName('models/gemini-2.0-flash') // gemini-2.0-flash
 */
export function normalizeGeminiModelName(name: string): string {
  const trimmed = name.trim();
  return trimmed.startsWith('models/')
    ? trimmed.slice('models/'.length)
    : trimmed;
}

/**
 * Check whether a model supports structured inference workflows.
 */
export function supportsGenerateContent(model: GeminiModel): boolean {
  return model.supportedGenerationMethods.includes('generateContent');
}

/**
 * Clear in-memory Gemini models cache.
 */
export function clearGeminiModelsCache(): void {
  geminiModelsCache.clear();
}

/**
 * Fetch Gemini models from `models.list`, handling pagination and filtering.
 */
export async function listGeminiModels(
  options: ListGeminiModelsOptions = {},
): Promise<GeminiModel[]> {
  const apiKey = resolveGeminiApiKey(options.apiKey);
  const baseUrl = options.baseUrl ?? DEFAULT_GEMINI_MODELS_URL;
  const fetcher = resolveFetcher(options.fetcher);
  const includeDeprecated = options.includeDeprecated ?? false;
  const includeNonInferenceModels = options.includeNonInferenceModels ?? false;

  const byId = new Map<string, GeminiModel>();
  let pageToken: string | undefined;

  do {
    const requestUrl = createModelsUrl(baseUrl, apiKey, {
      pageToken,
      pageSize: options.pageSize,
    });
    const response = await fetcher(requestUrl, {
      method: 'GET',
      signal: options.signal,
    });

    if (!response.ok) {
      const details = await safeReadResponseText(response);
      throw new Error(
        `Gemini models.list failed (${response.status} ${response.statusText})${details ? `: ${details}` : ''}`,
      );
    }

    const payload = (await response.json()) as GeminiModelsApiResponse;
    const models = Array.isArray(payload.models) ? payload.models : [];

    for (const raw of models) {
      const parsed = parseGeminiApiModel(raw);
      if (!parsed) {
        continue;
      }

      if (!includeDeprecated && isDeprecated(parsed.state)) {
        continue;
      }

      const normalized: GeminiModel = {
        name: parsed.name,
        id: normalizeGeminiModelName(parsed.name),
        displayName: parsed.displayName,
        description: parsed.description,
        version: parsed.version,
        state: parsed.state,
        inputTokenLimit: parsed.inputTokenLimit,
        outputTokenLimit: parsed.outputTokenLimit,
        supportedGenerationMethods: parsed.supportedGenerationMethods,
      };

      if (!includeNonInferenceModels && !supportsGenerateContent(normalized)) {
        continue;
      }

      byId.set(normalized.id, normalized);
    }

    pageToken =
      typeof payload.nextPageToken === 'string' &&
      payload.nextPageToken.length > 0
        ? payload.nextPageToken
        : undefined;
  } while (pageToken);

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Cached variant of listGeminiModels.
 */
export async function listGeminiModelsCached(
  options: ListGeminiModelsCachedOptions = {},
): Promise<GeminiModel[]> {
  const apiKey = resolveGeminiApiKey(options.apiKey);
  const baseUrl = options.baseUrl ?? DEFAULT_GEMINI_MODELS_URL;
  const cacheKey = buildCacheKey(baseUrl, apiKey, options);
  const now = Date.now();
  const ttlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

  if (!options.forceRefresh) {
    const cached = geminiModelsCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return [...cached.models];
    }
  }

  const models = await listGeminiModels({
    ...options,
    apiKey,
    baseUrl,
  });

  geminiModelsCache.set(cacheKey, {
    expiresAt: now + Math.max(ttlMs, 0),
    models,
  });

  return [...models];
}

function resolveGeminiApiKey(explicitApiKey?: string): string {
  const fromOptions = explicitApiKey?.trim();
  if (fromOptions) {
    return fromOptions;
  }

  const fromEnv = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  throw new Error(
    'Gemini API key is required. Pass apiKey option or set GOOGLE_GENERATIVE_AI_API_KEY.',
  );
}

function resolveFetcher(fetcher?: typeof fetch): typeof fetch {
  if (fetcher) {
    return fetcher;
  }

  if (typeof globalThis.fetch !== 'function') {
    throw new Error('Global fetch is unavailable. Provide fetcher option.');
  }

  return globalThis.fetch;
}

function createModelsUrl(
  baseUrl: string,
  apiKey: string,
  options: {
    readonly pageToken?: string;
    readonly pageSize?: number;
  },
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('key', apiKey);

  if (typeof options.pageSize === 'number' && options.pageSize > 0) {
    url.searchParams.set('pageSize', String(Math.floor(options.pageSize)));
  }

  if (options.pageToken) {
    url.searchParams.set('pageToken', options.pageToken);
  }

  return url.toString();
}

function parseGeminiApiModel(value: unknown): GeminiApiModel | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name : null;
  if (!name || name.length === 0) {
    return null;
  }

  const supportedGenerationMethods = Array.isArray(
    raw.supportedGenerationMethods,
  )
    ? raw.supportedGenerationMethods.filter(
        (method): method is string => typeof method === 'string',
      )
    : [];

  return {
    name,
    displayName:
      typeof raw.displayName === 'string' ? raw.displayName : undefined,
    description:
      typeof raw.description === 'string' ? raw.description : undefined,
    version: typeof raw.version === 'string' ? raw.version : undefined,
    state: typeof raw.state === 'string' ? raw.state : undefined,
    inputTokenLimit:
      typeof raw.inputTokenLimit === 'number' ? raw.inputTokenLimit : undefined,
    outputTokenLimit:
      typeof raw.outputTokenLimit === 'number'
        ? raw.outputTokenLimit
        : undefined,
    supportedGenerationMethods,
  };
}

function isDeprecated(state?: string): boolean {
  if (!state) {
    return false;
  }

  return state.trim().toUpperCase() === 'DEPRECATED';
}

function buildCacheKey(
  baseUrl: string,
  apiKey: string,
  options: ListGeminiModelsCachedOptions,
): string {
  const maskedApiKey = `${apiKey.length}:${apiKey.slice(-6)}`;
  return [
    baseUrl,
    maskedApiKey,
    String(options.includeDeprecated ?? false),
    String(options.includeNonInferenceModels ?? false),
    String(options.pageSize ?? ''),
  ].join('|');
}

async function safeReadResponseText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.trim().slice(0, 500);
  } catch {
    return '';
  }
}
