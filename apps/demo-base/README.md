# Demo Base Layer

Reusable Nuxt layer for Mullion demo applications.

## Overview

This is a Nuxt layer that provides shared UI components, layouts, composables, and server utilities for all Mullion demo apps. It's built with **Nuxt v4.2.2** and **NuxtUI v4.3.0**, following the Mullion design system.

## Directory Structure (Nuxt v4)

```
apps/demo-base/
├── app/                    # Application source (Nuxt v4 structure)
│   ├── app.vue            # Root component
│   ├── assets/            # CSS and static assets
│   ├── components/        # Vue components
│   ├── composables/       # Vue composables
│   └── layouts/           # Nuxt layouts
├── server/                # Server-side code (root level in v4)
│   └── utils/             # Server utilities
├── nuxt.config.ts         # Nuxt configuration
└── package.json           # Dependencies
```

**Note:** This follows the new Nuxt v4 directory structure where application code lives in `app/` and server code is at the root level.

## What's Included

### Components

- **MullionHeader** - Header with logo, title, auth button, and GitHub link
- **AuthButton** - Google OAuth sign in/out button
- **CodeBlock** - Syntax-highlighted code display with copy button
- **ResultCard** - Display inference results with confidence indicators
- **CostDisplay** - Show token usage and API costs
- **RateLimitNotice** - Display rate limit warnings and status
- **AccessDenied** - Authentication required screen

### Layouts

- **default** - Standard layout with header, main content, and footer

### Composables

- **useAuth** - Google OAuth state management
- **useRateLimit** - Per-user request tracking (20 req/day)

### Server Utils

- **auth.ts** - Google OAuth verification (placeholder for Task 13.5)
- **rate-limit.ts** - Request rate limiting (in-memory store, will use Vercel KV in Task 13.5)
- **mullion.ts** - Server-side Mullion client helpers

## Usage in Demo Apps

To extend this layer in a demo app:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['../demo-base'],
  // ... your app-specific config
});
```

## Vue Component Pattern

All components follow this structure:

```vue
<template>
  <div class="component-semantic-name">
    <!-- Every root element must have class as semantic name -->
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'ComponentName',
});
</script>

<style lang="scss">
/* Component styles */
</style>
```

## Development Status

**Task 13.2 Complete** ✅

All components and utilities are implemented with placeholder logic for authentication and rate limiting. Full OAuth and Vercel KV integration will be completed in Task 13.5.

## Next Steps

- Task 13.3: Demo Helpdesk App (will extend this layer)
- Task 13.4: Demo RAG App (will extend this layer)
- Task 13.5: Implement real Google OAuth and Vercel KV rate limiting
