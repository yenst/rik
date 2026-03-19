# Rik — AI Agent Instructions

## Project Overview

Rik is a self-hosted personal assistant that runs entirely in Docker. It provides a dashboard for agenda, email processing, invoice extraction, and task management. Privacy-first: everything runs locally, no data leaves the machine.

## Key Rules

- **Always check context7 for library documentation** before writing code that uses any library. Use `resolve-library-id` first, then `query-docs`. Do not rely on memory for API signatures — libraries change.
- This is a TypeScript-only project. No Python, no Go, no other languages.
- Keep things simple. SQLite, not Postgres. One app, not microservices.
- Read the `docs/` folder before starting any implementation work. It contains the full architecture and design decisions.
- **Always keep docs up to date.** If you change anything that is described in the `docs/` folder (architecture, schema, routes, docker setup, env vars, etc.), update the relevant doc file in the same PR/commit. Docs must never drift from reality.

## Tech Stack

- **Package Manager**: Bun (not npm/yarn/pnpm — always use `bun` for install, run, etc.)
- **App**: TanStack Start (Router + Query + Server Functions) + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: SQLite via Drizzle ORM
- **Background Jobs**: BullMQ + Redis
- **Email**: IMAP polling (works with Stalwart, Gmail, any IMAP server)
- **Object Storage**: MinIO (attachments, PDFs)
- **LLM**: Ollama (local, pluggable to OpenAI-compatible APIs)
- **Infrastructure**: Docker Compose

## Project Structure

```
rik/
├── CLAUDE.md              # You are here
├── docker-compose.yml
├── .env.example
├── docs/                  # Architecture & design docs — read these first
├── app/                   # TanStack Start application
│   ├── src/
│   │   ├── routes/        # File-based routes (TanStack Router)
│   │   ├── components/    # shadcn/ui components
│   │   ├── server/        # Server functions + DB + chat engine
│   │   └── lib/           # Shared utilities
│   └── worker/            # BullMQ worker (separate entrypoint)
├── packages/
│   └── cli/               # rik CLI — talk to Rik from terminal
└── data/                  # Docker volume mounts
```

## Conventions

- Use Drizzle for all database access. Schema lives in `app/src/server/db/schema.ts`.
- Use `createServerFn` from `@tanstack/react-start` for all server-side logic. No separate API server.
- Server function validators use `.inputValidator()` (not `.validator()`).
- Use BullMQ for anything that runs in the background (mail processing, LLM calls, invoice extraction).
- Components use shadcn/ui. Install new components via the shadcn CLI.
- Environment variables go in `.env` and are accessed only in server functions or workers.

## Code Style

Write clean, readable TypeScript. Prioritize clarity over cleverness.

- **Early returns** — guard clause first, happy path last. Don't nest business logic inside `if/else` blocks.
- **Small functions** — each function does one thing. If a function needs a comment explaining a section, that section should be its own function.
- **Explicit over implicit** — name things clearly, avoid abbreviations (except common ones like `id`, `db`, `fn`). A longer descriptive name beats a short cryptic one.
- **No `any`** — use proper types. If you need a generic record, use `Record<string, unknown>`.
- **Const by default** — use `const` everywhere. Only use `let` when reassignment is genuinely needed.
- **Destructure at the boundary** — destructure function params and API responses at the top, then work with named values.
- **Colocate related code** — keep server functions, types, and route components close to where they're used. Don't create barrel files or index re-exports.
- **Error handling** — throw descriptive errors in server functions. Let TanStack handle error boundaries in the UI. Don't silently swallow errors.
- **No dead code** — don't leave commented-out code, unused imports, or placeholder functions. Delete it.
- **Consistent patterns** — when adding a new feature, follow the same pattern as existing features (e.g., tasks CRUD → mail CRUD should look structurally identical).

## Common Tasks

- **Add a new page**: Create a route file in `app/src/routes/`.
- **Add a new server function**: Create or edit files in `app/src/server/functions/`.
- **Add a new background job**: Add a job processor in `app/worker/jobs/` and register it in `app/worker/index.ts`.
- **Add a new DB table**: Edit `app/src/server/db/schema.ts`, then run a Drizzle migration.
- **Add a UI component**: Use `bunx shadcn@latest add <component>` inside the `app/` directory.
