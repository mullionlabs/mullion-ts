# Mullion Helpdesk Demo

Live demonstration of Mullion's scope isolation preventing context leaks in a customer support scenario.

## Overview

This demo application shows how Mullion enforces type-safe boundaries between admin and customer contexts, preventing sensitive internal notes from leaking into public responses.

## Features

- **Scope Isolation**: Admin notes are tagged with `admin` scope, customer responses with `public` scope
- **Type Safety**: Compile-time enforcement of scope boundaries
- **Real-time Analysis**: Process support tickets and see both admin and public views
- **Interactive UI**: Try different scenarios to see how Mullion prevents leaks

## Architecture

```
demo-helpdesk/
├── app/                           # Nuxt v4 app directory
│   └── pages/
│       ├── index.vue              # Landing page with explanation
│       └── demo.vue               # Interactive demo
├── server/
│   └── api/
│       └── analyze.post.ts        # Ticket analysis endpoint
├── nuxt.config.ts
└── package.json
```

## Development

```bash
# Install dependencies
pnpm install

# Run dev server (port 3001)
pnpm dev

# Build for production
pnpm build

# Type check
pnpm typecheck
```

## How It Works

1. **User Input**: Enter a support ticket with mixed content
2. **Admin Processing**: Mullion processes in `admin` scope, extracting:
   - Ticket summary
   - Internal notes (sensitive)
   - Recommended actions
3. **Public Response**: Generate customer response in `public` scope
   - Cannot access admin-scoped data without explicit bridging
   - Type system enforces boundaries at compile-time

## Using the Template

This app uses `@mullion/template-helpdesk` for the core logic:

```typescript
import { executeSafeHelpdeskFlow } from '@mullion/template-helpdesk';

const result = await executeSafeHelpdeskFlow(ticketText);
```

## Extending the Demo Base

This app extends the `demo-base` Nuxt layer, inheriting:

- UI components (Header, Cards, Alerts, etc.)
- Auth composables (placeholder for Task 13.5)
- Rate limiting (placeholder for Task 13.5)
- Server utilities

## Environment Variables

```bash
# .env.example
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
```

If no API key is provided, the template will use mock data for demonstration purposes.

## Deployment

Ready for deployment to Vercel:

1. Set environment variables in Vercel dashboard
2. Configure Google OAuth (Task 13.5)
3. Set up Vercel KV for rate limiting (Task 13.5)

## Status

**Task 13.3 Complete** ✅

- Landing page with scenario explanation
- Interactive demo page
- API endpoint using helpdesk template
- Extends demo-base layer

**Pending:**

- Google OAuth integration (Task 13.5)
- Vercel KV rate limiting (Task 13.5)
- CI/CD deployment (Task 13.6)
