import type {LogSafe} from '../sink-safe.js';

export interface SpanLike {
  setAttribute(key: string, value: unknown): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
}

export type LogSafeAttributes = Record<string, LogSafe<unknown>>;

export function safeSetAttribute(
  span: SpanLike,
  key: string,
  value: LogSafe<unknown>,
): void {
  span.setAttribute(key, value as unknown);
}

export function safeAddEvent(
  span: SpanLike,
  name: string,
  attributes?: LogSafeAttributes,
): void {
  if (!attributes) {
    span.addEvent(name);
    return;
  }

  const unsafeAttributes: Record<string, unknown> = {};
  for (const [attrKey, attrValue] of Object.entries(attributes)) {
    unsafeAttributes[attrKey] = attrValue as unknown;
  }

  span.addEvent(name, unsafeAttributes);
}
