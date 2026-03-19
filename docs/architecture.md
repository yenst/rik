# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────┐
│                  Docker Compose                  │
├─────────────────────────┬───────────────────────┤
│       Rik App           │      Worker           │
│    TanStack Start       │     BullMQ            │
│  ┌───────────────────┐  │  - Mail processor     │
│  │ Routes / UI       │  │  - Invoice extractor  │
│  │ (shadcn + Query)  │  │  - LLM tasks          │
│  ├───────────────────┤  │                       │
│  │ Server Functions  │  │  (same TS codebase,   │
│  │ (Drizzle + SQLite)│  │   separate entrypoint)│
│  └───────────────────┘  │                       │
│        :3000            │                       │
├─────────────────────────┴───────────────────────┤
│       Redis        │  MinIO (S3)                │
│       :6379        │  :9000                     │
├────────────────────┴────────────────────────────┤
│              Stalwart Mail Server                │
│              SMTP :25 / IMAP :993                │
├─────────────────────────────────────────────────┤
│              Ollama :11434                        │
└─────────────────────────────────────────────────┘
```

## Design Principles

1. **Local-first**: Everything runs on the user's machine inside Docker. No cloud dependencies.
2. **Contained**: Rik has no access to the host filesystem beyond its own `data/` volume. It can't read your files, it only processes what you explicitly send it (forwarded emails, manual tasks).
3. **Single-user**: No multi-tenancy, no OAuth, no complex auth. A simple API key or local-only access is sufficient.
4. **One language**: TypeScript everywhere — app, server functions, workers, shared types.
5. **Simple storage**: SQLite for structured data (one file, easy to backup/inspect). MinIO only for binary blobs.
6. **LLM-pluggable**: Ollama is the default (privacy), but the LLM client should accept any OpenAI-compatible API endpoint via env var.

## Data Flow

### Email Processing

```
External mailbox (Gmail, Outlook, etc.)
  │
  │  forwarding rule
  ▼
Stalwart Mail Server (SMTP :25)
  │
  │  webhook on receive
  ▼
Rik App — Server Function (receives webhook)
  │
  │  enqueues job
  ▼
BullMQ (Redis)
  │
  ▼
Worker: process-mail job
  ├── Parse email (from, to, subject, body, attachments)
  ├── Store attachments → MinIO
  ├── Store email metadata → SQLite
  ├── Classify email via LLM (invoice, newsletter, actionable, etc.)
  └── If invoice → enqueue extract-invoice job
        │
        ▼
      Worker: extract-invoice job
        ├── Pull PDF/image from MinIO
        ├── Extract structured data via LLM (vendor, amount, date, line items)
        └── Store invoice record → SQLite
```

### Task Management

```
User (Dashboard UI)
  │
  │  creates/updates task
  ▼
TanStack Start Server Function
  │
  │  Drizzle ORM
  ▼
SQLite (rik.db)
  │
  │  TanStack Query invalidation
  ▼
UI updates automatically
```

### Agenda

```
Source: CalDAV / ICS file upload / manual entry
  │
  ▼
Server Function → SQLite
  │
  ▼
Dashboard widget shows upcoming events
```

## Container Responsibilities

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `rik-app` | Custom (TanStack Start) | 3000 | Web UI + server functions |
| `rik-worker` | Custom (same codebase) | — | Background job processing |
| `redis` | redis:7-alpine | 6379 | Job queue (BullMQ) + caching |
| `minio` | minio/minio | 9000, 9001 | Object storage for attachments |
| `stalwart` | stalwartlabs/mail-server | 25, 993 | Receives forwarded emails |
| `ollama` | ollama/ollama | 11434 | Local LLM inference |

### Chat (CLI / Web / Discord)

```
Client (CLI, Web chat, Discord bot)
  │
  │  POST /api/chat { message, conversationId, client }
  ▼
Server Function: chat.ts
  │
  ├── Load conversation history from SQLite
  ├── Build prompt (system + history + tools)
  ├── Call LLM with tool definitions
  │     │
  │     ├── LLM returns text → send to client
  │     └── LLM returns tool call (e.g. create_task)
  │           │
  │           ├── Execute tool (reuses existing server function logic)
  │           ├── Feed result back to LLM
  │           └── LLM returns final text → send to client
  │
  └── Store all messages in SQLite (conversations + messages tables)
```

## Inter-Service Communication

- **App ↔ SQLite**: Direct file access (SQLite file is on a shared Docker volume)
- **App ↔ Redis**: TCP connection for enqueuing BullMQ jobs
- **Worker ↔ Redis**: TCP connection for consuming BullMQ jobs
- **Worker ↔ SQLite**: Direct file access (same volume as app)
- **Worker ↔ MinIO**: S3-compatible HTTP API
- **Worker ↔ Ollama**: HTTP API (OpenAI-compatible)
- **Stalwart ↔ App**: Webhook HTTP call on email receive
