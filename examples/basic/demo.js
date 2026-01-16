#!/usr/bin/env node

/**
 * Mullion Basic Demo
 *
 * This demo showcases the core concepts of Mullion:
 * 1. Scoped execution contexts
 * 2. Owned values with confidence tracking
 * 3. Safe bridging between scopes
 * 4. Type-safe LLM integration
 */

import {createMullionClient} from '@mullion/ai-sdk';
import {openai} from '@ai-sdk/openai';
import {z} from 'zod';
import {createOwned} from '@mullion/core';

// Schemas for our demo
const UserQuerySchema = z.object({
  intent: z
    .enum(['support', 'sales', 'billing', 'general'])
    .describe("User's primary intent"),
  urgency: z
    .enum(['low', 'medium', 'high'])
    .describe('How urgent this query is'),
  entities: z
    .array(z.string())
    .describe('Key entities mentioned (products, dates, amounts)'),
});

const ResponseSchema = z.object({
  message: z.string().describe('Response message to the user'),
  followUp: z.array(z.string()).describe('Suggested follow-up questions'),
  escalate: z.boolean().describe('Whether this needs human escalation'),
});

console.log('🚀 Mullion Basic Demo\n');

async function runDemo() {
  // Check if we have an API key
  if (!process.env.OPENAI_API_KEY) {
    console.log(
      '⚠️  No OPENAI_API_KEY found. Running with mock data instead.\n',
    );
    return runMockDemo();
  }

  console.log('🤖 Running with OpenAI API integration\n');
  const client = createMullionClient(openai('gpt-4'));

  const userInput =
    "Hi, I'm having trouble with my billing. My last invoice shows charges I don't recognize and I need this fixed urgently!";

  try {
    // Step 1: Process user query in "intake" scope
    const analysis = await client.scope('intake', async (ctx) => {
      console.log('📥 INTAKE SCOPE: Analyzing user query...');

      const query = await ctx.infer(UserQuerySchema, userInput);

      console.log(`   Intent: ${query.value.intent}`);
      console.log(`   Urgency: ${query.value.urgency}`);
      console.log(`   Entities: ${query.value.entities.join(', ')}`);
      console.log(`   Confidence: ${query.confidence.toFixed(2)}\n`);

      // Demonstrate confidence checking
      if (query.confidence < 0.7) {
        console.log(
          '⚠️  Low confidence detected - flagging for human review\n',
        );
      }

      return ctx.use(query);
    });

    // Step 2: Generate response in "support" scope, bridging data
    const response = await client.scope('support', async (ctx) => {
      console.log('🛠️  SUPPORT SCOPE: Generating response...');

      // Create a mock owned value to demonstrate bridging
      const supportContext = createOwned({
        value: {department: 'billing', agent: 'AI Assistant'},
        scope: 'support',
        confidence: 1.0,
        traceId: 'support-ctx-001',
      });

      // Bridge the analysis from intake scope to support scope
      const bridgedAnalysis = ctx.bridge(analysis);
      console.log(`   Bridged analysis scope: ${bridgedAnalysis.__scope}`);

      const responseData = await ctx.infer(
        ResponseSchema,
        `Based on this user query analysis: ${JSON.stringify(bridgedAnalysis.value)}, generate a helpful response for a ${supportContext.value.department} issue.`,
      );

      console.log(`   Response: "${responseData.value.message}"`);
      console.log(`   Follow-up: ${responseData.value.followUp.join('; ')}`);
      console.log(`   Escalate: ${responseData.value.escalate}`);
      console.log(`   Confidence: ${responseData.confidence.toFixed(2)}\n`);

      return ctx.use(responseData);
    });

    console.log('✅ Demo completed successfully!');
    console.log('💡 Key concepts demonstrated:');
    console.log('   • Scoped execution (intake → support)');
    console.log('   • Owned values with confidence tracking');
    console.log('   • Safe bridging between scopes');
    console.log('   • Type-safe LLM integration\n');
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

async function runMockDemo() {
  console.log('🎭 Running with mock data (no API calls)\n');

  // Create mock owned values to demonstrate concepts
  const mockAnalysis = createOwned({
    value: {
      intent: 'billing',
      urgency: 'high',
      entities: ['invoice', 'charges', 'billing'],
    },
    scope: 'intake',
    confidence: 0.95,
    traceId: 'mock-intake-001',
  });

  const mockResponse = createOwned({
    value: {
      message:
        "I understand you're having billing issues. Let me help you resolve this right away.",
      followUp: [
        'Can you provide your invoice number?',
        'When did you first notice these charges?',
      ],
      escalate: true,
    },
    scope: 'support',
    confidence: 0.88,
    traceId: 'mock-support-001',
  });

  console.log('📥 INTAKE SCOPE: Mock analysis');
  console.log(`   Intent: ${mockAnalysis.value.intent}`);
  console.log(`   Urgency: ${mockAnalysis.value.urgency}`);
  console.log(`   Confidence: ${mockAnalysis.confidence}\n`);

  console.log('🛠️  SUPPORT SCOPE: Mock response');
  console.log(`   Message: "${mockResponse.value.message}"`);
  console.log(`   Escalate: ${mockResponse.value.escalate}`);
  console.log(`   Confidence: ${mockResponse.confidence}\n`);

  console.log('✅ Mock demo completed!');
  console.log(
    '💡 To see full AI integration, set OPENAI_API_KEY and run again.\n',
  );
}

// Run the demo
runDemo().catch(console.error);
