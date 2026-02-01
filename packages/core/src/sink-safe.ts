import type {Brand} from './brand.js';
import {isOwned} from './owned.js';

const DEFAULT_MAX_LENGTH = 120;

export type LogSafe<T> = Brand<T, 'LogSafe'>;
export type Redacted<T> = LogSafe<T>;

export interface SummarizeOptions {
  maxLength?: number;
}

export interface RedactOptions extends SummarizeOptions {
  label?: string;
}

/**
 * Produce a safe summary string for a value without including raw content.
 */
export function summarize(
  value: unknown,
  options: SummarizeOptions = {},
): LogSafe<string> {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const summary = buildSummary(value, maxLength);
  return summary as LogSafe<string>;
}

/**
 * Redact a value into a safe summary string with an explicit label.
 */
export function redact(
  value: unknown,
  options: RedactOptions = {},
): Redacted<string> {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const label = options.label ?? 'redacted';
  const summary = buildSummary(value, maxLength);
  return `[${label}] ${summary}` as Redacted<string>;
}

/**
 * Explicitly assert a value is safe for a given scope.
 * Use sparingly and document the reasoning.
 */
export function assertSafeFor<S extends string, T>(
  scope: S,
  value: T,
): LogSafe<T> {
  void scope;
  return value as LogSafe<T>;
}

function buildSummary(value: unknown, maxLength: number): string {
  const summary = describeValue(value);
  return clamp(summary, maxLength);
}

function clamp(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function describeValue(value: unknown): string {
  if (isOwned(value)) {
    const owned = value as {__scope: string; value: unknown};
    const inner = describeType(owned.value);
    return `Owned(scope=${owned.__scope}, value=${inner})`;
  }

  return describeType(value);
}

function describeType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const type = typeof value;

  if (type === 'string') return `string(length=${value.length})`;
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'bigint') return 'bigint';
  if (type === 'symbol') return 'symbol';
  if (type === 'function') return 'function';

  if (Array.isArray(value)) return `array(length=${value.length})`;
  if (value instanceof Date) return 'date';
  if (value instanceof Map) return `map(size=${value.size})`;
  if (value instanceof Set) return `set(size=${value.size})`;

  if (type === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return `object(keys=${keys.length})`;
  }

  return 'unknown';
}
