# AI SDK Integration Test Instructions

This document provides instructions for manually testing the @mullion/ai-sdk package with real API providers to complete **Task 5.3** from the TODO.

## Prerequisites

### 1. Install Dependencies

Ensure the project is properly set up:

```bash
pnpm install
pnpm build
```

### 2. API Keys Setup

You'll need API keys for at least one of these providers:

#### OpenAI (Recommended)

```bash
export OPENAI_API_KEY="sk-proj-..."
```

#### Anthropic

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

#### Google Gemini

```bash
export GOOGLE_GENERATIVE_AI_API_KEY="AI..."
```

### 3. Install AI SDK Providers

```bash
# For OpenAI
pnpm add @ai-sdk/openai

# For Anthropic
pnpm add @ai-sdk/anthropic

# For Google
pnpm add @ai-sdk/google
```

## Test Scenarios

### Test 1: Basic Inference with OpenAI

Create a test file `test-openai.js` in the project root:

```javascript
import { createMullionClient } from '@mullion/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Schema for testing
const EmailSchema = z.object({
  subject: z.string().describe('The email subject line'),
  category: z.enum(['support', 'sales', 'feedback']).describe('Email category'),
  priority: z.enum(['low', 'medium', 'high']).describe('Priority level'),
  sentiment: z
    .enum(['positive', 'negative', 'neutral'])
    .describe('Overall sentiment'),
});

const testInput = `
Subject: Billing Issue - Urgent Help Needed
Hi there, I'm having trouble with my last invoice.
The charges seem incorrect and I need this resolved ASAP.
Can someone please help me understand what went wrong?
`;

async function testOpenAI() {
  console.log('🧪 Testing OpenAI Integration...\n');

  const client = createMullionClient(openai('gpt-4'));

  try {
    const result = await client.scope('email-processing', async (ctx) => {
      const email = await ctx.infer(EmailSchema, testInput);

      console.log('📧 Inferred Email Data:');
      console.log('  Subject:', email.value.subject);
      console.log('  Category:', email.value.category);
      console.log('  Priority:', email.value.priority);
      console.log('  Sentiment:', email.value.sentiment);
      console.log('  Confidence:', email.confidence);
      console.log('  Scope:', email.__scope);
      console.log('  Trace ID:', email.traceId);

      // Test confidence checking
      if (email.confidence < 0.7) {
        console.log('⚠️  Low confidence detected, flagging for review');
      }

      return ctx.use(email);
    });

    console.log('\n✅ OpenAI test completed successfully');
    console.log('Final result:', result);
  } catch (error) {
    console.error('❌ OpenAI test failed:', error.message);
    throw error;
  }
}

// Run the test
testOpenAI().catch(console.error);
```

**Expected Results:**

- ✅ Email data extracted correctly
- ✅ Confidence score between 0.3-1.0
- ✅ Scope properly tagged as 'email-processing'
- ✅ Trace ID generated
- ✅ No runtime errors

### Test 2: Anthropic Integration

Create `test-anthropic.js`:

```javascript
import { createMullionClient } from '@mullion/ai-sdk';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const ProductReviewSchema = z.object({
  rating: z.number().min(1).max(5).describe('Star rating 1-5'),
  pros: z.array(z.string()).describe('Positive aspects'),
  cons: z.array(z.string()).describe('Negative aspects'),
  recommended: z.boolean().describe('Would recommend this product'),
});

const reviewText = `
This coffee maker is absolutely fantastic! The brew quality is exceptional and it's super easy to use.
The programmable timer is a game-changer for my morning routine.
My only complaint is that it's a bit loud when brewing and takes up quite a bit of counter space.
Overall, definitely worth the investment. 5 stars!
`;

async function testAnthropic() {
  console.log('🧪 Testing Anthropic Integration...\n');

  const client = createMullionClient(anthropic('claude-3-5-sonnet-20241022'));

  try {
    const result = await client.scope('review-analysis', async (ctx) => {
      const review = await ctx.infer(ProductReviewSchema, reviewText);

      console.log('⭐ Product Review Analysis:');
      console.log('  Rating:', review.value.rating);
      console.log('  Pros:', review.value.pros);
      console.log('  Cons:', review.value.cons);
      console.log('  Recommended:', review.value.recommended);
      console.log('  Confidence:', review.confidence);
      console.log('  Scope:', review.__scope);

      return ctx.use(review);
    });

    console.log('\n✅ Anthropic test completed successfully');
  } catch (error) {
    console.error('❌ Anthropic test failed:', error.message);
    throw error;
  }
}

// Run the test
testAnthropic().catch(console.error);
```

### Test 3: Scope Bridging Test

Create `test-bridging.js`:

```javascript
import { createMullionClient } from '@mullion/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const DataSchema = z.object({
  content: z.string(),
  classification: z.enum(['public', 'internal', 'confidential']),
});

const ProcessedSchema = z.object({
  summary: z.string(),
  action_needed: z.boolean(),
});

async function testScopeBridging() {
  console.log('🧪 Testing Scope Bridging...\n');

  const client = createMullionClient(openai('gpt-4'));

  try {
    const result = await client.scope('admin', async (adminCtx) => {
      // Admin scope processes raw data
      const adminData = await adminCtx.infer(
        DataSchema,
        'Internal memo: Please review Q4 budget allocation for the marketing team.'
      );

      console.log(
        '🔒 Admin Scope - Data classified as:',
        adminData.value.classification
      );
      console.log('   Confidence:', adminData.confidence);

      // Bridge to processing scope
      return await client.scope('processing', async (processCtx) => {
        console.log('🌉 Bridging data between scopes...');

        // Must explicitly bridge to use admin data
        const bridged = processCtx.bridge(adminData);
        console.log('   Bridged scope type:', bridged.__scope); // Should show union type

        // Process the bridged data
        const processed = await processCtx.infer(
          ProcessedSchema,
          `Summarize this: ${bridged.value.content}`
        );

        console.log('⚙️  Processing Scope - Summary:', processed.value.summary);
        console.log('   Action needed:', processed.value.action_needed);

        return {
          original: processCtx.use(bridged),
          processed: processCtx.use(processed),
        };
      });
    });

    console.log('\n✅ Scope bridging test completed successfully');
  } catch (error) {
    console.error('❌ Scope bridging test failed:', error.message);
    throw error;
  }
}

// Run the test
testScopeBridging().catch(console.error);
```

### Test 4: Error Handling & Edge Cases

Create `test-edge-cases.js`:

```javascript
import { createMullionClient } from '@mullion/ai-sdk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const StrictSchema = z.object({
  number: z.number().min(1).max(10),
  enum_value: z.enum(['A', 'B', 'C']),
});

async function testEdgeCases() {
  console.log('🧪 Testing Edge Cases...\n');

  const client = createMullionClient(openai('gpt-4'));

  // Test 1: Invalid input that might cause low confidence
  console.log('Test 1: Ambiguous input...');
  try {
    await client.scope('test-ambiguous', async (ctx) => {
      const result = await ctx.infer(
        StrictSchema,
        'Maybe something between 5 and 7, probably B or C'
      );
      console.log('  Result:', result.value);
      console.log('  Confidence:', result.confidence);

      if (result.confidence < 0.5) {
        console.log('  ⚠️  Low confidence as expected');
      }

      return ctx.use(result);
    });
    console.log('  ✅ Ambiguous input handled correctly\n');
  } catch (error) {
    console.log('  ✅ Error handling worked:', error.message, '\n');
  }

  // Test 2: Scope mismatch error
  console.log('Test 2: Scope mismatch protection...');
  try {
    let leaked;

    await client.scope('scope-a', async (ctxA) => {
      leaked = await ctxA.infer(z.string(), 'test data');
      return 'done';
    });

    await client.scope('scope-b', async (ctxB) => {
      // This should throw an error - using value from different scope without bridging
      return ctxB.use(leaked); // Should fail!
    });

    console.log('  ❌ Scope protection failed - this should not happen');
  } catch (error) {
    console.log('  ✅ Scope mismatch correctly caught:', error.message, '\n');
  }

  // Test 3: Different confidence levels based on finish reasons
  console.log('Test 3: Confidence extraction testing...');
  try {
    await client.scope('confidence-test', async (ctx) => {
      const result = await ctx.infer(
        z.object({
          text: z.string().describe('A very long detailed response'),
        }),
        'Give me a detailed explanation'
      );

      console.log('  Confidence from finish reason:', result.confidence);
      console.log('  ✅ Confidence extraction working\n');

      return ctx.use(result);
    });
  } catch (error) {
    console.log('  ❌ Confidence test failed:', error.message, '\n');
  }

  console.log('✅ Edge case testing completed');
}

// Run the test
testEdgeCases().catch(console.error);
```

## Running the Tests

### Step-by-Step Execution

1. **Set up environment:**

   ```bash
   export OPENAI_API_KEY="your-key-here"
   ```

2. **Run each test:**

   ```bash
   node test-openai.js
   node test-anthropic.js  # if you have Anthropic key
   node test-bridging.js
   node test-edge-cases.js
   ```

3. **Run all tests:**
   ```bash
   # Create a test runner
   node -e "
   import('./test-openai.js').then(() =>
   import('./test-anthropic.js')).then(() =>
   import('./test-bridging.js')).then(() =>
   import('./test-edge-cases.js'))
   .then(() => console.log('🎉 All integration tests passed!'))
   .catch(err => { console.error('💥 Tests failed:', err); process.exit(1); })
   "
   ```

## Success Criteria

Mark Task 5.3 complete when ALL of these work:

### ✅ Basic Functionality

- [ ] Client creates successfully with real provider
- [ ] `infer()` returns properly structured `Owned<T, S>` values
- [ ] Confidence scores are reasonable (0.3-1.0 range)
- [ ] Trace IDs are unique and properly formatted

### ✅ Type Safety

- [ ] TypeScript compilation passes
- [ ] Scope types are correctly inferred (literal string types)
- [ ] `use()` method enforces scope boundaries at runtime

### ✅ Integration Features

- [ ] Multiple providers work (OpenAI, Anthropic, etc.)
- [ ] Scope bridging preserves data and combines scope types
- [ ] Error handling works for invalid inputs and scope mismatches

### ✅ Confidence System

- [ ] Different finish reasons produce different confidence scores
- [ ] `stop` reason gives confidence = 1.0
- [ ] `length` reason gives confidence = 0.75
- [ ] `error` reason gives confidence = 0.3

### ✅ Real-world Scenarios

- [ ] Complex schemas work (nested objects, arrays, enums)
- [ ] Large text inputs are handled correctly
- [ ] Edge cases don't crash the system

## Troubleshooting

### Common Issues

1. **"Model not found" errors:**
   - Check API key is valid and has access to the specified model
   - Try a different model (e.g., `gpt-3.5-turbo` instead of `gpt-4`)

2. **Type errors:**
   - Ensure `@mullion/core` is built: `pnpm --filter @mullion/core build`
   - Check TypeScript version compatibility

3. **Network/API errors:**
   - Check internet connection
   - Verify API key permissions and quota
   - Try with a simpler prompt first

4. **Low confidence scores:**
   - This is expected for ambiguous inputs
   - Try more specific prompts
   - Check if the schema is too restrictive

### Debug Commands

```bash
# Check build status
pnpm --filter @mullion/ai-sdk build
pnpm --filter @mullion/ai-sdk typecheck

# Run existing unit tests
pnpm --filter @mullion/ai-sdk test

# Check dependencies
pnpm list ai zod @ai-sdk/openai
```

## Completion Checklist

When all tests pass, update TODO.md:

```markdown
### 5.3 Tests

- [x] Mock provider tests
- [x] Integration test with real API (manual) ✅ COMPLETED
```
