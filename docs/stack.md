# Tech Stack — Decisions & Rationale

## TanStack Start (App Framework)

**What**: Full-stack React framework built on TanStack Router, powered by Vite/Vinxi.

**Why chosen over alternatives**:
- Combines Router + Query + Server Functions in one framework — no separate API server needed
- Server functions (`createServerFn`) give type-safe RPC from client to server without code generation
- TanStack Query integration is first-class — cache invalidation, optimistic updates built in
- File-based routing via TanStack Router
- Vite under the hood — fast dev server, HMR
- The project owner is experienced with TanStack ecosystem

**What it replaces**: A separate Hono/Express API server + a Vite SPA. TanStack Start collapses both into one deployment.

## shadcn/ui (Component Library)

**What**: Copy-paste component library built on Radix UI + Tailwind CSS.

**Why**: Not a dependency — components are copied into the project and owned by us. Full control, easy to customize, great defaults. The project owner prefers it.

## Drizzle ORM (Database Access)

**What**: TypeScript-first ORM with a SQL-like query builder.

**Why chosen over alternatives**:
- Lightweight, no heavy runtime like Prisma
- Excellent SQLite support via `better-sqlite3` or `libsql`
- Schema defined in TypeScript — shared between app and workers
- Generates migrations from schema diffs
- If we ever need to move to Postgres, it's a driver swap, not a rewrite

## SQLite (Database)

**What**: Single-file embedded database.

**Why chosen over Postgres**:
- Single-user local app — no concurrent write pressure
- Zero configuration — just a file on disk
- Easy to backup (copy one file), easy to inspect (any SQLite tool)
- Great for prompting — LLMs understand SQLite well
- Drizzle makes it trivial to swap to Postgres later if needed

**Location**: `data/rik.db` — mounted as a Docker volume.

**Caveat**: Both the app and the worker container need access to the same SQLite file. SQLite supports multiple readers but only one writer at a time. For this use case (single user, low write volume) this is fine. If it ever becomes a bottleneck, switch to Postgres or use `libsql` (Turso's fork with better concurrency).

## BullMQ + Redis (Background Jobs)

**What**: BullMQ is a Node.js job queue built on Redis.

**Why**:
- Stays in TypeScript — same language as the rest of the stack
- Redis is needed anyway (caching, pub/sub for live updates) so no extra infra
- Supports retries, delays, rate limiting, job priorities, repeatable jobs
- Worker runs as a separate container with its own entrypoint but shares the codebase

**Job types**:
- `process-mail` — parse incoming email, classify, store
- `extract-invoice` — pull structured data from invoice PDFs
- `llm-task` — generic LLM prompt execution
- `sync-agenda` — poll CalDAV source for calendar updates

## Stalwart Mail Server (Email)

**What**: Rust-based mail server supporting SMTP, IMAP, JMAP.

**Why chosen**:
- Lightweight, runs in Docker
- Can receive emails on SMTP port 25
- Supports webhooks — triggers HTTP call to Rik app when mail arrives
- No complex config — we just need it to receive and store mail, then notify us
- Alternative considered: Haraka (Node.js SMTP). Stalwart is more complete and battle-tested.

**How it's used**: User sets up a forwarding rule in their real mailbox (Gmail, Outlook, etc.) to forward copies of emails to Stalwart. Rik never has access to the user's real mailbox — it only gets what's forwarded.

## MinIO (Object Storage)

**What**: S3-compatible object storage that runs locally.

**Why**:
- Email attachments, PDFs, and extracted images need to be stored somewhere
- SQLite is not great for binary blobs
- MinIO gives us a standard S3 API — any S3 SDK works
- Dashboard/frontend can generate presigned URLs for direct file access
- Docker volume backed, easy to manage

## Ollama (Local LLM)

**What**: Local LLM runtime with an OpenAI-compatible API.

**Why**:
- Runs locally — no data leaves the machine
- Supports many models (llama3, mistral, gemma, etc.)
- OpenAI-compatible API means we can swap to a cloud provider by changing one env var
- Used for: email classification, invoice data extraction, task suggestions, summarization

**LLM client design**: The LLM client (`app/src/lib/llm.ts`) should accept a base URL and API key via env vars. Default: `http://ollama:11434/v1` with no key. Override with any OpenAI-compatible endpoint.

## Docker Compose (Infrastructure)

**What**: All services defined in one `docker-compose.yml`.

**Why**:
- `docker compose up` and everything works
- No cloud accounts, no external dependencies
- Each service is isolated in its own container
- Single `data/` directory for all persistent state — easy to backup, easy to nuke and restart
