# Server Functions & Database

## Server Functions

All backend logic runs as TanStack Start server functions using `createServerFn` from `@tanstack/react-start`. There is no separate API server.

Server functions live in `app/src/server/functions/` and are organized by domain:

```
server/functions/
├── mail.ts        # Email CRUD, classification, search
├── tasks.ts       # Task CRUD, status updates, priorities
├── invoices.ts    # Invoice CRUD, extracted data
├── agenda.ts      # Calendar events, upcoming items
├── chat.ts        # Chat endpoint — LLM + tool use orchestration
├── webhooks.ts    # Stalwart mail webhook receiver
└── jobs.ts        # Enqueue BullMQ jobs
```

### Pattern

```tsx
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { tasks } from '../db/schema'
import { eq } from 'drizzle-orm'

export const getTasks = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(tasks).orderBy(tasks.dueDate)
})

export const createTask = createServerFn({ method: 'POST' })
  .validator(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
  }))
  .handler(async ({ data }) => {
    const [task] = await db.insert(tasks).values(data).returning()
    return task
  })

export const completeTask = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const [task] = await db
      .update(tasks)
      .set({ completedAt: new Date().toISOString() })
      .where(eq(tasks.id, data.id))
      .returning()
    return task
  })
```

### Webhook Receiver

Stalwart calls a webhook when a new email arrives. This is a server function that receives the HTTP POST and enqueues a BullMQ job:

```tsx
// server/functions/webhooks.ts
import { createServerFn } from '@tanstack/react-start'
import { mailQueue } from '../../lib/queues'

export const onMailReceived = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    await mailQueue.add('process-mail', {
      messageId: data.messageId,
      from: data.from,
      to: data.to,
      subject: data.subject,
      rawPath: data.rawPath, // path to raw email in Stalwart storage
    })
    return { ok: true }
  })
```

## Database — Drizzle + SQLite

### Setup

The database client lives in `app/src/server/db/index.ts`:

```tsx
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

const sqlite = new Database(process.env.DATABASE_PATH || '/data/rik.db')
sqlite.pragma('journal_mode = WAL')  // Better concurrent read performance
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
```

### Schema

The schema lives in `app/src/server/db/schema.ts`. Core tables:

#### Tasks

```tsx
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['open', 'in_progress', 'done'] }).default('open').notNull(),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium').notNull(),
  dueDate: text('due_date'),       // ISO 8601 string
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})
```

#### Emails

```tsx
export const emails = sqliteTable('emails', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  messageId: text('message_id').unique(),
  from: text('from_address').notNull(),
  to: text('to_address').notNull(),
  subject: text('subject'),
  bodyPreview: text('body_preview'),       // First ~500 chars of plain text
  classification: text('classification', {
    enum: ['invoice', 'actionable', 'newsletter', 'personal', 'spam', 'other']
  }),
  isRead: integer('is_read', { mode: 'boolean' }).default(false).notNull(),
  hasAttachments: integer('has_attachments', { mode: 'boolean' }).default(false).notNull(),
  receivedAt: text('received_at').notNull(),
  processedAt: text('processed_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
```

#### Invoices

```tsx
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  emailId: text('email_id').references(() => emails.id),
  vendor: text('vendor'),
  invoiceNumber: text('invoice_number'),
  amount: integer('amount'),              // Stored in cents
  currency: text('currency').default('EUR'),
  issueDate: text('issue_date'),
  dueDate: text('due_date'),
  status: text('status', { enum: ['pending', 'paid', 'overdue'] }).default('pending').notNull(),
  rawData: text('raw_data'),              // Full LLM extraction as JSON string
  attachmentKey: text('attachment_key'),   // MinIO object key for the PDF
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
```

#### Agenda Events

```tsx
export const agendaEvents = sqliteTable('agenda_events', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  title: text('title').notNull(),
  description: text('description'),
  startTime: text('start_time').notNull(),  // ISO 8601
  endTime: text('end_time'),
  location: text('location'),
  isAllDay: integer('is_all_day', { mode: 'boolean' }).default(false).notNull(),
  source: text('source', { enum: ['manual', 'caldav', 'ics_import'] }).default('manual').notNull(),
  sourceId: text('source_id'),              // External calendar event ID
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
```

#### Email Attachments

```tsx
export const emailAttachments = sqliteTable('email_attachments', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  emailId: text('email_id').references(() => emails.id).notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),            // bytes
  minioKey: text('minio_key').notNull(),       // Object key in MinIO
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
```

#### Conversations & Messages

```tsx
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  client: text('client', { enum: ['cli', 'web', 'discord'] }).notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  conversationId: text('conversation_id').references(() => conversations.id).notNull(),
  role: text('role', { enum: ['user', 'assistant', 'tool'] }).notNull(),
  content: text('content'),
  toolName: text('tool_name'),
  toolArgs: text('tool_args'),       // JSON string
  toolResult: text('tool_result'),   // JSON string
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
```

### Migrations

Use Drizzle Kit for migrations:

```bash
# Generate migration from schema changes
bunx drizzle-kit generate

# Apply migrations
bunx drizzle-kit migrate
```

Migrations live in `app/src/server/db/migrations/` and are applied on app startup.
