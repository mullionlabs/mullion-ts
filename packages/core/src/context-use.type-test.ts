/**
 * Type-level regression tests for {@link Context.use}.
 *
 * Guards BUG-1: the documented `bridge() -> use()` flow must compile, while
 * using an unbridged value from a foreign scope must remain a compile error.
 *
 * This file is intentionally NOT a `*.test.ts` file so that it is included in
 * `tsc --noEmit` typechecking. It is never imported by `index.ts`, so tsup does
 * not bundle it into the published output.
 */
import type {Context} from './context.js';
import {bridge} from './bridge.js';
import {createOwned} from './owned.js';
import type {Owned} from './owned.js';

declare const customerCtx: Context<'customer'>;

const adminData: Owned<string, 'admin'> = createOwned({
  value: 'secret',
  scope: 'admin',
});

const customerData: Owned<string, 'customer'> = createOwned({
  value: 'ok',
  scope: 'customer',
});

// ✅ A value created directly in this scope is usable.
const direct: string = customerCtx.use(customerData);
void direct;

// ✅ A standalone-bridged value (union scope containing 'customer') is usable.
const standaloneBridged = bridge(adminData, 'customer');
const fromStandalone: string = customerCtx.use(standaloneBridged);
void fromStandalone;

// ✅ The documented flow: Context.bridge() result is usable in that context.
const ctxBridged = customerCtx.bridge(adminData);
const fromCtxBridge: string = customerCtx.use(ctxBridged);
void fromCtxBridge;

// ❌ An unbridged value from a foreign scope must NOT be usable.
// @ts-expect-error - scope 'admin' does not include 'customer'
customerCtx.use(adminData);
