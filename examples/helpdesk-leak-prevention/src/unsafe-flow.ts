/**
 * UNSAFE FLOW: Intentional Context Leaks for ESLint Detection
 *
 * ⚠️  WARNING: This code contains INTENTIONAL security vulnerabilities
 * to demonstrate how Mullion's ESLint plugin catches context leaks
 * at compile time.
 *
 * ❌ DO NOT USE THIS CODE IN PRODUCTION
 *
 * Run `npm run lint` to see ESLint catch these violations:
 * - @mullion/no-context-leak: Detects data flowing between scopes without bridge
 * - @mullion/require-confidence-check: Warns about using data without confidence checks
 */

import {createMullionClient} from '@mullion/ai-sdk';
import type {Owned} from '@mullion/core';
import {
  TicketAnalysisSchema,
  CustomerResponseSchema,
  type TicketAnalysis,
} from './schemas.js';
import {
  getLanguageModel,
  getProviderName,
  type ProviderConfig,
} from './provider.js';

const SAMPLE_TICKET = `
Customer: Jane Doe (ID: CUST-12345)
Subject: Billing Issue

I noticed charges on my account for $299.99 that I never authorized.
This is the third billing issue and I'm extremely frustrated.
`;

/**
 * ❌ UNSAFE: Context Leak #1 - Storing scoped value in outer variable
 */
export async function contextLeakOuterScope(providerConfig?: ProviderConfig) {
  const model = getLanguageModel(providerConfig);
  if (!model) {
    console.log('⚠️  No API key set. This demo requires a real provider.');
    return;
  }

  const client = createMullionClient(model);

  // This variable will hold admin-scoped data
  let leakedAnalysis: Owned<TicketAnalysis, 'admin'>;

  await client.scope('admin', async (adminCtx) => {
    const analysis = await adminCtx.infer(TicketAnalysisSchema, SAMPLE_TICKET);

    // ❌ ESLint ERROR: Storing scoped value outside its scope
    // @mullion/no-context-leak should flag this
    leakedAnalysis = analysis;

    return analysis;
  });

  // ❌ ESLint ERROR: Using leaked data outside its scope
  // @mullion/no-context-leak should flag this
  console.log('LEAKED Internal Notes:', leakedAnalysis!.value.internalNotes);

  return leakedAnalysis!;
}

/**
 * ❌ UNSAFE: Context Leak #2 - Using data in different scope without bridge
 */
export async function contextLeakCrossScope(providerConfig?: ProviderConfig) {
  const model = getLanguageModel(providerConfig);
  if (!model) {
    console.log('⚠️  No API key set. This demo requires a real provider.');
    return;
  }

  const client = createMullionClient(model);

  const adminAnalysis = await client.scope('admin', async (adminCtx) => {
    const analysis = await adminCtx.infer(TicketAnalysisSchema, SAMPLE_TICKET);
    return analysis;
  });

  await client.scope('public', async (publicCtx) => {
    // ❌ ESLint ERROR: Using admin-scoped data in public scope without bridge
    // @mullion/no-context-leak should flag this
    const prompt = `Create response based on: ${adminAnalysis.value.internalNotes}`;

    // ❌ CRITICAL LEAK: Internal admin notes included in customer response!
    const response = await publicCtx.infer(CustomerResponseSchema, prompt);

    // ❌ ESLint WARNING: No confidence check
    // @mullion/require-confidence-check should warn
    return response;
  });
}

/**
 * ❌ UNSAFE: Context Leak #3 - Direct value access without bridge
 */
export async function directValueAccessLeak(providerConfig?: ProviderConfig) {
  const model = getLanguageModel(providerConfig);
  if (!model) {
    console.log('⚠️  No API key set. This demo requires a real provider.');
    return;
  }

  const client = createMullionClient(model);

  const adminData = await client.scope('admin', async (adminCtx) => {
    return await adminCtx.infer(TicketAnalysisSchema, SAMPLE_TICKET);
  });

  await client.scope('public', async (publicCtx) => {
    // ❌ ESLint ERROR: Accessing .value without bridging
    // @mullion/no-context-leak should flag this
    console.log('Sending to customer:', adminData.value.suggestedCompensation);

    // ❌ ESLint ERROR: Using data from wrong scope
    // @mullion/no-context-leak should flag this
    const leaked = publicCtx.use(adminData);

    return leaked;
  });
}

/**
 * ❌ UNSAFE: No confidence checking
 */
export async function noConfidenceCheck(providerConfig?: ProviderConfig) {
  const model = getLanguageModel(providerConfig);
  if (!model) {
    console.log('⚠️  No API key set. This demo requires a real provider.');
    return;
  }

  const client = createMullionClient(model);

  await client.scope('admin', async (adminCtx) => {
    const analysis = await adminCtx.infer(TicketAnalysisSchema, SAMPLE_TICKET);

    // ❌ ESLint WARNING: Using value without checking confidence
    // @mullion/require-confidence-check should warn
    if (analysis.value.riskLevel === 'high') {
      console.log('High risk customer!');
    }

    // ❌ ESLint WARNING: Returning value without confidence check
    // @mullion/require-confidence-check should warn
    return analysis.value;
  });
}

/**
 * ❌ UNSAFE: Array collection leak
 */
export async function arrayCollectionLeak(providerConfig?: ProviderConfig) {
  const model = getLanguageModel(providerConfig);
  if (!model) {
    console.log('⚠️  No API key set. This demo requires a real provider.');
    return;
  }

  const client = createMullionClient(model);

  // Array in outer scope
  const leakedData: Array<Owned<TicketAnalysis, 'admin'>> = [];

  await client.scope('admin', async (adminCtx) => {
    const analysis1 = await adminCtx.infer(TicketAnalysisSchema, SAMPLE_TICKET);
    const analysis2 = await adminCtx.infer(TicketAnalysisSchema, SAMPLE_TICKET);

    // ❌ ESLint ERROR: Storing scoped values in outer array
    // @mullion/no-context-leak should flag this
    leakedData.push(analysis1, analysis2);

    return 'collected';
  });

  // ❌ ESLint ERROR: Using leaked array in different scope
  // @mullion/no-context-leak should flag this
  await client.scope('public', async (publicCtx) => {
    for (const data of leakedData) {
      console.log('Processing leaked:', data.value.internalNotes);
    }
    return 'processed';
  });
}

/**
 * ❌ UNSAFE: Return value leak
 */
export async function returnValueLeak(providerConfig?: ProviderConfig) {
  const model = getLanguageModel(providerConfig);
  if (!model) {
    console.log('⚠️  No API key set. This demo requires a real provider.');
    return;
  }

  const client = createMullionClient(model);

  // ❌ ESLint ERROR: Returning scoped value from scope callback
  // @mullion/no-context-leak should flag this
  const leaked = await client.scope('admin', async (adminCtx) => {
    const analysis = await adminCtx.infer(TicketAnalysisSchema, SAMPLE_TICKET);

    // ❌ Wrong: Should use adminCtx.use(analysis)
    // This returns the Owned value, leaking it outside the scope
    return analysis; // ESLint should flag this
  });

  // ❌ Now the admin-scoped data is accessible outside the scope
  console.log('Leaked outside scope:', leaked.value.internalNotes);
}

/**
 * ❌ UNSAFE: Complete unsafe flow (all violations together)
 */
export async function completeUnsafeFlow(providerConfig?: ProviderConfig) {
  const model = getLanguageModel(providerConfig);

  if (!model) {
    console.log('⚠️  This is the UNSAFE flow - intentionally broken!');
    console.log('Run `npm run lint` to see ESLint catch these violations.');
    console.log('Note: This demo requires a real API key to run.\n');
    return;
  }

  console.log(`🤖 Using ${getProviderName(providerConfig)}\n`);
  const client = createMullionClient(model);

  console.log('❌ UNSAFE FLOW: Processing ticket WITHOUT proper isolation\n');
  console.log('📋 Ticket:\n', SAMPLE_TICKET, '\n');

  // ❌ Leak 1: Store scoped data in outer variable
  let adminAnalysis: Owned<TicketAnalysis, 'admin'>;

  await client.scope('admin', async (adminCtx) => {
    console.log('👨‍💼 ADMIN SCOPE: Analyzing ticket...');

    const analysis = await adminCtx.infer(TicketAnalysisSchema, SAMPLE_TICKET);

    // ❌ ESLint ERROR: Storing scoped value outside scope
    adminAnalysis = analysis;

    // ❌ ESLint WARNING: No confidence check
    console.log(`   Internal Notes: ${analysis.value.internalNotes}`);

    return analysis;
  });

  await client.scope('public', async (publicCtx) => {
    console.log('🌐 PUBLIC SCOPE: Generating response...\n');

    // ❌ CRITICAL LEAK: Using admin data directly without bridging
    // This includes internal notes in the customer response!
    const prompt = `Generate response for ticket. Context: ${adminAnalysis!.value.internalNotes}. Compensation: ${adminAnalysis!.value.suggestedCompensation}`;

    const response = await publicCtx.infer(CustomerResponseSchema, prompt);

    // ❌ ESLint WARNING: No confidence check
    console.log(`   Response: "${response.value.message}"`);

    return response;
  });

  console.log('\n❌ DANGER: This flow has MULTIPLE security vulnerabilities!');
  console.log('   • Admin data leaked to outer scope');
  console.log('   • Internal notes exposed to customer response generation');
  console.log('   • No confidence checks performed');
  console.log('   • No explicit bridging or sanitization');
  console.log('\nRun `npm run lint` to see ESLint catch these issues!\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  completeUnsafeFlow().catch(console.error);
}
