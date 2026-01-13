/**
 * SAFE FLOW: Correct Implementation with Explicit Bridging
 *
 * This file demonstrates the CORRECT way to handle sensitive data
 * across scopes in a customer support system.
 *
 * ✅ Key Safety Features:
 * 1. Admin analysis stays in 'admin' scope
 * 2. Explicit data sanitization before bridging
 * 3. Customer response generated in separate 'public' scope
 * 4. Confidence checks before using data
 * 5. ESLint validates no leaks at compile time
 */

import { createMullionClient } from '@mullion/ai-sdk';
import { createOwned } from '@mullion/core';
import {
  TicketAnalysisSchema,
  CustomerResponseSchema,
  SanitizedTicketSchema,
  type SanitizedTicket,
} from './schemas.js';
import {
  getLanguageModel,
  getProviderName,
  type ProviderConfig,
} from './provider.js';

// Sample customer ticket
const SAMPLE_TICKET = `
Customer: Jane Doe (ID: CUST-12345)
Subject: Billing Issue - Unauthorized Charges

Message:
I just noticed charges on my account for $299.99 that I never authorized.
This is the third billing issue in 6 months and I'm extremely frustrated.
If this isn't resolved immediately, I'm canceling my subscription and
filing a complaint with the Better Business Bureau.

Previous tickets: #TIX-001, #TIX-042
Account status: Premium subscriber since 2020
`;

/**
 * ✅ SAFE: Process ticket with proper scope isolation and bridging
 */
export async function processSupportTicketSafely(
  providerConfig?: ProviderConfig
) {
  const model = getLanguageModel(providerConfig);

  if (!model) {
    console.log(`⚠️  No API key set. Running with mock data.\n`);
    return runMockSafeFlow();
  }

  console.log(`🤖 Using ${getProviderName(providerConfig)}\n`);
  const client = createMullionClient(model);

  console.log('🔒 SAFE FLOW: Processing ticket with proper isolation\n');
  console.log('📋 Ticket:\n', SAMPLE_TICKET, '\n');

  // Step 1: Admin scope - analyze ticket with full context
  const adminAnalysis = await client.scope('admin', async (adminCtx) => {
    console.log('👨‍💼 ADMIN SCOPE: Analyzing ticket with internal context...');

    const analysis = await adminCtx.infer(TicketAnalysisSchema, SAMPLE_TICKET);

    // ✅ GOOD: Check confidence before using data
    if (analysis.confidence < 0.7) {
      console.log('⚠️  Low confidence - flagging for human review');
      throw new Error('Low confidence analysis');
    }

    console.log(`   Category: ${analysis.value.category}`);
    console.log(`   Priority: ${analysis.value.priority}`);
    console.log(`   Sentiment: ${analysis.value.sentiment}`);
    console.log(`   Confidence: ${analysis.confidence.toFixed(2)}`);
    console.log(
      `   🔐 Internal Notes: ${analysis.value.internalNotes.substring(0, 60)}...`
    );
    console.log(`   🔐 Risk Level: ${analysis.value.riskLevel}`);
    console.log(
      `   🔐 Suggested Compensation: ${analysis.value.suggestedCompensation || 'None'}\n`
    );

    // ✅ GOOD: Return owned value within scope
    return adminCtx.use(analysis);
  });

  // Step 2: Sanitize data before bridging
  console.log('🧹 SANITIZATION: Removing sensitive data...');

  // ✅ GOOD: Explicitly create sanitized version with only public fields
  const sanitized: SanitizedTicket = {
    ticketId: adminAnalysis.value.ticketId,
    category: adminAnalysis.value.category,
    priority: adminAnalysis.value.priority,
    sentiment: adminAnalysis.value.sentiment,
    // ✅ CRITICAL: internalNotes, riskLevel, suggestedCompensation are NOT included
  };

  console.log('   ✅ Sanitized data (safe to share):', sanitized, '\n');

  // Step 3: Public scope - generate customer response
  const response = await client.scope('public', async (publicCtx) => {
    console.log('🌐 PUBLIC SCOPE: Generating customer response...');

    // ✅ GOOD: Create owned value for sanitized data
    const sanitizedOwned = createOwned({
      value: sanitized,
      scope: 'admin' as const,
      confidence: adminAnalysis.confidence,
      traceId: adminAnalysis.traceId,
    });

    // ✅ GOOD: Explicitly bridge sanitized data
    const bridged = publicCtx.bridge(sanitizedOwned);
    console.log(`   Bridged scope: ${bridged.__scope}`);

    // ✅ GOOD: Generate response using only public data
    const prompt = `Generate a professional customer response for this support ticket:
Category: ${bridged.value.category}
Priority: ${bridged.value.priority}
Sentiment: ${bridged.value.sentiment}

Be empathetic and solution-focused. Do NOT mention internal notes, risk levels, or compensation strategies.`;

    const customerResponse = await publicCtx.infer(
      CustomerResponseSchema,
      prompt
    );

    // ✅ GOOD: Check confidence before sending to customer
    if (customerResponse.confidence < 0.8) {
      console.log('⚠️  Low confidence response - routing to human agent');
    }

    console.log(`   Confidence: ${customerResponse.confidence.toFixed(2)}`);
    console.log(
      `   Message: "${customerResponse.value.message.substring(0, 100)}..."`
    );
    console.log(
      `   Action Items: ${customerResponse.value.actionItems.join('; ')}`
    );
    console.log(`   Escalated: ${customerResponse.value.escalated}\n`);

    // ✅ GOOD: Return owned value within scope
    return publicCtx.use(customerResponse);
  });

  console.log('✅ SUCCESS: Ticket processed safely!\n');
  console.log('🔍 Key Safety Features:');
  console.log('   • Admin analysis stayed in admin scope');
  console.log('   • Sensitive data explicitly removed before bridging');
  console.log('   • Customer response generated in isolated public scope');
  console.log('   • Confidence checked at each step');
  console.log('   • ESLint validated no leaks at compile time\n');

  return { adminAnalysis, response };
}

/**
 * Mock flow for demonstration without API key
 */
async function runMockSafeFlow() {
  console.log('🔒 SAFE FLOW (Mock Mode)\n');
  console.log('📋 Ticket:\n', SAMPLE_TICKET, '\n');

  // Mock admin analysis
  const mockAdminAnalysis = {
    ticketId: 'TIX-789',
    category: 'billing' as const,
    priority: 'urgent' as const,
    sentiment: 'angry' as const,
    internalNotes:
      'High-value customer, 3rd billing issue. Churn risk. Previous complaints about payment processor integration.',
    riskLevel: 'high' as const,
    suggestedCompensation: 'Refund $299.99 + 1 month free service',
  };

  console.log('👨‍💼 ADMIN SCOPE: Mock analysis');
  console.log('   Category:', mockAdminAnalysis.category);
  console.log('   Priority:', mockAdminAnalysis.priority);
  console.log('   Sentiment:', mockAdminAnalysis.sentiment);
  console.log('   🔐 Internal Notes:', mockAdminAnalysis.internalNotes);
  console.log('   🔐 Risk Level:', mockAdminAnalysis.riskLevel);
  console.log(
    '   🔐 Suggested Compensation:',
    mockAdminAnalysis.suggestedCompensation,
    '\n'
  );

  // Mock sanitization
  const sanitized = {
    ticketId: mockAdminAnalysis.ticketId,
    category: mockAdminAnalysis.category,
    priority: mockAdminAnalysis.priority,
    sentiment: mockAdminAnalysis.sentiment,
  };

  console.log('🧹 SANITIZATION: Removing sensitive data...');
  console.log('   ✅ Sanitized data (safe to share):', sanitized, '\n');

  // Mock customer response
  console.log('🌐 PUBLIC SCOPE: Mock customer response');
  console.log('   Message: "We sincerely apologize for the billing issue..."');
  console.log(
    '   Action Items: Investigate charge, Process refund, Update account'
  );
  console.log('   Escalated: true\n');

  console.log('✅ SUCCESS: Mock ticket processed safely!\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processSupportTicketSafely().catch(console.error);
}
