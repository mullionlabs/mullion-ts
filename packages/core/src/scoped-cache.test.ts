import {describe, expect, it} from 'vitest';
import {createOwned} from './owned.js';
import {
  assertOwnedScope,
  createCacheKey,
  createScopedCache,
} from './scoped-cache.js';

describe('scoped cache', () => {
  it('stores and retrieves values within scope', () => {
    const cache = createScopedCache('tenant-a');
    const key = createCacheKey('tenant-a', 'doc:1');
    const value = createOwned({value: 'data', scope: 'tenant-a'});

    cache.set(key, value);
    expect(cache.get(key)).toEqual(value);
  });

  it('throws when value scope mismatches cache scope', () => {
    const cache = createScopedCache('tenant-a');
    const key = createCacheKey('tenant-a', 'doc:1');
    const value = createOwned({value: 'data', scope: 'tenant-b'});

    expect(() =>
      cache.set(key, value as unknown as typeof value & {__scope: 'tenant-a'}),
    ).toThrow(/scope mismatch/i);
  });

  it('assertOwnedScope enforces runtime scope checks', () => {
    const owned = createOwned({value: 'data', scope: 'tenant-a'});
    const narrowed = assertOwnedScope(owned, 'tenant-a');

    expect(narrowed.__scope).toBe('tenant-a');
    expect(() => assertOwnedScope(owned, 'tenant-b')).toThrow(
      /scope mismatch/i,
    );
  });
});
