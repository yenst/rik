# Build Phases

Each phase produces a working, runnable state. No phase depends on a later phase.

---

## Phase 1 — Project Skeleton & Infrastructure

**Goal**: `docker compose up` boots everything, app shows a blank shell in the browser.

### Steps

1. Initialize the TanStack Start app in `app/` with Vite, TypeScript, TanStack Router
2. Install and configure Tailwind CSS + shadcn/ui (add a few base components: `button`, `card`, `sidebar`, `input`)
3. Set up the root layout (`__root.tsx`) with a sidebar shell (links to Dashboard, Mail, Tasks, Invoices — all placeholder pages)
4. Set up Drizzle ORM with SQLite (`better-sqlite3`), create the db client in `app/src/server/db/index.ts`
5. Create the full schema in `app/src/server/db/schema.ts` (all tables: tasks, emails, invoices, agenda_events, email_attachments) and generate the initial migration
6. Write `app/Dockerfile` for the app container
7. Write `docker-compose.yml` with all services: rik-app, redis, minio, stalwart, ollama
8. Create `config/stalwart.toml` with basic receive-only config
9. Create `.env.example` and `.env` with defaults
10. Verify: `docker compose up` boots, app is reachable at `localhost:3000`, SQLite db is created with tables

### Delivers

- Running app shell with navigation
- All infrastructure services up
- Database ready with schema
- Foundation for all subsequent phases

---

## Phase 2 — Tasks

**Goal**: Full task management — create, list, update, complete, delete tasks from the UI.

**Why first**: Tasks are the simplest feature. No external service dependencies (no mail, no LLM, no MinIO). This validates the full data flow: UI → server function → Drizzle → SQLite → back to UI via TanStack Query.

### Steps

1. Implement server functions in `app/src/server/functions/tasks.ts`:
   - `getTasks` — list all tasks with filtering (status, priority)
   - `getTask` — single task by ID
   - `createTask` — create with title, description, priority, due date
   - `updateTask` — update any field
   - `deleteTask` — soft or hard delete
2. Build the tasks route (`app/src/routes/tasks/index.tsx`):
   - Task list with status badges and priority indicators
   - Quick-add input at the top (just title, press enter)
   - Click to expand/edit a task inline or navigate to detail
   - Checkbox to mark complete
   - Filter by status (open / done / all)
3. Build the task detail route (`app/src/routes/tasks/$taskId.tsx`):
   - Full edit form (title, description, priority, due date, status)
   - Delete button
4. Wire up TanStack Query for cache invalidation on mutations

### Delivers

- Fully working task CRUD
- Validated end-to-end data flow pattern
- Reusable patterns for subsequent features

---

## Phase 3 — Dashboard

**Goal**: Dashboard home page showing an overview of tasks (and placeholders for mail/agenda).

**Why now**: We have tasks data to display. Build the dashboard layout early so subsequent features just plug in widgets.

### Steps

1. Build dashboard route (`app/src/routes/index.tsx`) with a grid layout
2. Build `tasks-widget.tsx` — shows open tasks sorted by due date, top 5-10
3. Add placeholder `mail-widget.tsx` — empty state: "No emails yet — set up forwarding to get started"
4. Add placeholder `agenda-widget.tsx` — empty state: "No upcoming events"
5. Add quick-add task input directly on the dashboard
6. Add command palette (⌘K) using shadcn `command` component — for now, just task creation and navigation

### Delivers

- Functional home screen
- Widget-based layout ready for mail and agenda data
- Keyboard-driven quick actions

---

## Phase 4 — BullMQ Worker Setup

**Goal**: Background worker running, able to process jobs. No actual job logic yet — just the infrastructure.

**Why now**: The email pipeline (next phase) depends on background jobs. Set up the plumbing first.

### Steps

1. Create `app/src/lib/queues.ts` — define all queues (mail, invoice, llm, agenda)
2. Create `app/worker/index.ts` — worker entrypoint that registers processors
3. Create stub job processors in `app/worker/jobs/` (log and complete, no real logic)
4. Create `app/worker/Dockerfile`
5. Add `rik-worker` service to `docker-compose.yml`
6. Add a server function `app/src/server/functions/jobs.ts` to enqueue test jobs
7. Verify: enqueue a job from the app, see it processed by the worker in logs

### Delivers

- Worker container running alongside app
- Job enqueue/process flow verified
- Ready for real job implementations

---

## Phase 5 — Email Receiving & Processing

**Goal**: Forward an email to Stalwart → it appears in the Rik UI classified and readable.

### Steps

1. Configure Stalwart webhook to call `POST http://rik-app:3000/api/webhooks/mail` on new email
2. Implement `app/src/server/functions/webhooks.ts` — receive webhook, enqueue `process-mail` job
3. Implement `app/worker/jobs/process-mail.ts`:
   - Fetch raw email from Stalwart storage
   - Parse with `mailparser` (from, to, subject, body, attachments)
   - Store attachments in MinIO via `app/src/lib/minio.ts`
   - Store email metadata + attachment records in SQLite
   - Classify email via LLM (implement `app/src/lib/llm.ts` — Ollama client)
   - Update email record with classification
4. Set up MinIO client (`app/src/lib/minio.ts`) with bucket creation on startup
5. Set up LLM client (`app/src/lib/llm.ts`) with OpenAI SDK pointing at Ollama
6. Implement email server functions in `app/src/server/functions/mail.ts`:
   - `getEmails` — list with filtering by classification, read status
   - `getEmail` — single email with attachments
   - `markAsRead` — toggle read status
7. Build email list route (`app/src/routes/mail/index.tsx`):
   - Email list with from, subject, date, classification badge
   - Unread indicator
   - Filter by classification
8. Build email detail route (`app/src/routes/mail/$emailId.tsx`):
   - Full email view (from, to, subject, body)
   - Attachment list with download links (presigned MinIO URLs)
   - Classification badge
9. Update `mail-widget.tsx` on dashboard — show 5 most recent emails

### Delivers

- Full email receive → process → display pipeline
- LLM classification working
- MinIO storage working
- Dashboard mail widget live

---

## Phase 6 — Invoice Extraction

**Goal**: Emails classified as invoices automatically get structured data extracted.

### Steps

1. Implement `app/worker/jobs/extract-invoice.ts`:
   - Triggered by `process-mail` when classification is `invoice`
   - Pull PDF attachment from MinIO
   - Extract text from PDF (use `pdf-parse` or similar)
   - Send to LLM with invoice extraction prompt
   - Parse JSON response, validate
   - Store in `invoices` table linked to email
2. Implement invoice server functions in `app/src/server/functions/invoices.ts`:
   - `getInvoices` — list with filtering by status, vendor
   - `getInvoice` — single invoice with linked email
   - `updateInvoice` — edit extracted data (manual corrections)
   - `markAsPaid` — update status
3. Build invoice list route (`app/src/routes/invoices/index.tsx`):
   - Table view: vendor, invoice number, amount, due date, status
   - Status badges (pending, paid, overdue)
   - Filter by status
4. Build invoice detail route (`app/src/routes/invoices/$invoiceId.tsx`):
   - Extracted data display with edit capability
   - Link to original email
   - PDF viewer / download
5. Add overdue detection — a repeatable BullMQ job that checks for invoices past due date and marks them overdue

### Delivers

- Automatic invoice extraction from forwarded emails
- Editable invoice records
- Overdue tracking

---

## Phase 7 — Chat Engine & CLI

**Goal**: Talk to Rik from the terminal and the web dashboard. Rik can take actions (create tasks, search emails, etc.) via LLM tool use.

**Why now**: All the data features exist (tasks, email, invoices). The chat engine wires them together into a conversational interface. See `docs/chat.md` for full design.

### Steps

1. Add `conversations` and `messages` tables to the Drizzle schema
2. Define LLM tool schemas — each tool maps to an existing server function:
   - `create_task`, `list_tasks`, `complete_task`
   - `search_emails`, `get_email`
   - `list_invoices`, `mark_invoice_paid`
   - `get_agenda`, `create_event`
3. Implement `app/src/server/functions/chat.ts`:
   - Accept message + optional conversationId
   - Load conversation history from SQLite
   - Build prompt: system prompt + history + user message + tool definitions
   - Call LLM (Ollama / OpenAI-compatible) with tools
   - If tool call → execute it using existing server function logic → feed result back to LLM
   - Store all messages (user, assistant, tool calls/results) in SQLite
   - Return final response + actions array
4. Build the CLI client in `packages/cli/`:
   - `rik "message"` — one-shot mode
   - `rik chat` — interactive REPL
   - Reads endpoint from `~/.rikrc` or defaults to `http://localhost:3000`
   - Renders tool actions nicely in terminal (e.g., "Created task: ...")
5. Add web chat to the dashboard:
   - Slide-out chat panel or `/chat` route
   - Message input, conversation history, tool action cards inline
   - Streaming response via Server-Sent Events (if LLM supports it)
6. Add chat widget to dashboard — small input bar at the bottom for quick messages

### Delivers

- Conversational interface to all Rik features
- CLI tool for terminal-first usage
- Web chat in the dashboard
- LLM tool use loop working end-to-end
- Conversation history persisted

---

## Phase 8 — Agenda

**Goal**: Calendar events visible on dashboard, manually addable, optionally synced from CalDAV.

### Steps

1. Implement agenda server functions in `app/src/server/functions/agenda.ts`:
   - `getEvents` — list events for a date range
   - `getUpcoming` — next N events from now
   - `createEvent` — manual event creation
   - `updateEvent` / `deleteEvent`
2. Build agenda route (or integrate into dashboard):
   - Calendar view (week/day) or simple list of upcoming events
   - Create event form (title, date/time, location, description)
3. Update `agenda-widget.tsx` on dashboard — show today's and upcoming events
4. Implement `app/worker/jobs/sync-agenda.ts`:
   - Poll CalDAV URL (if configured) on a schedule
   - Diff and sync events to SQLite
   - Mark source as `caldav` and store external ID for dedup
5. Add ICS file import — upload an `.ics` file, parse events, store in SQLite

### Delivers

- Agenda visible on dashboard
- Manual event management
- Optional CalDAV sync
- ICS import

---

## Phase 9 — Polish & QoL

**Goal**: Make it feel finished — keyboard shortcuts, search, notifications, error handling.

### Steps

1. Global search via command palette (⌘K) — search across tasks, emails, invoices
2. Keyboard shortcuts: `t` for new task, `n` for next unread email, etc.
3. Toast notifications for background job completion (email processed, invoice extracted)
4. Error boundaries and loading skeletons on all routes
5. Dark mode toggle (shadcn supports this out of the box)
6. Mobile-responsive tweaks (not priority but shouldn't be broken)
7. Health check endpoint for Docker (`GET /api/health`)
8. Startup script that runs migrations, creates MinIO buckets, pulls Ollama model
9. `README.md` with setup instructions

### Delivers

- Polished, usable personal assistant
- Keyboard-driven workflow
- Robust error handling
- One-command setup (`docker compose up`)
