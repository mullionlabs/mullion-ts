/**
 * BAD EXAMPLE: Context Leaks
 *
 * This file intentionally contains context leaks that should be caught by
 * the ESLint plugin. Run `npm run lint` to see the violations.
 *
 * ⚠️  DO NOT USE THIS CODE IN PRODUCTION
 * This is for demonstration purposes only.
 */

import { createScopeStackClient } from '@scopestack/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const Schema = z.object({
  data: z.string(),
  classification: z.enum(['public', 'private', 'confidential']),
});

// Mock client for demonstration
const client = createScopeStackClient(openai('gpt-4'));

export async function demonstrateContextLeaks() {
  let leakedData; // This will hold data from admin scope

  // ❌ BAD: Context leak #1 - storing Owned value outside its scope
  await client.scope('admin', async (ctx) => {
    const adminData = await ctx.infer(Schema, 'Confidential admin information');

    // ESLint should flag this - storing scoped value in outer variable
    leakedData = adminData;

    return adminData.value;
  });

  // ❌ BAD: Context leak #2 - using leaked data in different scope
  await client.scope('public', async (ctx) => {
    // ESLint should flag this - using value from different scope without bridging
    console.log('Leaked data:', leakedData.value);

    // This should also be flagged - no confidence check
    return leakedData.value;
  });

  // ❌ BAD: Context leak #3 - cross-scope usage without bridge
  await client.scope('scope-a', async (ctxA) => {
    const dataA = await ctxA.infer(Schema, 'Data from scope A');

    await client.scope('scope-b', async (ctxB) => {
      // ESLint should flag this - using dataA in scope-b without bridging
      console.log('Cross-scope usage:', dataA.value);
      return ctxB.use(dataA); // This should also be flagged
    });

    return dataA.value;
  });

  // ❌ BAD: No confidence checking
  await client.scope('no-confidence-check', async (ctx) => {
    const result = await ctx.infer(Schema, 'Some uncertain data');

    // ESLint should warn - using result.value without checking confidence
    if (result.value.classification === 'confidential') {
      console.log('Processing confidential data without confidence check');
    }

    return result.value;
  });
}

// ❌ BAD: More complex leak scenario
export async function complexLeak() {
  const results = [];

  await client.scope('collector', async (ctx) => {
    const data1 = await ctx.infer(Schema, 'First dataset');
    const data2 = await ctx.infer(Schema, 'Second dataset');

    // ESLint should flag - storing scoped values in array outside scope
    results.push(data1, data2);

    return 'collected';
  });

  // ESLint should flag - using collected scoped values outside their scope
  await client.scope('processor', async (ctx) => {
    for (const result of results) {
      console.log('Processing:', result.value);
    }
    return 'processed';
  });
}

// ✅ GOOD: Properly bridged example for comparison
export async function goodExample() {
  await client.scope('admin', async (adminCtx) => {
    const adminData = await adminCtx.infer(Schema, 'Admin information');

    // Check confidence before using
    if (adminData.confidence < 0.8) {
      throw new Error('Low confidence data');
    }

    await client.scope('public', async (publicCtx) => {
      // ✅ GOOD: Explicitly bridge data between scopes
      const bridged = publicCtx.bridge(adminData);

      console.log('Properly bridged data:', bridged.value);
      return publicCtx.use(bridged);
    });

    return adminCtx.use(adminData);
  });
}
