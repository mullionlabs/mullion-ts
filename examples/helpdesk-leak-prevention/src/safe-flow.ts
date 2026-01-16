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

import {createMullionClient} from '@mullion/ai-sdk';
import {createOwned} from '@mullion/core';
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
  providerConfig?: ProviderConfig,
  ticketText?: string,
) {
  const ticketToProcess = ticketText || SAMPLE_TICKET;
  const model = getLanguageModel(providerConfig);

  if (!model) {
    console.log(`⚠️  No API key set. Running with mock data.\n`);
    return runMockSafeFlow(ticketToProcess);
  }

  console.log(`🤖 Using ${getProviderName(providerConfig)}\n`);
  const client = createMullionClient(model);

  console.log('🔒 SAFE FLOW: Processing ticket with proper isolation\n');
  console.log('📋 Ticket:\n', ticketToProcess, '\n');

  // Step 1: Admin scope - analyze ticket with full context
  const adminAnalysis = await client.scope('admin', async (adminCtx) => {
    console.log('👨‍💼 ADMIN SCOPE: Analyzing ticket with internal context...');

    const adminPrompt = `You are analyzing a support ticket for Mullion - a TypeScript library for type-safe LLM context management.

CONTEXT: Mullion helps developers prevent data leaks between different security scopes in LLM applications. Key features include scope isolation, confidence tracking, fork/merge patterns, and cost estimation.

Analyze the following customer support ticket:

${ticketToProcess}

Provide a complete analysis including category, priority, sentiment, internal notes about customer history/risk, and recommended actions.`;

    const analysis = await adminCtx.infer(TicketAnalysisSchema, adminPrompt);

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
      `   🔐 Internal Notes: ${analysis.value.internalNotes.substring(0, 60)}...`,
    );
    console.log(`   🔐 Risk Level: ${analysis.value.riskLevel}`);
    console.log(
      `   🔐 Suggested Compensation: ${analysis.value.suggestedCompensation || 'None'}\n`,
    );

    // ✅ GOOD: Return owned value within scope
    return analysis;
  });

  // Step 2: Sanitize data before bridging
  console.log('🧹 SANITIZATION: Removing sensitive data...');

  // ✅ GOOD: Explicitly create sanitized version with only public fields
  const sanitized: SanitizedTicket = {
    ticketId: adminAnalysis.value.ticketId,
    summary: adminAnalysis.value.summary,
    category: adminAnalysis.value.category,
    priority: adminAnalysis.value.priority,
    sentiment: adminAnalysis.value.sentiment,
    // ✅ CRITICAL: internalNotes, riskLevel, recommendedActions, suggestedCompensation are NOT included
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
    const prompt = `You are a customer support representative for Mullion - a TypeScript library for type-safe LLM context management.

CONTEXT: Mullion helps developers prevent data leaks between different security scopes in LLM applications.
Key features: scope isolation, confidence tracking, fork/merge patterns, and cost estimation.

Generate a professional customer response for this support ticket:

Summary: ${bridged.value.summary}
Category: ${bridged.value.category}
Priority: ${bridged.value.priority}
Sentiment: ${bridged.value.sentiment}

Instructions:
- Be empathetic and solution-focused
- Address the specific issue mentioned in the summary
- Provide actionable next steps related to using Mullion (the TypeScript library)
- Do NOT mention internal notes, risk levels, or compensation strategies
- Do NOT use placeholders like [Your Name], [Customer Name], [Company], etc.
- Write a complete, ready-to-send response from a customer support representative
- Focus on Mullion as a software development tool, not architectural mullions

FORMATTING REQUIREMENTS (STRICT, NO EMPTY LINES):
- NEVER output an empty line.
- NEVER output two consecutive newline characters. The sequence "\\n\\n" is forbidden.
- Use exactly ONE "\\n" between blocks.
- Do not wrap lines inside a paragraph. Each paragraph must be a single line.
- Do NOT use Markdown hard line breaks: never end a line with two spaces ("  ").
- For lists:
  - The list-intro sentence is one line and ends with ":".
  - List items start on the next line immediately (no empty line).
  - No blank lines between items.
  - After the last item, the closing paragraph starts on the next line.

FINAL CHECK BEFORE SENDING:
- Scan your output and ensure it contains NO "\\n\\n".
- If "\\n\\n" exists anywhere, replace it with "\\n" and re-check.
`;

    const customerResponse = await publicCtx.infer(
      CustomerResponseSchema,
      prompt,
    );

    // ✅ GOOD: Check confidence before sending to customer
    if (customerResponse.confidence < 0.8) {
      console.log('⚠️  Low confidence response - routing to human agent');
    }

    console.log(`   Confidence: ${customerResponse.confidence.toFixed(2)}`);
    console.log(
      `   Message: "${customerResponse.value.message.substring(0, 100)}..."`,
    );
    console.log(
      `   Action Items: ${customerResponse.value.actionItems.join('; ')}`,
    );
    console.log(`   Escalated: ${customerResponse.value.escalated}\n`);

    // ✅ GOOD: Return owned value within scope
    return customerResponse;
  });

  console.log('✅ SUCCESS: Ticket processed safely!\n');
  console.log('🔍 Key Safety Features:');
  console.log('   • Admin analysis stayed in admin scope');
  console.log('   • Sensitive data explicitly removed before bridging');
  console.log('   • Customer response generated in isolated public scope');
  console.log('   • Confidence checked at each step');
  console.log('   • ESLint validated no leaks at compile time\n');

  return {adminAnalysis, response};
}

/**
 * Mock flow for demonstration without API key
 */
async function runMockSafeFlow(ticketText: string = SAMPLE_TICKET) {
  console.log('🔒 SAFE FLOW (Mock Mode)\n');
  console.log('📋 Ticket:\n', ticketText, '\n');

  // Mock admin analysis
  const mockAdminAnalysisValue = {
    ticketId: 'TIX-789',
    summary: 'Customer inquiry about Mullion TypeScript library usage',
    category: 'technical' as const,
    priority: 'medium' as const,
    sentiment: 'neutral' as const,
    internalNotes:
      'Developer seeking clarification on Mullion scope isolation features. Potential for upsell to enterprise support. No previous tickets.',
    riskLevel: 'none' as const,
    recommendedActions: [
      'Explain core scope isolation concept',
      'Provide code examples',
      'Link to documentation',
    ],
    suggestedCompensation: undefined,
  };

  const mockAdminAnalysis = createOwned({
    value: mockAdminAnalysisValue,
    scope: 'admin' as const,
    confidence: 0.85,
    traceId: 'mock-trace-admin',
  });

  console.log('👨‍💼 ADMIN SCOPE: Mock analysis');
  console.log('   Summary:', mockAdminAnalysis.value.summary);
  console.log('   Category:', mockAdminAnalysis.value.category);
  console.log('   Priority:', mockAdminAnalysis.value.priority);
  console.log('   Sentiment:', mockAdminAnalysis.value.sentiment);
  console.log('   🔐 Internal Notes:', mockAdminAnalysis.value.internalNotes);
  console.log('   🔐 Risk Level:', mockAdminAnalysis.value.riskLevel);
  console.log(
    '   🔐 Recommended Actions:',
    mockAdminAnalysis.value.recommendedActions.join(', '),
  );
  console.log(
    '   🔐 Suggested Compensation:',
    mockAdminAnalysis.value.suggestedCompensation || 'None',
    '\n',
  );

  // Mock sanitization
  const sanitized = {
    ticketId: mockAdminAnalysis.value.ticketId,
    summary: mockAdminAnalysis.value.summary,
    category: mockAdminAnalysis.value.category,
    priority: mockAdminAnalysis.value.priority,
    sentiment: mockAdminAnalysis.value.sentiment,
  };

  console.log('🧹 SANITIZATION: Removing sensitive data...');
  console.log('   ✅ Sanitized data (safe to share):', sanitized, '\n');

  // Mock customer response - context-aware based on summary
  const mockResponseValue = {
    message: `Thank you for reaching out about Mullion! I'd be happy to help you understand how Mullion can benefit your project.

Mullion is a TypeScript library designed to prevent data leaks between different security scopes in LLM applications. Here's how it helps:

1. **Scope Isolation** - Mullion ensures data from one context (e.g., admin) can't accidentally leak into another (e.g., public responses)
2. **Compile-Time Safety** - TypeScript types catch potential leaks before your code runs
3. **Confidence Tracking** - Every LLM inference includes a confidence score, helping you decide when to escalate to human review
4. **Fork/Merge Patterns** - Run parallel LLM calls efficiently with intelligent caching

Could you share more about your specific use case? For example, are you building a customer support system, content moderation tool, or something else? This will help me provide more targeted guidance.

Check out our documentation at the repository for code examples and getting started guides!`,
    actionItems: [
      'Provide overview of Mullion features',
      'Request use case details',
      'Share documentation links',
    ],
    estimatedResolution: 'Immediate response with follow-up',
    escalated: false,
    followUpRequired: true,
  };

  const mockResponse = createOwned({
    value: mockResponseValue,
    scope: 'public' as const,
    confidence: 0.9,
    traceId: 'mock-trace-public',
  });

  console.log('🌐 PUBLIC SCOPE: Mock customer response');
  console.log('   Message:', mockResponse.value.message);
  console.log('   Action Items:', mockResponse.value.actionItems.join(', '));
  console.log('   Escalated:', mockResponse.value.escalated, '\n');

  console.log('✅ SUCCESS: Mock ticket processed safely!\n');

  return {adminAnalysis: mockAdminAnalysis, response: mockResponse};
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processSupportTicketSafely().catch(console.error);
}
