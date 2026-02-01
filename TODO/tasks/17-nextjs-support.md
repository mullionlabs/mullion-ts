# Task 17: create-mullion + Next.js

**Status:** 📋 Planned
**Priority:** Medium (After Task 16)

## Goal

Add Next.js framework support to create-mullion CLI.

## Philosophy

> 🔄 **Same scenarios** — reuse @mullion/template-\* logic
> 🎯 **App Router** — modern Next.js patterns
> ⚡ **Minimal work** — only framework adapters needed

## Summary

Extend create-mullion CLI to support Next.js in addition to Nuxt. Same RAG and Helpdesk scenarios, just adapted to Next.js App Router conventions.

## Checklist

### 17.1 CLI Updates

- [ ] Add `next` to `--framework` options in cli.ts
- [ ] Update validation for Next combinations
- [ ] Update prompts to show both framework choices

### 17.2 Next.js Base Template

- [ ] Create `templates/next/base/`:
  - [ ] `next.config.js` - Basic Next.js config
  - [ ] `package.json` - Next.js deps + @mullion packages
  - [ ] `tsconfig.json` - Next.js TypeScript config
  - [ ] `src/app/layout.tsx` - Root layout
  - [ ] `src/app/page.tsx` - Landing page
  - [ ] `src/mullion/index.ts` - Scenario entrypoint (stub)
  - [ ] `.env.example` - Environment variables template

### 17.3 Next.js Scenarios

**RAG Scenario (`templates/next/scenarios/rag/`):**

- [ ] `deps.json` - Additional dependencies
- [ ] `src/mullion/` - Copied from @mullion/template-rag-sensitive-data
- [ ] `src/app/api/query/route.ts` - Next.js API route for queries
- [ ] `src/app/api/documents/route.ts` - Next.js API route for documents
- [ ] `src/app/page.tsx` - RAG demo UI (React components)
- [ ] `src/app/demo/page.tsx` - Interactive demo page

**Helpdesk Scenario (`templates/next/scenarios/helpdesk/`):**

- [ ] `deps.json` - Additional dependencies
- [ ] `src/mullion/` - Copied from @mullion/template-helpdesk
- [ ] `src/app/api/analyze/route.ts` - Next.js API route
- [ ] `src/app/page.tsx` - Helpdesk demo UI
- [ ] `src/app/demo/page.tsx` - Interactive demo page

### 17.4 Next.js UI Layers

**Minimal (`templates/next/ui/minimal/`):**

- [ ] `deps.json` - No extra deps (just React)
- [ ] `src/app/globals.css` - Basic styles
- [ ] `src/components/ResultCard.tsx` - Result display
- [ ] `src/components/QueryInput.tsx` - Query input
- [ ] `src/components/Header.tsx` - App header

**shadcn (`templates/next/ui/shadcn/`):**

- [ ] `deps.json` - shadcn/ui, tailwindcss
- [ ] `tailwind.config.ts` - Tailwind config
- [ ] `src/components/ui/` - shadcn components (button, card, input)
- [ ] `src/components/ResultCard.tsx` - shadcn-styled result
- [ ] `src/components/QueryInput.tsx` - shadcn-styled input
- [ ] `src/components/Header.tsx` - shadcn-styled header

### 17.5 Testing

- [ ] Generate all Next.js combinations
- [ ] Verify structure matches expected output
- [ ] Test that generated projects build: `pnpm build`
- [ ] Test that generated projects run: `pnpm dev`
- [ ] Manual testing of all features

### 17.6 Documentation

- [ ] Update `packages/create-mullion/README.md` with Next.js examples
- [ ] Add Next.js setup instructions
- [ ] Document differences between Nuxt and Next templates

## Success Criteria

- [ ] `npm create mullion -- --framework next` works
- [ ] All 4 Next combinations valid:
  - [ ] next + rag + minimal
  - [ ] next + rag + shadcn
  - [ ] next + helpdesk + minimal
  - [ ] next + helpdesk + shadcn
- [ ] Feature parity with Nuxt templates:
  - [ ] Mock + real provider support
  - [ ] Same scenario logic (imported from templates)
  - [ ] Working examples with clear documentation

## Example Usage

```bash
# Interactive mode
npm create mullion@latest

? Choose framework: Next.js
? Choose scenario: rag
? Choose UI: shadcn
? Package manager: pnpm

# Flag mode
npm create mullion@latest my-nextjs-app --framework next --scenario helpdesk --ui minimal
```

## Design Notes

### Next.js vs Nuxt Differences

| Aspect           | Nuxt              | Next.js                  |
| ---------------- | ----------------- | ------------------------ |
| **API Routes**   | `server/api/*.ts` | `src/app/api/*/route.ts` |
| **Pages**        | `pages/*.vue`     | `src/app/*/page.tsx`     |
| **Components**   | `.vue` files      | `.tsx` files             |
| **Config**       | `nuxt.config.ts`  | `next.config.js`         |
| **Server Utils** | `server/utils/`   | Inline in route handlers |

### Scenario Logic Reuse

Both frameworks import the **same scenario logic** from Task 12 templates:

```typescript
// Next.js: src/app/api/query/route.ts
import {executeRAGPipeline} from '@mullion/template-rag-sensitive-data';

export async function POST(request: Request) {
  const body = await request.json();
  const result = await executeRAGPipeline(body.query, {
    providerConfig: {provider: 'openai'},
  });
  return Response.json(result);
}
```

```typescript
// Nuxt: server/api/query.post.ts
import {executeRAGPipeline} from '@mullion/template-rag-sensitive-data';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = await executeRAGPipeline(body.query, {
    providerConfig: {provider: 'openai'},
  });
  return result;
});
```

**Key Insight:** Only framework adapters differ, scenario logic is identical.

## Implementation Strategy

1. **Copy Nuxt templates as starting point**
2. **Adapt to Next.js patterns:**
   - Convert `.vue` → `.tsx`
   - `server/api/` → `src/app/api/*/route.ts`
   - `pages/` → `src/app/*/page.tsx`
3. **Test incrementally** - One scenario at a time
4. **Reuse components** - UI layers (minimal/shadcn) can share logic

## Testing Plan

### Unit Tests

Existing tests for generator, deps-merger, placeholders should work unchanged (framework-agnostic).

### Integration Tests

```bash
# Generate all Next.js combinations
npm run test:integration:next

# Test: next + rag + minimal
create-mullion test-next-rag-minimal --framework next --scenario rag --ui minimal --no-install --no-git
cd test-next-rag-minimal && pnpm install && pnpm build

# Test: next + helpdesk + shadcn
create-mullion test-next-helpdesk-shadcn --framework next --scenario helpdesk --ui shadcn --no-install --no-git
cd test-next-helpdesk-shadcn && pnpm install && pnpm build

# Cleanup
rm -rf test-next-*
```

### Manual Testing Checklist

- [ ] Next.js app runs in dev mode
- [ ] Next.js app builds for production
- [ ] API routes work correctly
- [ ] Mock mode works (no API keys)
- [ ] Real provider works (with API key)
- [ ] UI renders correctly (both minimal and shadcn)

## Related Tasks

- **Task 12:** Scenario templates (same for both frameworks)
- **Task 15:** Nuxt templates (reference implementation)

## Notes

- Next.js App Router only (not Pages Router)
- Use React 18+ features (Server Components where appropriate)
- Shadcn/ui for Next.js has better ecosystem than Nuxt (easier to implement)
- Consider adding Vercel deployment instructions (Next.js native platform)

## Future Enhancements

After Task 17 completion:

- [ ] Add Remix framework support
- [ ] Add SvelteKit framework support
- [ ] Add auth templates (Clerk, Auth.js)
- [ ] Add database templates (Prisma, Drizzle)

## When Complete

Mark as done when:

- [x] All 4 Next.js combinations generate successfully
- [x] Generated projects build and run
- [x] Tests passing
- [x] Documentation updated

Then: **Next queued task** (TBD - possibly Gemini adapter or more scenarios)

---

**Last Updated:** 2026-01-17
