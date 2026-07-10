# create-mullion

> **Status: frozen.** This scaffolder is no longer actively maintained. Its
> templates pin older `@mullion/*` and framework versions and are not tracked
> against current AI SDK releases, so generated projects may need dependency
> updates before they build. The core libraries (`@mullion/core`,
> `@mullion/eslint-plugin`, `@mullion/ai-sdk`) are unaffected.

**Scaffold Mullion-powered LLM applications with a single command.**

Get a production-ready app with type-safe context management, scope isolation, and real/mock LLM providers — running in seconds.

Supports both **Nuxt 4** and **Next.js (App Router)** templates.

## Quick Start

```bash
# Interactive mode (recommended)
npm create mullion@latest

# With options
npm create mullion@latest my-app --framework nuxt --scenario rag --ui minimal
npm create mullion@latest my-app --framework next --scenario rag --ui minimal
```

## Features

- 🚀 **Zero config** — works without API keys (mock mode)
- 🎯 **Production patterns** — RAG pipelines, helpdesk systems
- 🔒 **Scope isolation** — built-in trust boundary enforcement
- 🎨 **UI variants** — minimal CSS or shadcn-style UI
- 📦 **Framework support** — Nuxt 4+ and Next.js App Router
- ✅ **Type-safe** — full TypeScript support out of the box

## What You Get

Every generated project includes:

- **Working Mullion implementation** with scope isolation
- **Mock mode** for development without API keys
- **Real provider support** (OpenAI, Anthropic)
- **Complete UI** with forms, results display
- **API endpoints** ready to extend
- **TypeScript configuration** for strict type safety

## Options

### Interactive Mode

```bash
npm create mullion@latest
```

You'll be prompted for:

- Project name
- Framework (Nuxt or Next.js)
- Scenario (RAG or Helpdesk)
- UI style (minimal or shadcn)
- Package manager (auto-detected)
- Install dependencies (yes/no)
- Initialize git (yes/no)

### CLI Flags

```bash
npm create mullion@latest <project-name> [options]
```

**Options:**

| Flag                         | Values                       | Default     | Description                |
| ---------------------------- | ---------------------------- | ----------- | -------------------------- |
| `--framework`                | `nuxt`, `next`               | `nuxt`      | Framework to use           |
| `--scenario`                 | `rag`, `helpdesk`            | `rag`       | Application scenario       |
| `--ui`                       | `minimal`, `shadcn`          | `minimal`   | UI library                 |
| `--pm`                       | `pnpm`, `npm`, `yarn`, `bun` | auto-detect | Package manager            |
| `--install` / `--no-install` | boolean                      | `true`      | Install dependencies       |
| `--git` / `--no-git`         | boolean                      | `true`      | Initialize git             |
| `--yes`                      | boolean                      | `false`     | Skip prompts, use defaults |

**Examples:**

```bash
# RAG app with minimal UI
npm create mullion@latest my-rag-app --scenario rag --ui minimal

# Helpdesk app with Nuxt UI
npm create mullion@latest support-app --scenario helpdesk --ui shadcn

# Skip all prompts
npm create mullion@latest quick-app --yes
```

## Scenarios

### RAG (Retrieval-Augmented Generation)

A document retrieval and question-answering system with:

- **Role-based access control** (public/internal/confidential)
- **Fork/merge patterns** for parallel document processing
- **Source attribution** in responses
- **Access level enforcement** via Mullion scopes

**Use case:** Knowledge bases, document search, Q&A systems

### Helpdesk

A customer support ticket analysis system with:

- **Admin/public scope isolation** preventing internal notes from leaking
- **Ticket classification** and routing
- **Safe data sanitization** before customer responses
- **Audit trail** for all scope crossings

**Use case:** Support systems, ticketing, customer service

## UI Variants

### Minimal

Clean, dependency-free CSS with:

- Custom CSS variables for theming
- Responsive design
- No external dependencies
- ~5KB total CSS

**Best for:** Simple apps, learning, minimal bundle size

### Shadcn (UI variant)

Modern UI with Tailwind + component primitives:

- Pre-built components (Card, Button, Textarea, etc.)
- Tailwind CSS v4
- Accessibility-friendly defaults
- Framework-adapted styling (Nuxt UI v4 for Nuxt, shadcn-style for Next)

**Best for:** Production apps, rich interactions, consistent design

## Project Structure

### Nuxt (framework: `nuxt`)

```
my-app/
├── app/                    # Client-side code (Nuxt 4)
│   ├── app.vue            # Main app component
│   ├── pages/
│   │   └── index.vue      # Landing page with scenario UI
│   ├── components/        # Vue components
│   │   ├── QueryInput.vue
│   │   └── ResultCard.vue
│   └── assets/
│       └── css/
│           └── main.css   # Global styles
├── schemas.ts             # Shared Zod schemas (server + client)
├── server/                # Server-side code
│   ├── api/               # API endpoints
│   │   └── query.post.ts  # Main query endpoint
│   └── utils/
│       └── mullion/       # Mullion business logic
│           ├── provider.ts    # LLM provider selection
│           └── pipeline.ts    # Main processing logic (scenario-specific)
├── public/                # Static assets
├── nuxt.config.ts         # Nuxt configuration
├── tsconfig.json          # TypeScript config
├── package.json           # Dependencies
├── .env.example           # Environment template
└── .gitignore             # Git ignores
```

### Next.js (framework: `next`)

```
my-app/
├── src/
│   ├── app/               # App Router pages + API routes
│   │   ├── api/           # Route handlers
│   │   └── page.tsx       # Landing page with scenario UI
│   ├── components/        # React components
│   │   ├── QueryInput.tsx
│   │   ├── ResultCard.tsx
│   │   └── Header.tsx
│   ├── mullion/           # Mullion business logic
│   │   ├── provider.ts    # LLM provider selection
│   │   └── pipeline.ts    # Main processing logic (scenario-specific)
│   └── schemas.ts         # Shared Zod schemas (server + client)
├── next.config.mjs        # Next.js configuration
├── tsconfig.json          # TypeScript config
├── package.json           # Dependencies
├── .env.example           # Environment template
└── .gitignore             # Git ignores
```

## After Generation

### 1. Start Development Server

```bash
cd my-app
pnpm dev
```

The app runs in **mock mode** by default (no API key required).

### 2. Add Real LLM Provider (Optional)

Copy `.env.example` to `.env` and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:

**Nuxt:**

```env
# Add ONE of these (first found is used):
NUXT_ANTHROPIC_API_KEY=sk-ant-...
NUXT_OPENAI_API_KEY=sk-...

# Optional: disable strict JSON schema for OpenAI structured outputs
# NUXT_OPENAI_STRICT_JSON_SCHEMA=false
```

**Next.js:**

```env
# Add ONE of these (first found is used):
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional: disable strict JSON schema for OpenAI structured outputs
# OPENAI_STRICT_JSON_SCHEMA=false
```

Restart the dev server — you're now using a real LLM!

### 3. Customize

- **Modify scenarios:** `server/utils/mullion/*.ts` (Nuxt) or `src/mullion/*.ts` (Next)
- **Update UI:** `app/pages/index.vue` (Nuxt) or `src/app/page.tsx` (Next)
- **Add endpoints:** `server/api/` (Nuxt) or `src/app/api/` (Next)
- **Change styling:** `app/assets/css/main.css` (Nuxt) or `src/app/globals.css` (Next)

## Mock Mode

Generated apps work without API keys using Mullion's mock mode:

- ✅ **Full type safety** — same types as real providers
- ✅ **Predictable outputs** — good for testing UI
- ✅ **No rate limits** — develop freely
- ✅ **Banner notification** — clear visual indicator

The UI shows a banner: "⚠️ Mock mode — add API key to .env for real results"

## Technical Details

### Dependencies

**Core (all frameworks):**

- `@mullion/core` — Mullion primitives
- `@mullion/ai-sdk` — AI SDK integration
- `ai` — Vercel AI SDK
- `zod` — Schema validation

**Framework:**

- Nuxt: `nuxt`, `vue`
- Next.js: `next`, `react`, `react-dom`

**Providers (included):**

- `@ai-sdk/openai` — OpenAI support
- `@ai-sdk/anthropic` — Anthropic support

**UI (shadcn only):**

- Nuxt: `@nuxt/ui`, `tailwindcss`
- Next.js: `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`

### Nuxt 4 Structure

Generated projects use Nuxt 4 conventions:

- `app/` directory for client code
- `server/` directory at root (not nested in `app/`)
- TypeScript strict mode

### Next.js Structure

Generated projects use App Router conventions:

- `src/app/` for pages + route handlers
- `src/mullion/` for scenario logic
- Environment variables stay server-only (no `NEXT_PUBLIC_*` for keys)

### Provider Selection

The generated provider checks for API keys in order:

**Nuxt (`server/utils/mullion/provider.ts`):**

1. `NUXT_ANTHROPIC_API_KEY` → uses `claude-3-5-haiku-20241022`
2. `NUXT_OPENAI_API_KEY` → uses `gpt-4o-mini`
3. No keys → uses mock mode

**Next.js (`src/mullion/provider.ts`):**

1. `ANTHROPIC_API_KEY` → uses `claude-3-5-haiku-20241022`
2. `OPENAI_API_KEY` → uses `gpt-4o-mini`
3. No keys → uses mock mode

You can customize models by editing `provider.ts`.

## Examples

### Generate RAG app with minimal UI (Nuxt)

```bash
npm create mullion@latest my-rag --scenario rag --ui minimal
cd my-rag
pnpm dev
```

Visit http://localhost:3000 — ask questions about documents!

### Generate Helpdesk app with shadcn UI (Nuxt)

```bash
npm create mullion@latest support --scenario helpdesk --ui shadcn
cd support
pnpm install  # (if --no-install was used)
pnpm dev
```

Visit http://localhost:3000 — analyze support tickets!

### Generate RAG app with minimal UI (Next.js)

```bash
npm create mullion@latest next-rag --framework next --scenario rag --ui minimal
cd next-rag
pnpm dev
```

Visit http://localhost:3000 — ask questions about documents!

## Troubleshooting

### "Module not found" errors

Make sure dependencies are installed:

```bash
pnpm install
```

### Build fails

Try cleaning and rebuilding:

```bash
# Nuxt
rm -rf .nuxt node_modules
pnpm install
pnpm dev

# Next.js
rm -rf .next node_modules
pnpm install
pnpm dev
```

### Mock mode doesn't work

Check that `.env` doesn't exist or has empty values:

```env
# Nuxt
NUXT_OPENAI_API_KEY=
NUXT_ANTHROPIC_API_KEY=

# Next.js
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### Types not found

Nuxt and Next.js generate types on first run. Try:

```bash
pnpm dev
# Nuxt: wait for "Types generated in .nuxt"
# Next.js: wait for .next/types to appear
```

## Next Steps

- **Learn Mullion:** See [Mullion docs](https://github.com/mullionlabs/mullion-ts)
- **Add more scenarios:** Copy patterns from `examples/`
- **Deploy:** See [deployment guides](../../docs/guides/deployment.md)
- **Customize provider:** `server/utils/mullion/provider.ts` (Nuxt) or `src/mullion/provider.ts` (Next)

## What's Different from Templates?

`create-mullion` is a **project generator**, not a template:

- **Copies code** into your project (no runtime dependency)
- **Merges overlays** (base + scenario + UI)
- **Customizable** after generation (it's your code now)
- **Version-locked** dependencies from monorepo catalog

Templates are in `@mullion/template-*` packages for reference.

## Package Manager Support

Works with all major package managers:

```bash
# npm
npm create mullion@latest

# pnpm
pnpm create mullion@latest

# yarn
yarn create mullion

# bun
bun create mullion@latest
```

The generator auto-detects your package manager from lock files.

## Requirements

- **Node.js:** 18+ (20+ recommended)
- **Package manager:** npm 7+, pnpm 8+, yarn 1.22+, or bun 1+
- **OS:** macOS, Linux, Windows (WSL recommended)

## License

MIT

## Links

- [Mullion Repository](https://github.com/mullionlabs/mullion-ts)
- [Documentation](https://github.com/mullionlabs/mullion-ts/tree/main/docs)
- [Examples](https://github.com/mullionlabs/mullion-ts/tree/main/examples)
- [Report Issues](https://github.com/mullionlabs/mullion-ts/issues)
