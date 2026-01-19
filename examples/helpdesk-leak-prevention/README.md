# Mullion Template: Helpdesk Leak Prevention

**Package:** `@mullion/template-helpdesk`

> **Scenario:** Customer support system where internal admin notes must never leak to customer-facing responses.

This template demonstrates how **Mullion** prevents sensitive data leaks across execution scopes using type-safe context management and compile-time validation.

**Features:**

- 🔄 **Importable as a package** - Reuse in demo apps or generated projects
- 🎯 **Standalone executable** - Run as a CLI demo
- 📦 **Complete exports** - All functions, types, and schemas available for import
- 🛡️ **Educational examples** - Both safe and unsafe patterns for learning

## 🎯 Problem Statement

In a customer support system:

- **Admin AI** analyzes tickets and generates:
  - ✅ Public info: category, priority, sentiment
  - 🔐 Internal info: risk assessment, compensation strategy, customer history
- **Public AI** generates customer responses
- **Risk:** Internal notes accidentally included in customer response

**Traditional approach:** Hope developers remember to filter sensitive data (runtime error, production incident)

**Mullion approach:** Type system + ESLint catch leaks at compile time (before code runs)

## 🔍 What You'll Learn

1. **Scope Isolation:** Separate `admin` and `public` execution contexts
2. **Explicit Bridging:** Sanitize data before crossing scope boundaries
3. **Compile-time Safety:** ESLint catches leaks during development
4. **Confidence Tracking:** Validate AI output quality before using it

## 📂 Files

```
examples/helpdesk-leak-prevention/
├── src/
│   ├── index.ts         # 📦 Package exports (importable)
│   ├── cli.ts           # 🎯 CLI entry point (executable)
│   ├── schemas.ts       # Zod schemas for ticket analysis & response
│   ├── safe-flow.ts     # ✅ Correct: explicit sanitization + bridging
│   ├── unsafe-flow.ts   # ❌ Wrong: intentional leaks for ESLint demo
│   └── provider.ts      # Provider selection (OpenAI/Anthropic/Mock)
├── package.json
├── tsconfig.json
├── eslint.config.js     # Mullion ESLint rules configuration
└── README.md            # This file
```

## 🚀 Quick Start

### Option A: Use as Standalone Demo

#### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
pnpm build
```

#### 2. Set Up Environment (Optional)

```bash
cd examples/helpdesk-leak-prevention
cp .env.example .env
# Edit .env and add your API key for OpenAI or Anthropic
```

**Note:** The example works without an API key by using mock data. To use a real LLM provider:

- For OpenAI: Set `OPENAI_API_KEY` in your `.env` file
- For Anthropic: Set `ANTHROPIC_API_KEY` in your `.env` file

The example will automatically detect which provider to use based on available API keys.

#### 3. Run the Safe Flow

```bash
npm run safe
```

**Output shows:**

- Which provider is being used (Mock/OpenAI/Anthropic)
- Admin scope analyzes ticket with internal context
- Data is sanitized (sensitive fields removed)
- Public scope generates response using only safe data
- No leaks! ✅

#### 4. Run ESLint to Catch Leaks

```bash
npm run lint        # Runs lint (summary only; won't fail build - for CI)
npm run lint:strict # Shows all ESLint errors (for demonstration)
```

**ESLint will flag violations in `unsafe-flow.ts`:**

- `@mullion/no-context-leak`: Detects data crossing scope boundaries without bridge (5 errors)
- `@mullion/require-confidence-check`: Warns about using data without confidence validation (19 warnings)

> **Note:** `npm run lint` exits with 0 (success) and only prints a summary when issues are found, since these are intentional for demonstration. Use `npm run lint:strict` to see the full ESLint output.

### Option B: Import as a Package

Within the monorepo, you can import and use the helpdesk flow in your own apps:

```typescript
import {
  processSupportTicketSafely,
  getProviderName,
  getLanguageModel,
  type TicketAnalysis,
  type CustomerResponse,
  type SanitizedTicket,
  TicketAnalysisSchema,
  CustomerResponseSchema,
} from '@mullion/template-helpdesk';

// Use in your app
const result = await processSupportTicketSafely({
  type: 'openai',
  model: 'gpt-4o-mini',
});
```

**Available Exports:**

- **Safe Flow:** `processSupportTicketSafely` (production-ready implementation)
- **Unsafe Flow:** `contextLeakOuterScope`, `contextLeakCrossScope`, `directValueAccessLeak`, etc. (educational examples - DO NOT USE IN PRODUCTION)
- **Utilities:** `getLanguageModel`, `getProviderName`
- **Types:** All TypeScript types (`TicketAnalysis`, `CustomerResponse`, `SanitizedTicket`)
- **Schemas:** All Zod schemas (`TicketAnalysisSchema`, `CustomerResponseSchema`, `SanitizedTicketSchema`)

## 📖 Example Walkthrough

### ❌ The Unsafe Way (What Mullion Prevents)

```typescript
// unsafe-flow.ts (ESLint catches these!)

let leaked: Owned<TicketAnalysis, 'admin'>;

await client.scope('admin', async (adminCtx) => {
  const analysis = await adminCtx.infer(TicketAnalysisSchema, ticket);
  leaked = analysis; // ❌ ESLint ERROR: Storing scoped value outside scope
  return adminCtx.use(analysis);
});

await client.scope('public', async (publicCtx) => {
  // ❌ ESLint ERROR: Using admin data in public scope without bridge
  const prompt = `Generate response: ${leaked.value.internalNotes}`;
  return await publicCtx.infer(ResponseSchema, prompt);
});
```

**Problems:**

1. Admin-scoped data stored in outer variable → leaks outside scope
2. Internal notes directly used in public scope → exposed to customer
3. No confidence checking → low-quality data used blindly

### ✅ The Safe Way (Mullion Best Practice)

```typescript
// safe-flow.ts

// Step 1: Analyze in admin scope
const adminAnalysis = await client.scope('admin', async (adminCtx) => {
  const analysis = await adminCtx.infer(TicketAnalysisSchema, ticket);

  // ✅ GOOD: Check confidence
  if (analysis.confidence < 0.7) {
    throw new Error('Low confidence - needs human review');
  }

  console.log('Internal notes:', analysis.value.internalNotes); // Safe, within scope

  // ✅ GOOD: Return owned value within scope
  return adminCtx.use(analysis);
});

// Step 2: Sanitize before bridging
const sanitized = {
  ticketId: adminAnalysis.value.ticketId,
  category: adminAnalysis.value.category,
  priority: adminAnalysis.value.priority,
  sentiment: adminAnalysis.value.sentiment,
  // ✅ CRITICAL: internalNotes NOT included
};

// Step 3: Generate response in public scope
const response = await client.scope('public', async (publicCtx) => {
  const sanitizedOwned = createOwned({
    value: sanitized,
    scope: 'admin' as const,
    confidence: adminAnalysis.confidence,
    traceId: adminAnalysis.traceId,
  });

  // ✅ GOOD: Explicitly bridge sanitized data
  const bridged = publicCtx.bridge(sanitizedOwned);

  // ✅ GOOD: Only use safe, bridged data
  const prompt = `Generate response for ${bridged.value.category} ticket...`;
  return await publicCtx.infer(ResponseSchema, prompt);
});
```

**Benefits:**

1. ✅ Admin data never leaves admin scope
2. ✅ Explicit sanitization removes sensitive fields
3. ✅ Bridge makes data flow visible and trackable
4. ✅ Confidence checked before using data
5. ✅ ESLint validates safety at compile time

## 🛡️ How Mullion Protects You

### Compile-Time Protection (ESLint)

```bash
npm run lint        # Summary only
npm run lint:strict # Full ESLint output
```

**Catches:**

- ❌ Storing `Owned<T, S>` outside its scope
- ❌ Using scoped data in different scope without `bridge()`
- ❌ Accessing `.value` without confidence check

### Runtime Protection (Type System)

```typescript
// Type error: Cannot use admin data in public scope
const adminData: Owned<Data, 'admin'> = ...;
const publicResult = publicCtx.use(adminData); // TS Error!

// ✅ Must bridge first
const bridged = publicCtx.bridge(adminData); // Now type-safe
const publicResult = publicCtx.use(bridged); // ✅ OK
```

### Observable Protection (Tracing)

Every `Owned<T, S>` has:

- `__scope`: Which scopes have touched this data
- `traceId`: OpenTelemetry trace for debugging
- `confidence`: AI output quality score

## 🎓 Key Concepts

### Scoped Contexts

```typescript
// Each scope is isolated
await client.scope('admin', async (adminCtx) => {
  // adminCtx can only create/use 'admin' scoped data
});

await client.scope('public', async (publicCtx) => {
  // publicCtx can only create/use 'public' scoped data
});
```

### Bridging

```typescript
// Explicitly move data between scopes
const adminData: Owned<T, 'admin'> = ...;
const bridged: Owned<T, 'admin' | 'public'> = publicCtx.bridge(adminData);
//                          ^^^^^^^^^^^^^^^^^ Combined scope type
```

### Confidence Checking

```typescript
const result = await ctx.infer(Schema, input);

// ✅ GOOD: Check before using
if (result.confidence < 0.8) {
  throw new Error('Low confidence - needs review');
}
return result.value; // Safe to use
```

## 🧪 Testing

Run all checks:

```bash
npm run lint       # ESLint leak detection (summary)
npm run safe       # Run safe implementation
```

> **Note:** TypeScript typecheck is intentionally skipped for this example due to AI SDK version mismatches in the monorepo. The code works correctly at runtime. In a real project with published packages, these type errors would not occur.

## 📊 Real-World Impact

**Without Mullion:**

- Runtime leak → customer sees "Internal: high churn risk, offer $200 refund"
- Incident response, customer trust damaged
- Post-incident code audit

**With Mullion:**

- Compile-time error → developer sees ESLint violation
- Fix before commit
- Never reaches production

## 🔗 Related Examples

- [Basic Example](../basic/) - Core Mullion concepts
- [RAG Sensitive Data](../rag-sensitive-data/) - Document classification with fork/merge

## 📖 Learn More

- [Mullion Documentation](https://github.com/mullionlabs/mullion-ts)
- [ESLint Plugin](../../packages/eslint-plugin/)
- [Core Package](../../packages/core/)
- [AI SDK Integration](../../packages/ai-sdk/)

## 🐛 Issues?

Report issues at: https://github.com/mullionlabs/mullion-ts/issues

---

**Next Steps:**

1. ✅ Run `npm run safe` - See correct implementation
2. 🔍 Read `src/safe-flow.ts` - Study the code
3. ⚠️ Run `npm run lint:strict` - See ESLint catch violations
4. 📚 Explore [RAG Example](../rag-sensitive-data/) for fork/merge patterns
