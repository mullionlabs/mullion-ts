/**
 * Shared Helpdesk Schemas
 *
 * Zod schemas for ticket analysis, customer responses,
 * and sanitized data for safe bridging between scopes.
 */

import {z} from 'zod';

/**
 * Schema for analyzing support tickets with internal admin notes.
 *
 * Contains BOTH public and private information.
 * Internal notes must NEVER leak to customer-facing responses.
 */
export const TicketAnalysisSchema = z.object({
  // Public information - safe to share with customer
  ticketId: z.string().describe('Unique ticket identifier'),
  summary: z.string().describe('Brief summary of the ticket content'),
  category: z
    .enum(['billing', 'technical', 'account', 'general'])
    .describe('Ticket category'),
  priority: z
    .enum(['low', 'medium', 'high', 'urgent'])
    .describe('Priority level based on content'),
  sentiment: z
    .enum(['positive', 'neutral', 'frustrated', 'angry'])
    .describe('Customer sentiment'),

  // Internal information - MUST NOT leak to customer
  internalNotes: z
    .string()
    .describe(
      'Admin-only notes with sensitive context (customer history, previous complaints, internal policies)',
    ),
  riskLevel: z
    .enum(['none', 'low', 'medium', 'high'])
    .describe('Risk level for company (churn risk, legal exposure)'),
  recommendedActions: z
    .array(z.string())
    .describe('Internal recommended actions for support staff'),
  suggestedCompensation: z
    .string()
    .describe(
      'Internal suggestion for compensation/discounts (use "None" if not applicable)',
    ),
});

export type TicketAnalysis = z.infer<typeof TicketAnalysisSchema>;

/**
 * Schema for customer-facing responses.
 *
 * This is what gets sent to the customer. It should NEVER contain
 * internal notes, risk assessments, or compensation strategies.
 */
export const CustomerResponseSchema = z.object({
  message: z
    .string()
    .describe('Professional, empathetic response to the customer'),
  actionItems: z
    .array(z.string())
    .describe('Concrete steps being taken to resolve the issue'),
  estimatedResolution: z
    .string()
    .describe('When customer can expect resolution'),
  escalated: z.boolean().describe('Whether this was escalated to human agent'),
  followUpRequired: z.boolean().describe('Whether follow-up contact is needed'),
});

export type CustomerResponse = z.infer<typeof CustomerResponseSchema>;

/**
 * Customer response with confidence score (API response shape).
 */
export const CustomerResponseWithConfidenceSchema =
  CustomerResponseSchema.extend({
    confidence: z.number().min(0).max(1),
  });

export type CustomerResponseWithConfidence = z.infer<
  typeof CustomerResponseWithConfidenceSchema
>;

/**
 * API response shape for /api/analyze (public response).
 */
export const AnalyzeResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    ticketId: z.string(),
    summary: z.string(),
    category: z.string(),
    priority: z.string(),
    customerResponse: CustomerResponseWithConfidenceSchema,
  }),
});

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

/**
 * Schema for sanitized ticket data that's safe to bridge.
 *
 * Only contains public information, explicitly excluding
 * all internal/sensitive fields.
 */
export const SanitizedTicketSchema = z.object({
  ticketId: z.string(),
  summary: z.string(),
  category: z.enum(['billing', 'technical', 'account', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  sentiment: z.enum(['positive', 'neutral', 'frustrated', 'angry']),
  // Note: internalNotes, riskLevel, recommendedActions, suggestedCompensation are excluded
});

export type SanitizedTicket = z.infer<typeof SanitizedTicketSchema>;
