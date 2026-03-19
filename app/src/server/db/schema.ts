import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['open', 'in_progress', 'done'] }).default('open').notNull(),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium').notNull(),
  dueDate: text('due_date'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const emails = sqliteTable('emails', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  messageId: text('message_id').unique(),
  from: text('from_address').notNull(),
  to: text('to_address').notNull(),
  subject: text('subject'),
  bodyPreview: text('body_preview'),
  classification: text('classification', {
    enum: ['invoice', 'actionable', 'newsletter', 'personal', 'spam', 'other'],
  }),
  isRead: integer('is_read', { mode: 'boolean' }).default(false).notNull(),
  hasAttachments: integer('has_attachments', { mode: 'boolean' }).default(false).notNull(),
  receivedAt: text('received_at').notNull(),
  processedAt: text('processed_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const emailAttachments = sqliteTable('email_attachments', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  emailId: text('email_id').references(() => emails.id).notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  minioKey: text('minio_key').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  emailId: text('email_id').references(() => emails.id),
  vendor: text('vendor'),
  invoiceNumber: text('invoice_number'),
  amount: integer('amount'),
  currency: text('currency').default('EUR'),
  issueDate: text('issue_date'),
  dueDate: text('due_date'),
  status: text('status', { enum: ['pending', 'paid', 'overdue'] }).default('pending').notNull(),
  rawData: text('raw_data'),
  attachmentKey: text('attachment_key'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const agendaEvents = sqliteTable('agenda_events', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  title: text('title').notNull(),
  description: text('description'),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  location: text('location'),
  isAllDay: integer('is_all_day', { mode: 'boolean' }).default(false).notNull(),
  source: text('source', { enum: ['manual', 'caldav', 'ics_import'] }).default('manual').notNull(),
  sourceId: text('source_id'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

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
  toolArgs: text('tool_args'),
  toolResult: text('tool_result'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
