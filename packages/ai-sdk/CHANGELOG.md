# @mullion/ai-sdk

## 0.2.2

### Patch Changes

- 19dc963: Update package metadata (keywords, repository, homepage/bugs links) to improve npm discoverability
- Updated dependencies [19dc963]
  - @mullion/core@0.2.2

## 0.2.1

### Patch Changes

- 49cc49f: - Update README badges (npm version, downloads, CI status)
  - Fix markdown links in documentation
  - Add contributing full guide
- Updated dependencies [49cc49f]
  - @mullion/core@0.2.1

## 0.2.0

### Minor Changes

- ba88f7a: Add cost tracking integration to Mullion context

  Implements Task 10.4: Context Cost Integration with the following features:
  - `getLastCallCost()` - Returns cost breakdown from last API call
  - `estimateNextCallCost()` - Pre-call cost estimation for decision making
  - Automatic cost tracking for all `infer()` calls
  - Integration with existing cache metrics system

  New MullionContext methods:

  ```typescript
  interface MullionContext<S> extends Context<S> {
    getLastCallCost(): CostBreakdown | null;
    estimateNextCallCost(
      prompt: string,
      estimatedOutputTokens?: number
    ): CostBreakdown;
  }
  ```

  Features:
  - Automatic cost calculation after each `infer()` call
  - Uses actual token usage from API response
  - Combines with cache stats for accurate savings analysis
  - Token estimation based on prompt text
  - Model-specific pricing support

  Example usage:

  ```typescript
  const client = createMullionClient(model, {
    provider: 'openai',
    model: 'gpt-4',
  });

  await client.scope('test', async (ctx) => {
    // Estimate before call
    const estimate = ctx.estimateNextCallCost(longPrompt);
    if (estimate.totalCost > 0.1) {
      console.warn('Expensive call!');
    }

    // Make call
    await ctx.infer(schema, longPrompt);

    // Get actual cost
    const actual = ctx.getLastCallCost();
    console.log(`Cost: $${actual.totalCost.toFixed(4)}`);
    console.log(`Savings: ${actual.savingsPercent.toFixed(1)}%`);
  });
  ```

  Completes Task 10 (Cost Estimation) with full integration into the context API for real-time cost tracking and decision making.

- ba88f7a: Add comprehensive cost calculation with cache savings analysis

  Implements Task 10.3: Cost Calculation with the following features:
  - `calculateCost(usage, cacheStats, model)` for actual API call cost analysis
  - `estimateCost()` for pre-call cost estimation
  - `calculateBatchCost()` for aggregating costs across multiple calls
  - `formatCostBreakdown()` for human-readable cost display
  - `compareCosts()` for comparing estimated vs actual costs

  Cost breakdown includes:
  - Input tokens cost (non-cached)
  - Output tokens cost
  - Cache write cost (Anthropic only)
  - Cache read cost (10% of input for Anthropic, free for OpenAI)
  - Total cost and savings analysis
  - Savings percentage vs no-cache baseline

  Key features:
  - Supports both OpenAI (free cache) and Anthropic (paid cache)
  - Correctly handles cache economics (write costs vs read savings)
  - Can show negative savings when cache write cost exceeds immediate benefit
  - Batch cost aggregation for multi-call workflows
  - Cost comparison for estimate accuracy validation

  Example: 10k tokens on Claude 3.5 Sonnet with 80% cache hit
  - No cache: $0.0375
  - With cache: $0.0159 (57.6% savings)

  Comprehensive test suite with 30 test cases covering various scenarios including large-scale processing, batch operations, and cache cost analysis.

- ba88f7a: Add comprehensive pricing tables for cost calculation

  Implements Task 10.2: Pricing Tables with the following features:
  - Complete pricing database for OpenAI and Anthropic models (14 models total)
  - `getPricing(model, overrides?)` with fuzzy matching for model variants
  - `getAllPricing()` and `getPricingByProvider()` for querying pricing data
  - `calculateCacheWritePricing()` for Anthropic cache economics (5m/1h TTL)
  - JSON export/import for easy pricing updates
  - Override support for custom deployments

  Pricing includes:
  - OpenAI: GPT-4, GPT-4-turbo, GPT-3.5-turbo, O1 models (free automatic caching)
  - Anthropic: Claude 3.5 Sonnet, Claude 4.5 (Opus/Sonnet/Haiku), Claude 3 models
  - Cache economics: 10% cache read, +25% 5min write, +100% 1h write

  Comprehensive test suite with 48 test cases covering exact matches, fuzzy matching, overrides, provider filtering, and cache economics validation.

- 3c987a2: First release
- ba88f7a: Add token estimation utilities for cost calculation

  Implements Task 10.1: Token Estimation with the following features:
  - `estimateTokens(text, model?)` function for estimating token counts
  - Provider-aware estimation (OpenAI GPT models, Anthropic Claude models, generic)
  - `estimateTokensForSegments()` for estimating multiple text segments
  - Clear indication of estimation method (tiktoken, approximate, exact)
  - Support for different models with appropriate character-to-token ratios
  - Comprehensive test suite with 34 test cases

  This enables developers to estimate token usage and costs before making API calls.

### Patch Changes

- Updated dependencies [3c987a2]
  - @mullion/core@0.2.0

## 0.1.0

### Minor Changes

- # Mullion 0.1.0 - Initial Release

  This is the first public release of Mullion, a TypeScript library for type-safe LLM context management.

  ## 🎯 **What is Mullion?**

  Mullion provides compile-time safety for LLM workflows, preventing context leaks and enforcing confidence checking. Think of it as "ESLint + TypeScript for LLM workflows."

  **Core philosophy:** Compile-time safety, not runtime orchestration.

  ## 📦 **New Packages**

  ### @mullion/core

  Core types and utilities for type-safe context management:
  - `Owned<T, S>` - Scoped value wrapper with confidence tracking
  - `Context<S>` - Type-safe execution context interface
  - `createOwned()` - Factory for creating scoped values
  - `isOwned()` - Type guard for Owned values
  - Complete TypeScript integration with branded types

  ### @mullion/ai-sdk

  Seamless integration with Vercel AI SDK:
  - `createMullionClient()` - Wrap any AI SDK model
  - Automatic confidence extraction from finish reasons
  - Support for OpenAI, Anthropic, Google, and custom providers
  - Full Zod schema integration
  - Type-safe scope bridging between contexts

  ### @mullion/eslint-plugin

  Static analysis for context leak detection:
  - `no-context-leak` rule - Prevents accidental scope violations
  - `require-confidence-check` rule - Enforces confidence validation
  - TypeScript integration for accurate detection
  - Preset configurations (recommended/strict)
  - Real-time feedback during development

  ## ✨ **Key Features**

  ### Type Safety
  - Compile-time scope tracking with TypeScript literals
  - Zero runtime overhead for type checking
  - Full IDE support with autocompletion

  ### Leak Prevention
  - ESLint rules catch context leaks before runtime
  - Explicit bridging requirements between scopes
  - Runtime scope validation as safety net

  ### Confidence System
  - Automatic confidence extraction from LLM responses
  - Configurable thresholds and validation
  - Handler-based processing for uncertain results

  ### Audit Trails
  - Unique trace IDs for every LLM operation
  - Full provenance tracking across scope boundaries
  - Complete visibility into data flow

  ## 🛡️ **Security Benefits**

  Prevents the #1 cause of LLM security vulnerabilities - context leaks:

  ```typescript
  // ❌ DANGEROUS: Context leak
  const adminData = await adminCtx.infer(Schema, 'secret');
  await customerCtx.respond(adminData.value); // 🚨 LEAK!

  // ✅ SAFE: Explicit bridging
  const adminData = await adminCtx.infer(Schema, 'secret');
  const safe = customerCtx.bridge(adminData); // ✅ Tracked
  await customerCtx.respond(safe.value);
  ```

  ## 📚 **Documentation & Examples**
  - Comprehensive README with quick start guide
  - Real-world examples for common use cases:
    - Customer support automation
    - Document classification pipelines
    - Multi-tenant data processing
  - Integration test instructions
  - Complete API reference for all packages

  ## 🚀 **Getting Started**

  ```bash
  # Core library
  npm install @mullion/core

  # AI SDK integration
  npm install @mullion/ai-sdk ai zod

  # ESLint plugin
  npm install @mullion/eslint-plugin --save-dev
  ```

  ```typescript
  import { createMullionClient } from '@mullion/ai-sdk';
  import { openai } from '@ai-sdk/openai';

  const client = createMullionClient(openai('gpt-4'));

  const result = await client.scope('analysis', async (ctx) => {
    const data = await ctx.infer(Schema, input);

    if (data.confidence < 0.8) {
      throw new Error('Low confidence - needs review');
    }

    return ctx.use(data);
  });
  ```

  ## 🔮 **What's Next**
  - Next.js integration example
  - Advanced ESLint rules
  - OpenAI Assistants API adapter
  - VSCode extension
  - Performance optimizations

  This release establishes the foundation for safer LLM applications with compile-time guarantees and comprehensive tooling.

### Patch Changes

- Updated dependencies
  - @mullion/core@0.1.0
