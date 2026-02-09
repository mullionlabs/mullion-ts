# Mullion Development TODO

**Current Sprint:** Task 17 - create-mullion + Next.js
**Active Task:** [TODO/ACTIVE.md](./ACTIVE.md)
**Status:** 🚧 In Progress

## Quick Navigation

- **[📍 Current Task](./ACTIVE.md)** - What I'm working on RIGHT NOW
- **[✅ Completed Tasks](./COMPLETED.md)** - Summary of finished work
- **[📂 All Tasks](./tasks/)** - Detailed task plans

## Progress Overview

```
✅ Foundation (Tasks 0-13) ━━━━━━━━━━━━━━━━━━━━━━━━ 100%
✅ Testing (Task 14)        ━━━━━━━━━━━━━━━━━━━━━━━━ 100%
✅ Sinks (Task 16)          ━━━━━━━━━━━━━━━━━━━━━━━━ 100%
📋 CLI Tools (Tasks 15 & 17) ━━━━━━━━━━━━━━━░░░░░░░░ 50%
✅ Provider Adapters (Task 18) ━━━━━━━━━━━━━━━━━━━━━━━━ 100%
```

## Task Status

| Task | Status | File                                                       | Summary                                                                    |
| ---- | ------ | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| 0-11 | ✅     | [01-11-foundation.md](./tasks/01-11-foundation.md)         | Core types, scope/bridge, ESLint, AI SDK, cache, fork/merge, cost, tracing |
| 12   | ✅     | [12-examples.md](./tasks/12-examples.md)                   | RAG & Helpdesk template packages                                           |
| 13   | ✅     | [13-demo-apps.md](./tasks/13-demo-apps.md)                 | Deployed demo apps with OAuth & rate limiting                              |
| 14   | ✅     | [14-integration-tests.md](./tasks/14-integration-tests.md) | Real provider integration tests with OpenAI/Anthropic                      |
| 15   | ✅     | [15-create-mullion.md](./tasks/15-create-mullion.md)       | `npm create mullion` CLI (Nuxt MVP)                                        |
| 16   | ✅     | [16-scoped-sinks.md](./tasks/16-scoped-sinks.md)           | Scoped sinks for logs, traces, caches                                      |
| 17   | 📋     | [17-nextjs-support.md](./tasks/17-nextjs-support.md)       | Next.js framework support                                                  |
| 18   | ✅     | [18-gemini-adapter.md](./tasks/18-gemini-adapter.md)       | Gemini adapter for `@mullion/ai-sdk` (cache + metrics + cost + tests)      |

## Milestones

- **v0.1.0** ✅ - Core functionality, ESLint rules, basic examples
- **v0.2.0** ✅ - Caching, fork/merge, cost tracking, tracing, demo apps
- **v0.3.0** 🔥 - Integration tests complete, create-mullion CLI (current)
- **v1.0.0** 📋 - Production-ready, full documentation, stable API

## How This Works

### For New Sessions (Claude Code):

1. **Start here** - Read this README.md for overview
2. **Check active** - Read [ACTIVE.md](./ACTIVE.md) for current focus
3. **Get details** - Read specific task file from `tasks/` folder
4. **Update progress** - Mark items complete in task file
5. **Update active** - Move to next task when current is done

### For Task Files:

- **Completed tasks** - Summary only (what was done, key decisions)
- **Active task** - Full detailed checklist
- **Future tasks** - Full plan ready to execute

### For Adding New Tasks:

1. Create `TODO/tasks/XX-task-name.md`
2. Add to task table in this README
3. Link from [ACTIVE.md](./ACTIVE.md) when you start it

## Archive

Old TODO files are in `TODO/archive/` for reference:

- `archive/TODO-legacy.md` - Original monolithic TODO
- `archive/TODO-history-legacy.md` - Original history file

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Development guide for Claude Code
- [docs/](../docs/) - Full project documentation
- [CHANGELOG.md](../CHANGELOG.md) - Version history

---

**Last Updated:** 2026-02-09
**Maintained By:** Claude Code + Human Review
