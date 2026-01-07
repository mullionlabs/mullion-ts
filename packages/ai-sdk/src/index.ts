// @scopestack/ai-sdk - Vercel AI SDK integration for ScopeStack

export {
  createScopeStackClient,
  extractConfidenceFromFinishReason,
} from './client.js';
export type { ScopeStackClient } from './client.js';

// Re-export core types for convenience
export type { Context, Owned, Schema, InferOptions } from '@scopestack/core';
