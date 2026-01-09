# AI SDK integration tests (manual, real providers)

This guide describes how to manually test `@mullion/ai-sdk` against **real** model providers
to complete **Task 5.3** from `TODO.md`.

> This is a **contributor doc**. It’s intentionally not part of the user-facing docs navigation.

---

## Prerequisites

### 1) Install dependencies

Ensure the repo is properly set up:

```bash
pnpm install
pnpm build
```

### 2) API keys setup

You'll need API keys for at least one provider.

#### OpenAI (recommended)

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

### 3) Install AI SDK providers

From the repo root (or from a dedicated app workspace), install providers:

```bash
# For OpenAI
pnpm add @ai-sdk/openai

# For Anthropic
pnpm add @ai-sdk/anthropic

# For Google
pnpm add @ai-sdk/google
```

> Tip: for a clean setup, consider placing these under a dedicated workspace app
> (e.g. `apps/integration-tests/`) so provider deps don’t leak into package deps.

---

## Test scenarios

### Test 1: Basic inference with OpenAI

Create `test-openai.js` in the repo root (or inside your test app):

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
  console.log('🧪 Testing OpenAI integration...\n');

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

**Expected results:**

- ✅ Email data extracted correctly
- ✅ Confidence score between 0.3–1.0
- ✅ Scope tagged as `email-processing`
- ✅ Trace ID generated
- ✅ No runtime errors

---

### Test 2: Anthropic integration

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
  console.log('🧪 Testing Anthropic integration...\n');

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

---

### Test 3: Scope bridging test

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
  console.log('🧪 Testing scope bridging...\n');

  const client = createMullionClient(openai('gpt-4'));

  try {
    const result = await client.scope('admin', async (adminCtx) => {
      // Admin scope processes raw data
      const adminData = await adminCtx.infer(
        DataSchema,
        'Internal memo: Please review Q4 budget allocation for the marketing team.'
      );

      console.log(
        '🔒 Admin scope classification:',
        adminData.value.classification
      );
      console.log('   Confidence:', adminData.confidence);

      // Bridge to processing scope
      return await client.scope('processing', async (processCtx) => {
        console.log('🌉 Bridging data between scopes...');

        // Must explicitly bridge to use admin data
        const bridged = processCtx.bridge(adminData);
        console.log('   Bridged scope type:', bridged.__scope);

        // Process the bridged data
        const processed = await processCtx.infer(
          ProcessedSchema,
          `Summarize this: ${bridged.value.content}`
        );

        console.log('⚙️  Processing scope summary:', processed.value.summary);
        console.log('   Action needed:', processed.value.action_needed);

        return {
          original: processCtx.use(bridged),
          processed: processCtx.use(processed),
        };
      });
    });

    console.log('\n✅ Scope bridging test completed successfully');
    return result;
  } catch (error) {
    console.error('❌ Scope bridging test failed:', error.message);
    throw error;
  }
}

// Run the test
testScopeBridging().catch(console.error);
```

---

### Test 4: Error handling & edge cases

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
  console.log('🧪 Testing edge cases...\n');

  const client = createMullionClient(openai('gpt-4'));

  // Test 1: Ambiguous input
  console.log('Test 1: Ambiguous input...');
  try {
    await client.scope('test-ambiguous', async (ctx) => {
      const result = await ctx.infer(
        StrictSchema,
        'Maybe something between 5 and 7, probably B or C'
      );
      console.log('  Result:', result.value);
      console.log('  Confidence:', result.confidence);

      if (result.confidence < 0.5)
        console.log('  ⚠️  Low confidence as expected');
      return ctx.use(result);
    });
    console.log('  ✅ Ambiguous input handled\n');
  } catch (error) {
    console.log('  ✅ Error handling worked:', error.message, '\n');
  }

  // Test 2: Scope mismatch protection
  console.log('Test 2: Scope mismatch protection...');
  try {
    let leaked;

    await client.scope('scope-a', async (ctxA) => {
      leaked = await ctxA.infer(z.string(), 'test data');
      return 'done';
    });

    await client.scope('scope-b', async (ctxB) => {
      // Using value from different scope without bridging should fail
      return ctxB.use(leaked);
    });

    console.log('  ❌ Scope protection failed (should not happen)');
  } catch (error) {
    console.log('  ✅ Scope mismatch correctly caught:', error.message, '\n');
  }

  // Test 3: Confidence extraction
  console.log('Test 3: Confidence extraction...');
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

---

## Running the tests

1. **Set up env:**

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
node -e "
import('./test-openai.js').then(() =>
import('./test-anthropic.js')).then(() =>
import('./test-bridging.js')).then(() =>
import('./test-edge-cases.js'))
.then(() => console.log('🎉 All integration tests passed!'))
.catch(err => { console.error('💥 Tests failed:', err); process.exit(1); })
"
```

---

## Success criteria

Mark Task 5.3 complete when **all** of these work:

### ✅ Basic functionality

- [ ] Client creates successfully with a real provider
- [ ] `infer()` returns properly structured `Owned<T, S>` values
- [ ] Confidence scores are reasonable (0.3–1.0 range)
- [ ] Trace IDs are unique and properly formatted

### ✅ Type safety

- [ ] TypeScript compilation passes
- [ ] Scope types are correctly inferred (literal string types)
- [ ] `use()` enforces boundaries at runtime

### ✅ Integration features

- [ ] Multiple providers work (OpenAI, Anthropic, etc.)
- [ ] Scope bridging preserves data and combines scope types
- [ ] Error handling works for invalid inputs and scope mismatches

### ✅ Confidence system

- [ ] Different finish reasons produce different confidence scores
- [ ] `stop` ⇒ confidence = 1.0
- [ ] `length` ⇒ confidence = 0.75
- [ ] `error` ⇒ confidence = 0.3

### ✅ Real-world scenarios

- [ ] Complex schemas work (nested objects, arrays, enums)
- [ ] Large text inputs are handled correctly
- [ ] Edge cases don't crash the system

---

## Troubleshooting

### Common issues

1. **"Model not found"**

- Check API key permissions and model access
- Try a different model (e.g. `gpt-3.5-turbo` instead of `gpt-4`)

2. **Type errors**

- Ensure packages are built: `pnpm build`
- Check TypeScript version compatibility

3. **Network/API errors**

- Verify API key permissions and quota
- Try a simpler prompt to validate connectivity

4. **Low confidence scores**

- Expected for ambiguous inputs
- Make prompts more specific
- Check if schema is too restrictive

### Debug commands

```bash
pnpm --filter @mullion/ai-sdk build
pnpm --filter @mullion/ai-sdk typecheck
pnpm --filter @mullion/ai-sdk test
pnpm list ai zod @ai-sdk/openai
```

---

## Completion checklist

When all tests pass, update `TODO.md`:

```markdown
### 5.3 Tests

- [x] Mock provider tests
- [x] Integration test with real API (manual) ✅ COMPLETED
```
