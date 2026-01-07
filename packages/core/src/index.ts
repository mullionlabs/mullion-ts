// @scopestack/core - Type-safe LLM context management

// Brand types for nominal typing
export type { Brand, ScopeId } from './brand.js';

// Owned type for LLM-generated values with provenance tracking
export type { Owned, CreateOwnedOptions } from './owned.js';
export { createOwned, isOwned, ownedSchema } from './owned.js';

// SemanticValue type for LLM-generated values with alternatives and reasoning
export type {
  SemanticValue,
  Alternative,
  CreateSemanticValueOptions,
} from './semantic-value.js';
export {
  createSemanticValue,
  isSemanticValue,
  semanticValueSchema,
  alternativeSchema,
} from './semantic-value.js';

// Context type for scoped LLM execution
export type {
  Context,
  Schema,
  ContextOptions,
  InferOptions,
} from './context.js';

// Scope function for creating scoped execution contexts
export { scope } from './scope.js';

// Bridge utilities for transferring values across scope boundaries
export type { BridgeMultipleOptions, BridgeMetadata } from './bridge.js';
export {
  bridge,
  bridgeSemantic,
  bridgeMultiple,
  getProvenance,
  isBridged,
  bridgeWithMetadata,
} from './bridge.js';
