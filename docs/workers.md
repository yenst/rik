# Background Workers — BullMQ

## Overview

Background workers handle long-running or async tasks that shouldn't block the web UI. They run as a separate Docker container (`rik-worker`) using the same TypeScript codebase but with a different entrypoint.

Workers consume jobs from BullMQ queues (backed by Redis) and have access to SQLite, MinIO, and Ollama.

## Architecture

```
rik-app (server function)
  │
  │  mailQueue.add('process-mail', payload)
  ▼
Redis (BullMQ queue)
  │
  ▼
rik-worker (BullMQ Worker)
  ├── process-mail → parse, classify, store
  ├── extract-invoice → LLM extraction from PDF
  ├── llm-task → generic LLM prompt
  └── sync-agenda → CalDAV polling
```

## File Structure

```
app/worker/
├── index.ts              # Worker entrypoint — registers all job processors
├── jobs/
│   ├── process-mail.ts   # Email parsing + classification
│   ├── extract-invoice.ts # Invoice data extraction
│   ├── llm-task.ts       # Generic LLM job
│   └── sync-agenda.ts    # Calendar sync
└── Dockerfile            # Separate Dockerfile for worker container
```

## Queue Setup

Queues are defined in a shared module so both the app (producer) and worker (consumer) use the same queue names and connection:

```tsx
// app/src/lib/queues.ts
import { Queue } from 'bullmq'

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
}

export const mailQueue = new Queue('mail', { connection })
export const invoiceQueue = new Queue('invoice', { connection })
export const llmQueue = new Queue('llm', { connection })
export const agendaQueue = new Queue('agenda', { connection })
```

## Job Definitions

### process-mail

Triggered by: Stalwart webhook → server function → enqueue.

Steps:
1. Fetch raw email from Stalwart storage (or filesystem)
2. Parse email with a library like `mailparser` — extract from, to, subject, body (plain + HTML), attachments
3. Store attachments in MinIO, create `emailAttachments` records in SQLite
4. Store email metadata in SQLite (`emails` table)
5. Call LLM to classify the email (invoice, actionable, newsletter, personal, spam, other)
6. Update the email record with the classification
7. If classified as `invoice` and has PDF attachment → enqueue `extract-invoice` job

### extract-invoice

Triggered by: `process-mail` job when email is classified as an invoice.

Steps:
1. Pull the PDF/image attachment from MinIO
2. Convert to text if needed (PDF extraction, or OCR for images)
3. Send to LLM with a structured extraction prompt:
   - Vendor name
   - Invoice number
   - Total amount + currency
   - Issue date
   - Due date
   - Line items (if possible)
4. Parse LLM response, validate, store in `invoices` table
5. Link to the original email via `emailId`

### llm-task

Generic LLM execution for ad-hoc tasks.

Input: `{ prompt: string, context?: string, model?: string }`
Output: LLM response stored or returned via job result.

Used for: summarization, task suggestions, email replies drafting, etc.

### sync-agenda

Repeatable job (runs on a schedule, e.g., every 15 minutes).

Steps:
1. Fetch events from configured CalDAV URL
2. Diff against existing `agendaEvents` in SQLite
3. Insert new events, update changed events, mark deleted events
4. CalDAV URL and credentials stored as env vars

## Worker Entrypoint

```tsx
// app/worker/index.ts
import { Worker } from 'bullmq'
import { processMailJob } from './jobs/process-mail'
import { extractInvoiceJob } from './jobs/extract-invoice'
import { llmTaskJob } from './jobs/llm-task'
import { syncAgendaJob } from './jobs/sync-agenda'

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
}

new Worker('mail', processMailJob, { connection, concurrency: 2 })
new Worker('invoice', extractInvoiceJob, { connection, concurrency: 1 })
new Worker('llm', llmTaskJob, { connection, concurrency: 1 })
new Worker('agenda', syncAgendaJob, {
  connection,
  concurrency: 1,
  // Run every 15 minutes
})

console.log('Rik workers started')
```

## Error Handling

- All jobs should have retry logic configured at the queue level (e.g., 3 retries with exponential backoff).
- Failed jobs are kept in Redis for inspection via the dashboard (consider adding `bull-board` as a debug route in the app).
- LLM jobs should have timeouts — Ollama can be slow on first load. Default timeout: 120 seconds.

## Shared Code

Workers import from the same codebase:
- `app/src/server/db/` — Drizzle client and schema
- `app/src/lib/queues.ts` — Queue definitions
- `app/src/lib/llm.ts` — LLM client
- `app/src/lib/minio.ts` — MinIO client

This is why both the app and worker containers are built from the same codebase — they share types, schema, and utilities.
