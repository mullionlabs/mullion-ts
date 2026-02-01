import type {Owned} from './owned.js';

export interface CacheKey<S extends string> {
  readonly key: string;
  readonly __scope: S;
}

export interface ScopedCacheOptions {
  enforceScope?: boolean;
}

export interface ScopedCache<S extends string, T> {
  readonly scope: S;
  get(key: CacheKey<S>): Owned<T, S> | undefined;
  set(key: CacheKey<S>, value: Owned<T, S>): void;
  has(key: CacheKey<S>): boolean;
  delete(key: CacheKey<S>): boolean;
  clear(): void;
}

export function createCacheKey<S extends string>(
  scope: S,
  key: string,
): CacheKey<S> {
  return {key, __scope: scope};
}

export function createScopedCache<S extends string, T>(
  scope: S,
  store = new Map<string, Owned<T, S>>(),
  options: ScopedCacheOptions = {},
): ScopedCache<S, T> {
  const {enforceScope = true} = options;

  function assertKeyScope(key: CacheKey<S>): void {
    if (!enforceScope) return;
    if (key.__scope !== scope) {
      throw new Error(
        `Cache key scope mismatch: expected ${scope}, received ${key.__scope}`,
      );
    }
  }

  function assertValueScope(value: Owned<T, S>): void {
    if (!enforceScope) return;
    if (value.__scope !== scope) {
      throw new Error(
        `Cache value scope mismatch: expected ${scope}, received ${value.__scope}`,
      );
    }
  }

  return {
    scope,
    get(key) {
      assertKeyScope(key);
      return store.get(key.key);
    },
    set(key, value) {
      assertKeyScope(key);
      assertValueScope(value);
      store.set(key.key, value);
    },
    has(key) {
      assertKeyScope(key);
      return store.has(key.key);
    },
    delete(key) {
      assertKeyScope(key);
      return store.delete(key.key);
    },
    clear() {
      store.clear();
    },
  };
}

export function assertOwnedScope<T, S extends string>(
  value: Owned<T, string>,
  scope: S,
): Owned<T, S> {
  if (value.__scope !== scope) {
    throw new Error(
      `Scope mismatch: expected ${scope}, received ${value.__scope}`,
    );
  }

  return value as Owned<T, S>;
}
