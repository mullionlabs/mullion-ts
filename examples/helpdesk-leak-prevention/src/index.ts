/**
 * @mullion/template-helpdesk
 *
 * Reusable helpdesk flow demonstrating scope isolation and leak prevention.
 * Can be imported into demo apps or generated projects.
 */

// ============================================================================
// Schemas
// ============================================================================
export type {
  TicketAnalysis,
  CustomerResponse,
  SanitizedTicket,
} from './schemas.js';

export {
  TicketAnalysisSchema,
  CustomerResponseSchema,
  SanitizedTicketSchema,
} from './schemas.js';

// ============================================================================
// Safe Flow (Production-Ready Implementation)
// ============================================================================
export {processSupportTicketSafely} from './safe-flow.js';

// ============================================================================
// Unsafe Flow (Educational Examples - DO NOT USE IN PRODUCTION)
// ============================================================================
// These functions demonstrate common mistakes and anti-patterns.
// They are intentionally designed to fail ESLint checks.
// Import only for educational or testing purposes.
export {
  contextLeakOuterScope,
  contextLeakCrossScope,
  directValueAccessLeak,
  noConfidenceCheck,
  arrayCollectionLeak,
  returnValueLeak,
  completeUnsafeFlow,
} from './unsafe-flow.js';

// ============================================================================
// Provider Utilities
// ============================================================================
export {
  getLanguageModel,
  getProviderName,
  type ProviderConfig,
  type ProviderType,
} from './provider.js';
