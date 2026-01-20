# create-mullion

**Scaffold Mullion-powered LLM applications with a single command.**

Get a production-ready app with type-safe context management, scope isolation, and real/mock LLM providers — running in seconds.

Note: The generator currently scaffolds Nuxt templates only. Next.js support is planned.

## Quick Start

```bash
# Interactive mode (recommended)
npm create mullion@latest

# With options
npm create mullion@latest my-app --framework nuxt --scenario rag --ui minimal
```

## Features

- 🚀 **Zero config** — works without API keys (mock mode)
- 🎯 **Production patterns** — RAG pipelines, helpdesk systems
- 🔒 **Scope isolation** — built-in trust boundary enforcement
- 🎨 **UI variants** — minimal CSS or Nuxt UI v4
- 📦 **Framework support** — Nuxt 4+ (Next.js coming soon)
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
- Framework (Nuxt)
- Scenario (RAG or Helpdesk)
- UI style (minimal or Nuxt UI)
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
| `--framework`                | `nuxt`                       | `nuxt`      | Framework to use           |
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

### Nuxt UI (shadcn variant)

Modern UI with Nuxt UI v4:

- Pre-built components (Card, Button, Textarea, etc.)
- Tailwind CSS v4
- Dark mode support
- Accessibility built-in

**Best for:** Production apps, rich interactions, consistent design

## Project Structure

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

```env
# Add ONE of these (first found is used):
NUXT_ANTHROPIC_API_KEY=sk-ant-...
NUXT_OPENAI_API_KEY=sk-...

# Optional: disable strict JSON schema for OpenAI structured outputs
# NUXT_OPENAI_STRICT_JSON_SCHEMA=false
```

Restart the dev server — you're now using a real LLM!

### 3. Customize

- **Modify scenarios:** Edit `server/utils/mullion/*.ts`
- **Update UI:** Edit `app/pages/index.vue` and components
- **Add endpoints:** Create new files in `server/api/`
- **Change styling:** Edit `app/assets/css/main.css`

## Mock Mode

Generated apps work without API keys using Mullion's mock mode:

- ✅ **Full type safety** — same types as real providers
- ✅ **Predictable outputs** — good for testing UI
- ✅ **No rate limits** — develop freely
- ✅ **Banner notification** — clear visual indicator

The UI shows a banner: "⚠️ Mock mode — add API key to .env for real results"

## Technical Details

### Dependencies

**Core:**

- `nuxt` (^4.0.0) — Nuxt 4 framework
- `@mullion/core` — Mullion primitives
- `@mullion/ai-sdk` — AI SDK integration
- `ai` — Vercel AI SDK
- `zod` (^4.0.0) — Schema validation

**Providers (included):**

- `@ai-sdk/openai` — OpenAI support
- `@ai-sdk/anthropic` — Anthropic support

**UI (shadcn only):**

- `@nuxt/ui` (^4.0.0) — Nuxt UI components
- `tailwindcss` (^4.0.0) — Utility CSS

### Nuxt 4 Structure

Generated projects use Nuxt 4 conventions:

- `app/` directory for client code
- `server/` directory at root (not nested in `app/`)
- TypeScript strict mode

### Provider Selection

The generated `server/utils/mullion/provider.ts` checks for API keys in order:

1. `NUXT_ANTHROPIC_API_KEY` → uses `claude-3-5-haiku-20241022`
2. `NUXT_OPENAI_API_KEY` → uses `gpt-4o-mini`
3. No keys → uses mock mode

You can customize models by editing `provider.ts`.

## Examples

### Generate RAG app with minimal UI

```bash
npm create mullion@latest my-rag --scenario rag --ui minimal
cd my-rag
pnpm dev
```

Visit http://localhost:3000 — ask questions about documents!

### Generate Helpdesk app with Nuxt UI

```bash
npm create mullion@latest support --scenario helpdesk --ui shadcn
cd support
pnpm install  # (if --no-install was used)
pnpm dev
```

Visit http://localhost:3000 — analyze support tickets!

## Troubleshooting

### "Module not found" errors

Make sure dependencies are installed:

```bash
pnpm install
```

### Build fails

Try cleaning and rebuilding:

```bash
rm -rf .nuxt node_modules
pnpm install
pnpm dev
```

### Mock mode doesn't work

Check that `.env` doesn't exist or has empty values:

```env
NUXT_OPENAI_API_KEY=
NUXT_ANTHROPIC_API_KEY=
```

### Types not found

Nuxt generates types on first run. Try:

```bash
pnpm dev
# Wait for "Types generated in .nuxt"
```

## Next Steps

- **Learn Mullion:** See [Mullion docs](https://github.com/mullionlabs/mullion-ts)
- **Add more scenarios:** Copy patterns from `examples/`
- **Deploy:** See [deployment guides](../../docs/guides/deployment.md)
- **Customize provider:** Edit `server/utils/mullion/provider.ts`

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
