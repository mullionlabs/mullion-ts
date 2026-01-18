# Task 15: create-mullion CLI (Nuxt MVP)

**Status:** 📋 Planned
**Priority:** High (Next after Task 14)

## Goal

Project generator via `npm create mullion` that creates ready-to-run Mullion apps.

## Philosophy

> 🎯 **Composable templates** — overlay merge, no unused files
> ♻️ **Reuse** — copies logic from @mullion/template-\* packages
> 🚀 **Try it now** — works without API keys (mock + real provider support)
> 📦 **Monorepo** — `packages/create-mullion` for version consistency

## CLI UX

```bash
# Interactive mode
npm create mullion@latest

# With flags
npm create mullion@latest my-app --framework nuxt --scenario rag --ui minimal
```

## Parameters

| Flag                         | Values                       | Default     |
| ---------------------------- | ---------------------------- | ----------- |
| `--framework`                | `nuxt` (Next in Task 16)     | `nuxt`      |
| `--scenario`                 | `rag`, `helpdesk`            | `rag`       |
| `--ui`                       | `minimal`, `shadcn`          | `minimal`   |
| `--pm`                       | `pnpm`, `npm`, `yarn`, `bun` | auto-detect |
| `--install` / `--no-install` | boolean                      | `true`      |
| `--git` / `--no-git`         | boolean                      | `true`      |

## Architecture

```
packages/create-mullion/
├── src/
│   ├── index.ts              # CLI entry (bin)
│   ├── cli.ts                # Prompts, args parsing (citty/consola)
│   ├── generator.ts          # Overlay merge logic
│   ├── deps-merger.ts        # package.json smart merge
│   └── placeholders.ts       # {{PROJECT_NAME}} substitution
├── templates/
│   ├── nuxt/
│   │   ├── base/             # Minimal Nuxt app shell
│   │   ├── scenarios/
│   │   │   ├── rag/          # Copies from @mullion/template-rag-sensitive-data
│   │   │   └── helpdesk/     # Copies from @mullion/template-helpdesk
│   │   └── ui/
│   │       ├── minimal/
│   │       └── shadcn/
│   └── next/                 # Prepared for Task 16 (empty)
├── package.json
└── README.md
```

## Key Decision: Copy from Templates

The CLI copies scenario logic from `@mullion/template-*` packages into the generated project. This ensures:

1. **Single source of truth** — logic maintained in examples/
2. **No runtime dependency** — generated app is standalone
3. **Customizable** — user can modify copied code

```typescript
// generator.ts
async function copyScenario(scenario: string, targetDir: string) {
  const templatePath = resolveTemplate(`@mullion/template-${scenario}`);
  await copy(templatePath + '/src', targetDir + '/server/mullion');
}
```

## Checklist

### 15.1 Package Setup

- [ ] Create `packages/create-mullion/` directory
- [ ] Create `package.json`:
  ```json
  {
    "name": "create-mullion",
    "version": "0.1.0",
    "description": "Create Mullion-powered LLM apps",
    "type": "module",
    "bin": {
      "create-mullion": "./dist/index.js"
    },
    "files": ["dist", "templates"],
    "scripts": {
      "build": "tsup src/index.ts --format esm --dts",
      "dev": "tsup src/index.ts --format esm --watch"
    },
    "dependencies": {
      "citty": "^0.1.6",
      "consola": "^3.2.3",
      "pathe": "^1.1.2",
      "nypm": "^0.3.11"
    },
    "devDependencies": {
      "tsup": "catalog:",
      "typescript": "catalog:"
    }
  }
  ```
- [ ] Create `tsconfig.json`
- [ ] Add to monorepo workspace
- [ ] Update `turbo.json` (exclude templates from build cache)

### 15.2 CLI Implementation

- [ ] Create `src/index.ts` — bin entry with shebang
- [ ] Create `src/cli.ts`:
  - [ ] Parse args with citty
  - [ ] Interactive prompts for missing options
  - [ ] Validate framework + scenario + ui combination
  - [ ] Display summary before generation
- [ ] Create `src/generator.ts`:
  - [ ] Copy base template
  - [ ] Overlay scenario files
  - [ ] Overlay UI files
  - [ ] Copy scenario core from @mullion/template-\*
- [ ] Create `src/deps-merger.ts`:
  - [ ] Merge base + scenario + ui dependencies
  - [ ] Write final `package.json`
- [ ] Create `src/placeholders.ts`:
  - [ ] Replace `{{PROJECT_NAME}}`
  - [ ] Generate `.env.example`

### 15.3 Nuxt Base Template

- [ ] Create `templates/nuxt/base/`:
  - [ ] `nuxt.config.ts`
  - [ ] `app.vue`
  - [ ] `package.json` (base deps: nuxt, @mullion/core, @mullion/ai-sdk)
  - [ ] `tsconfig.json`
  - [ ] `server/mullion/index.ts` — scenario entrypoint (stub)
  - [ ] `pages/index.vue` — minimal landing

### 15.4 Nuxt Scenarios

**RAG Scenario (`templates/nuxt/scenarios/rag/`):**

- [ ] `deps.json` — additional dependencies
- [ ] `server/mullion/` — copied from @mullion/template-rag-sensitive-data
- [ ] `server/api/query.post.ts`
- [ ] `server/api/documents.get.ts`
- [ ] `pages/index.vue` — RAG demo UI

**Helpdesk Scenario (`templates/nuxt/scenarios/helpdesk/`):**

- [ ] `deps.json`
- [ ] `server/mullion/` — copied from @mullion/template-helpdesk
- [ ] `server/api/analyze.post.ts`
- [ ] `pages/index.vue` — Helpdesk demo UI

### 15.5 Nuxt UI Layers

**Minimal (`templates/nuxt/ui/minimal/`):**

- [ ] `deps.json` — no extra deps
- [ ] `assets/main.css` — basic styles
- [ ] `components/ResultCard.vue`
- [ ] `components/QueryInput.vue`

**shadcn (`templates/nuxt/ui/shadcn/`):**

- [ ] `deps.json` — shadcn-vue, tailwindcss
- [ ] `tailwind.config.ts`
- [ ] `components/ui/` — button, card, input
- [ ] `components/ResultCard.vue`
- [ ] `components/QueryInput.vue`

### 15.6 Provider Selection (Mock + Real)

Generated projects support both mock and real providers (same as current examples):

```typescript
// server/mullion/provider.ts (copied from template)
export function getProvider() {
  if (process.env.OPENAI_API_KEY) {
    return openai('gpt-4o-mini');
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic('claude-3-5-haiku-latest');
  }
  return null; // Mock mode
}
```

- [ ] Ensure provider.ts is copied with scenario
- [ ] Generate `.env.example` with provider key placeholders
- [ ] Show "Mock mode" banner in UI when no keys

### 15.7 Post-Generation

- [ ] Generate README with:
  - [ ] Quick start: `pnpm dev`
  - [ ] How to add API key for real provider
  - [ ] Project structure overview
- [ ] Optional: run `pnpm install`
- [ ] Optional: `git init`
- [ ] Display success message:

  ```
  ✅ Created my-app!

  Next steps:
    cd my-app
    pnpm dev

  📝 Add API key to .env to use real LLM (optional)
  ```

### 15.8 Testing

- [ ] Unit tests for overlay merge
- [ ] Unit tests for deps merger
- [ ] Integration: generate project, verify structure
- [ ] Integration: generated project builds
- [ ] Manual: test all combinations

### 15.9 Documentation

- [ ] `packages/create-mullion/README.md`
- [ ] Update root README with create-mullion section

## Success Criteria

- [ ] `npm create mullion` works
- [ ] All Nuxt combinations valid:
  - [ ] nuxt + rag + minimal
  - [ ] nuxt + rag + shadcn
  - [ ] nuxt + helpdesk + minimal
  - [ ] nuxt + helpdesk + shadcn
- [ ] Works without API keys (mock mode)
- [ ] Generated projects run with `pnpm dev`
- [ ] No unused files in output

## Design Rationale

### Why Copy, Not Import

Generated projects **copy** scenario logic instead of importing from npm:

**Pros:**

- No runtime dependency on @mullion/template-\* packages
- Users can modify scenario code freely
- Standalone projects (easier to understand/customize)
- Templates are documentation, not libraries

**Cons:**

- Updates to templates don't propagate automatically
- Slight code duplication across generated projects

**Decision:** Copy is correct - scenarios are starting points, not dependencies.

### Template Overlay Strategy

1. **Base** - Minimal framework shell (Nuxt setup)
2. **Scenario** - Business logic layer (RAG pipeline, helpdesk flow)
3. **UI** - Presentation layer (minimal CSS vs shadcn components)

Files are merged with scenario/UI overriding base where conflicts exist.

## Example Output

```bash
$ npm create mullion@latest my-rag-app

? Choose framework: nuxt
? Choose scenario: rag
? Choose UI: minimal
? Package manager: pnpm
? Install dependencies? Yes
? Initialize git? Yes

✨ Generating project...

  📁 Copying base template (Nuxt 4.1)
  📦 Adding RAG scenario logic
  🎨 Applying minimal UI
  📝 Generating README & .env.example
  📦 Installing dependencies...
  🎉 Done!

✅ Created my-rag-app!

Next steps:
  cd my-rag-app
  pnpm dev

📝 Add API key to .env to use real LLM (optional)
🚀 Visit http://localhost:3000
```

## Testing Plan

### Unit Tests

- `deps-merger.test.ts` - Merge multiple package.json files
- `placeholders.test.ts` - Replace {{PROJECT_NAME}}
- `generator.test.ts` - Overlay merge logic

### Integration Tests

```bash
# Generate all combinations
npm run test:integration

# Test: nuxt + rag + minimal
create-mullion test-rag-minimal --framework nuxt --scenario rag --ui minimal --no-install --no-git
cd test-rag-minimal && pnpm install && pnpm build

# Test: nuxt + helpdesk + shadcn
create-mullion test-helpdesk-shadcn --framework nuxt --scenario helpdesk --ui shadcn --no-install --no-git
cd test-helpdesk-shadcn && pnpm install && pnpm build

# Cleanup
rm -rf test-*
```

### Manual Testing

- [ ] Interactive mode works
- [ ] Flag-based mode works
- [ ] Generated app runs in mock mode
- [ ] Generated app works with real API key
- [ ] README instructions are clear
- [ ] .env.example has correct structure

## Related Tasks

- **Task 12:** Templates are source of truth
- **Task 13:** Demo apps are reference implementations
- **Task 16:** Next.js support (after Nuxt MVP)

## Notes

- Start with Nuxt only (Task 16 adds Next.js)
- Shadcn UI layer is optional (minimal is default)
- Mock mode is crucial for "try before API key" UX
- CLI should work without Mullion packages published (workspace resolution)

## When Complete

Mark as done when:

- [x] CLI generates all 4 Nuxt combinations
- [x] Generated projects build and run
- [x] Tests passing
- [x] Documentation complete

Then move to: **Task 16 - Next.js Support**

---

**Last Updated:** 2026-01-17
