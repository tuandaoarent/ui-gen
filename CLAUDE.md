# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies, generate Prisma client, run DB migrations
npm run setup

# Start dev server (uses cross-env for Windows compatibility)
npm run dev

# Run all tests
npm run test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Lint
npm run lint

# Reset database (destructive)
npm run db:reset
```

### Environment

Requires `.env` with `ANTHROPIC_API_KEY`. The app runs in mock mode (no API calls, predetermined responses) if the key is absent.

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language; Claude generates and refines them via streaming tool calls, and the result renders live in a sandboxed iframe.

### Request Flow

```
User message → ChatContext (useChat) → POST /api/chat
  → Reconstructs VirtualFileSystem from serialized state
  → streamText() with str_replace_editor + file_manager tools
  → Tool calls modify in-memory file tree
  → onFinish: persists messages + file tree to Project in SQLite
  ↓
Client stream → FileSystemContext applies tool-call file changes
  → refreshTrigger++ → PreviewFrame re-transforms JSX via Babel standalone
  → Updates iframe.srcdoc with new import map + code
```

### Key Architectural Decisions

**Virtual File System** — All files live in memory (Map-based tree in `src/lib/file-system.ts`), never on disk. State is JSON-serializable for database persistence and passed as context to every AI request. The AI edits files via the `str_replace_editor` and `file_manager` tools defined in `src/lib/tools/`.

**Dual-Mode AI Provider** — `src/lib/provider.ts` exposes either the real Anthropic model (`claude-haiku-4-5`) or a `MockLanguageModel` implementing Vercel AI SDK's `LanguageModelV1` interface. Mock mode streams predetermined component code without any API key.

**Client-Side JSX Transform** — `src/lib/transform/jsx-transformer.ts` uses `@babel/standalone` to transform JSX → JS in the browser. Third-party imports (e.g. `react`, `lucide-react`) are resolved via `esm.sh` CDN through an import map injected into the iframe. CSS imports are collected separately and injected as `<style>` tags.

**State Persistence** — `ChatContext` and `FileSystemContext` both hold JSON-serializable state. On every AI response, `/api/chat`'s `onFinish` hook stringifies both and saves them to `Project.messages` / `Project.data` in SQLite via Prisma.

**Anonymous Workflow** — Unauthenticated users can generate components. Work is tracked in sessionStorage via `src/lib/anon-work-tracker.ts` and can be saved to an account on sign-up.

### Routing

- `/` — Landing page; redirects authenticated users to their latest project
- `/[projectId]` — Authenticated project view; loads saved messages + file tree via `getProject()` server action
- `/api/chat` — Streaming AI endpoint; only route that writes to the database

### Data Models (Prisma / SQLite)

- `User`: id, email, hashedPassword
- `Project`: id, name, userId (optional for anonymous), messages (JSON string), data (JSON string)

### Path Alias

`@/*` maps to `src/*` throughout the codebase.

### Testing

Tests live in `__tests__/` directories co-located with components. Uses Vitest + jsdom + `@testing-library/react`.
