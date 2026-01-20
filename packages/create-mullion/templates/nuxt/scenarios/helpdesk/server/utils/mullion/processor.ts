/**
 * Support Ticket Processor
 *
 * Demonstrates safe scope isolation:
 * 1. Admin scope: Full analysis with internal notes
 * 2. Sanitization: Remove sensitive data
 * 3. Public scope: Generate customer response
 */

import type {H3Event} from 'h3';
import {createMullionClient} from '@mullion/ai-sdk';
import {createOwned} from '@mullion/core';
import {
  TicketAnalysisSchema,
  CustomerResponseSchema,
  type TicketAnalysis,
  type CustomerResponse,
  type SanitizedTicket,
} from '~~/schemas';
import type {ProviderConfig} from './provider';

export interface ProcessingResult {
  adminAnalysis: {
    ticketId: string;
    summary: string;
    category: string;
    priority: string;
    sentiment: string;
    confidence: number;
    // Internal fields visible only in admin context
    internalNotes: string;
    riskLevel: string;
    recommendedActions: string[];
    suggestedCompensation: string;
  };
  customerResponse: {
    message: string;
    actionItems: string[];
    estimatedResolution: string;
    escalated: boolean;
    followUpRequired: boolean;
    confidence: number;
  };
}

/**
 * Process support ticket with proper scope isolation
 * @param event - H3 event from the API route
 * @param ticketText - Support ticket text to process
 * @param providerConfig - Optional provider configuration
 */
export async function processSupportTicket(
  event: H3Event,
  ticketText: string,
  providerConfig?: ProviderConfig,
): Promise<ProcessingResult> {
  const model = getLanguageModel(event, providerConfig);

  if (!model) {
    return runMockFlow(ticketText);
  }

  const client = createMullionClient(
    model,
    getMullionClientOptions(event, providerConfig),
  );

  // Step 1: Admin scope - analyze ticket with full context
  const adminAnalysis = await client.scope('admin', async (adminCtx) => {
    const adminPrompt = `You are analyzing a customer support ticket.

Analyze the following ticket:

${ticketText}

Provide a complete analysis including:
- Category (billing, technical, account, or general)
- Priority level
- Customer sentiment
- Internal notes about customer history/risk
- Recommended actions for support staff
- Suggested compensation (or "None" if not applicable)`;

    const analysis = await adminCtx.infer(TicketAnalysisSchema, adminPrompt);

    if (analysis.confidence < 0.7) {
      throw new Error('Low confidence analysis - requires human review');
    }

    return analysis;
  });

  // Step 2: Sanitize data before bridging
  const sanitized: SanitizedTicket = {
    ticketId: adminAnalysis.value.ticketId,
    summary: adminAnalysis.value.summary,
    category: adminAnalysis.value.category,
    priority: adminAnalysis.value.priority,
    sentiment: adminAnalysis.value.sentiment,
    // CRITICAL: internalNotes, riskLevel, recommendedActions, suggestedCompensation are NOT included
  };

  // Step 3: Public scope - generate customer response
  const response = await client.scope('public', async (publicCtx) => {
    const sanitizedOwned = createOwned({
      value: sanitized,
      scope: 'admin' as const,
      confidence: adminAnalysis.confidence,
      traceId: adminAnalysis.traceId,
    });

    const bridged = publicCtx.bridge(sanitizedOwned);

    const prompt = `You are a customer support representative.

Generate a professional customer response for this support ticket:

Summary: ${bridged.value.summary}
Category: ${bridged.value.category}
Priority: ${bridged.value.priority}
Sentiment: ${bridged.value.sentiment}

Instructions:
- Be empathetic and solution-focused
- Provide actionable next steps
- Do NOT mention internal notes, risk levels, or compensation strategies`;

    const customerResponse = await publicCtx.infer(
      CustomerResponseSchema,
      prompt,
    );

    return customerResponse;
  });

  return {
    adminAnalysis: {
      ticketId: adminAnalysis.value.ticketId,
      summary: adminAnalysis.value.summary,
      category: adminAnalysis.value.category,
      priority: adminAnalysis.value.priority,
      sentiment: adminAnalysis.value.sentiment,
      confidence: adminAnalysis.confidence,
      internalNotes: adminAnalysis.value.internalNotes,
      riskLevel: adminAnalysis.value.riskLevel,
      recommendedActions: adminAnalysis.value.recommendedActions,
      suggestedCompensation: adminAnalysis.value.suggestedCompensation,
    },
    customerResponse: {
      message: response.value.message,
      actionItems: response.value.actionItems,
      estimatedResolution: response.value.estimatedResolution,
      escalated: response.value.escalated,
      followUpRequired: response.value.followUpRequired,
      confidence: response.confidence,
    },
  };
}

/**
 * Mock flow for demonstration without API key
 */
function runMockFlow(ticketText: string): ProcessingResult {
  const ticketLower = ticketText.toLowerCase();

  // Determine category
  let category: 'billing' | 'technical' | 'account' | 'general' = 'general';
  if (ticketLower.includes('billing') || ticketLower.includes('charge'))
    category = 'billing';
  if (ticketLower.includes('error') || ticketLower.includes('bug'))
    category = 'technical';
  if (ticketLower.includes('account') || ticketLower.includes('password'))
    category = 'account';

  // Determine priority
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  if (ticketLower.includes('urgent') || ticketLower.includes('immediately'))
    priority = 'urgent';
  if (ticketLower.includes('cancel')) priority = 'high';

  // Determine sentiment
  let sentiment: 'positive' | 'neutral' | 'frustrated' | 'angry' = 'neutral';
  if (ticketLower.includes('frustrated') || ticketLower.includes('annoyed'))
    sentiment = 'frustrated';
  if (ticketLower.includes('angry') || ticketLower.includes('complaint'))
    sentiment = 'angry';
  if (ticketLower.includes('thank') || ticketLower.includes('great'))
    sentiment = 'positive';

  return {
    adminAnalysis: {
      ticketId: `TIX-${Date.now()}`,
      summary: 'Customer inquiry requiring attention',
      category,
      priority,
      sentiment,
      confidence: 0.85,
      internalNotes:
        'Mock analysis - customer interaction history not available in demo mode.',
      riskLevel:
        priority === 'urgent' || priority === 'high' ? 'medium' : 'low',
      recommendedActions: [
        'Acknowledge customer concern',
        'Investigate issue',
        'Provide resolution timeline',
      ],
      suggestedCompensation:
        sentiment === 'angry' ? 'Consider goodwill gesture' : 'None',
    },
    customerResponse: {
      message: `Thank you for contacting us. We've received your ${category} inquiry and understand your concern.

Our team is reviewing your case and will work to resolve this promptly. You can expect an update within 24-48 hours.

If you have any additional information to share, please reply to this message.`,
      actionItems: [
        'Case assigned to support team',
        'Investigation in progress',
        'Follow-up scheduled',
      ],
      estimatedResolution: 'Within 24-48 hours',
      escalated: priority === 'urgent',
      followUpRequired: true,
      confidence: 0.9,
    },
  };
}
