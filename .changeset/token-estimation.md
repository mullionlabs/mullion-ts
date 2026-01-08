---
'@mullion/ai-sdk': minor
---

Add token estimation utilities for cost calculation

Implements Task 10.1: Token Estimation with the following features:

- `estimateTokens(text, model?)` function for estimating token counts
- Provider-aware estimation (OpenAI GPT models, Anthropic Claude models, generic)
- `estimateTokensForSegments()` for estimating multiple text segments
- Clear indication of estimation method (tiktoken, approximate, exact)
- Support for different models with appropriate character-to-token ratios
- Comprehensive test suite with 34 test cases

This enables developers to estimate token usage and costs before making API calls.
