import {describe, expect, it} from 'vitest';
import {createOwned} from './owned.js';
import {assertSafeFor, redact, summarize} from './sink-safe.js';

describe('sink-safe helpers', () => {
  it('summarizes without leaking raw string content', () => {
    const secret = 'super-secret-value';
    const summary = summarize(secret) as string;

    expect(summary).toContain('string');
    expect(summary).not.toContain(secret);
  });

  it('redacts Owned values without exposing raw content', () => {
    const owned = createOwned({value: 'top-secret', scope: 'admin'});
    const redacted = redact(owned) as string;

    expect(redacted).toContain('redacted');
    expect(redacted).toContain('scope=admin');
    expect(redacted).not.toContain('top-secret');
  });

  it('assertSafeFor returns the original value at runtime', () => {
    const value = {kind: 'public'};
    const safe = assertSafeFor('public', value);

    expect(safe).toBe(value);
  });
});
