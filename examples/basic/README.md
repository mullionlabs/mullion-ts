# Mullion Basic Example

This example demonstrates the core concepts of Mullion: type-safe LLM context management that prevents data leaks at compile time.

## What You'll See

### 🎯 Core Concepts

1. **Scoped Execution**: LLM operations are isolated in named scopes
2. **Owned Values**: All LLM outputs are tagged with their origin scope
3. **Safe Bridging**: Explicit transfers between scopes with full provenance
4. **Confidence Tracking**: Automatic confidence scoring based on LLM behavior

### 🛡️ Safety Features

- **Compile-time leak detection** via ESLint rules
- **Runtime scope validation** prevents accidental data mixing
- **Confidence requirements** help avoid using uncertain data
- **Trace IDs** enable full audit trails

## Quick Start

```bash
# Install dependencies (from monorepo root)
pnpm install

# Run the interactive demo
cd examples/basic
npm run demo

# See ESLint catch context leaks
npm run lint
```

## Files

- **`demo.js`** - Interactive demo showing proper Mullion usage
- **`bad-example.js`** - Intentional violations for ESLint demonstration
- **`index.js`** - Entry point with help information

## Demo Scenarios

### Scenario 1: Customer Support Pipeline

```javascript
// User query processed in "intake" scope
const analysis = await client.scope('intake', async (ctx) => {
  const query = await ctx.infer(UserQuerySchema, userInput);
  return ctx.use(query); // ✅ Safe: same scope
});

// Response generated in "support" scope
const response = await client.scope('support', async (ctx) => {
  const bridged = ctx.bridge(analysis); // ✅ Explicit bridge
  const reply = await ctx.infer(ResponseSchema, bridged.value);
  return ctx.use(reply); // ✅ Safe: same scope
});
```

### Scenario 2: ESLint Catches Leaks

```javascript
// ❌ BAD: Context leak
let leaked;
await client.scope('admin', async (ctx) => {
  leaked = await ctx.infer(Schema, 'secret data'); // ESLint error!
});

await client.scope('public', async (ctx) => {
  return leaked.value; // ESLint error!
});
```

Run `npm run lint` to see these violations caught automatically.

## Configuration

### With OpenAI API

Set your API key to see full LLM integration:

```bash
export OPENAI_API_KEY="sk-proj-..."
npm run demo
```

### Mock Mode

Run without an API key to see the concepts with mock data:

```bash
unset OPENAI_API_KEY
npm run demo
```

## Next Steps

- See `examples/nextjs/` for React integration
- Read the [main documentation](../../README.md) for advanced features
- Try building your own scoped LLM application!

---

**💡 Key Insight**: Mullion makes context leaks impossible by design, not just detectable after the fact.
