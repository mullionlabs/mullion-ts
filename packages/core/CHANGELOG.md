# @mullion/core

## 0.3.0

### Minor Changes

- 2c49d63: Add sink-safe helpers, scoped cache utilities, and sink leak lint rule

## 0.2.3

### Patch Changes

- 022fd53: Small types fix

## 0.2.2

### Patch Changes

- 19dc963: Update package metadata (keywords, repository, homepage/bugs links) to improve npm discoverability

## 0.2.1

### Patch Changes

- 49cc49f: - Update README badges (npm version, downloads, CI status)
  - Fix markdown links in documentation
  - Add contributing full guide

## 0.2.0

### Minor Changes

- 3c987a2: First release

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
  import {createMullionClient} from '@mullion/ai-sdk';
  import {openai} from '@ai-sdk/openai';

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
