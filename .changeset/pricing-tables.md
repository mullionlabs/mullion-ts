---
'@mullion/ai-sdk': minor
---

Add comprehensive pricing tables for cost calculation

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
