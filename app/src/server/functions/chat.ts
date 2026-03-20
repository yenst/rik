import { generateText, tool, stepCountIs } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { db } from '../db'
import { tasks, emails, invoices, conversations, messages, agendaEvents } from '../db/schema'
import { eq, desc, like, and } from 'drizzle-orm'

const google = createGoogleGenerativeAI({
  apiKey: process.env.LLM_API_KEY || '',
})

const SYSTEM_PROMPT = `You are Rik, a personal assistant. You help manage tasks, emails, invoices, and calendar events.

Be concise and casual. Match the user's tone — if they're brief, be brief.

When creating tasks from conversation, infer sensible defaults:
- Priority: medium unless they say it's urgent/important
- Due date: infer from context ("tomorrow", "by Friday")
- Title: keep it short, extract the core action

When asked about emails or invoices, search first, then summarize. Don't dump raw data.

If you're not sure what the user wants, ask.`

const rikTools = {
  createTask: tool({
    description: 'Create a new task',
    inputSchema: z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
      dueDate: z.string().optional().describe('ISO date string YYYY-MM-DD'),
    }),
    execute: async ({ title, description, priority, dueDate }) => {
      const [task] = await db.insert(tasks).values({ title, description, priority, dueDate }).returning()
      return { created: true, id: task?.id, title }
    },
  }),

  listTasks: tool({
    description: 'List tasks, optionally filtered by status',
    inputSchema: z.object({
      status: z.enum(['open', 'in_progress', 'done', 'all']).default('open'),
    }),
    execute: async ({ status }) => {
      const query = status === 'all'
        ? db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(10)
        : db.select().from(tasks).where(eq(tasks.status, status)).orderBy(desc(tasks.createdAt)).limit(10)
      const results = await query
      return results.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate }))
    },
  }),

  completeTask: tool({
    description: 'Mark a task as done',
    inputSchema: z.object({
      id: z.string().describe('Task ID'),
    }),
    execute: async ({ id }) => {
      const [task] = await db.update(tasks).set({ status: 'done', completedAt: new Date().toISOString() }).where(eq(tasks.id, id)).returning()
      return task ? { completed: true, title: task.title } : { error: 'Task not found' }
    },
  }),

  searchEmails: tool({
    description: 'Search emails by subject or sender',
    inputSchema: z.object({
      query: z.string().describe('Search term for subject or sender'),
    }),
    execute: async ({ query }) => {
      const results = await db.select().from(emails)
        .where(like(emails.subject, `%${query}%`))
        .orderBy(desc(emails.receivedAt))
        .limit(10)
      return results.map(e => ({ id: e.id, from: e.from, subject: e.subject, classification: e.classification, date: e.receivedAt }))
    },
  }),

  listInvoices: tool({
    description: 'List invoices, optionally filtered by status',
    inputSchema: z.object({
      status: z.enum(['pending', 'paid', 'overdue', 'all']).default('all'),
    }),
    execute: async ({ status }) => {
      const query = status === 'all'
        ? db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(10)
        : db.select().from(invoices).where(eq(invoices.status, status)).orderBy(desc(invoices.createdAt)).limit(10)
      const results = await query
      return results.map(i => ({ id: i.id, vendor: i.vendor, amount: i.amount ? (i.amount / 100).toFixed(2) : null, currency: i.currency, status: i.status, dueDate: i.dueDate }))
    },
  }),

  markInvoicePaid: tool({
    description: 'Mark an invoice as paid',
    inputSchema: z.object({
      id: z.string().describe('Invoice ID'),
    }),
    execute: async ({ id }) => {
      const [inv] = await db.update(invoices).set({ status: 'paid' }).where(eq(invoices.id, id)).returning()
      return inv ? { paid: true, vendor: inv.vendor } : { error: 'Invoice not found' }
    },
  }),

  getAgenda: tool({
    description: 'Get upcoming calendar events',
    inputSchema: z.object({
      days: z.number().default(7).describe('Number of days ahead to look'),
    }),
    execute: async ({ days }) => {
      const now = new Date().toISOString()
      const future = new Date(Date.now() + days * 86400000).toISOString()
      const results = await db.select().from(agendaEvents)
        .where(and(
          like(agendaEvents.startTime, `%`), // TODO: proper date range filter
        ))
        .orderBy(agendaEvents.startTime)
        .limit(20)
      return results.map(e => ({ id: e.id, title: e.title, start: e.startTime, end: e.endTime, location: e.location }))
    },
  }),

  createEvent: tool({
    description: 'Create a calendar event',
    inputSchema: z.object({
      title: z.string(),
      startTime: z.string().describe('ISO datetime string'),
      endTime: z.string().optional().describe('ISO datetime string'),
      location: z.string().optional(),
      description: z.string().optional(),
    }),
    execute: async ({ title, startTime, endTime, location, description }) => {
      const [event] = await db.insert(agendaEvents).values({ title, startTime, endTime, location, description }).returning()
      return { created: true, id: event?.id, title }
    },
  }),
}

export async function chat(userMessage: string, conversationId?: string) {
  const model = process.env.LLM_MODEL || 'gemini-2.5-flash'

  // Get or create conversation
  let convId = conversationId
  if (!convId) {
    const [conv] = await db.insert(conversations).values({ client: 'web' }).returning()
    convId = conv!.id
  }

  // Load history
  const history = await db.select().from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(messages.createdAt)
    .limit(50)

  const messageHistory = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content || '',
    }))

  // Store user message
  await db.insert(messages).values({
    conversationId: convId,
    role: 'user',
    content: userMessage,
  })

  // Generate response with tools
  const { text, steps } = await generateText({
    model: google(model),
    system: SYSTEM_PROMPT,
    messages: [...messageHistory, { role: 'user', content: userMessage }],
    tools: rikTools,
    stopWhen: stepCountIs(5),
  })

  // Collect actions from tool calls
  const actions = steps
    .flatMap(s => s.toolCalls || [])
    .map(tc => ({ tool: tc.toolName, args: tc.args, result: tc }))

  // Store assistant response
  await db.insert(messages).values({
    conversationId: convId,
    role: 'assistant',
    content: text,
  })

  // Store tool calls
  for (const step of steps) {
    for (const tc of step.toolCalls || []) {
      await db.insert(messages).values({
        conversationId: convId,
        role: 'tool',
        toolName: tc.toolName,
        toolArgs: JSON.stringify(tc.args),
      })
    }
  }

  return {
    reply: text,
    conversationId: convId,
    actions,
  }
}
