/**
 * Fork module for parallel LLM execution with cache optimization.
 *
 * This module provides types and utilities for executing multiple LLM
 * operations in parallel while maximizing cache reuse across branches.
 *
 * @module fork
 */

export type {
  ForkStrategy,
  WarmupStrategy,
  SchemaConflictBehavior,
  ForkBranch,
  ForkOptions,
  ForkCacheStats,
  ForkResult,
  SchemaConflictResult,
  WarmupResult,
} from './types.js';

export type { WarmupExecutor } from './fork.js';
export {
  fork,
  registerWarmupExecutor,
  getWarmupExecutor,
  clearWarmupExecutor,
} from './fork.js';
