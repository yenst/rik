import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { tasks } from '../db/schema'
import { eq, desc, asc } from 'drizzle-orm'
import { z } from 'zod'

const statusEnum = z.enum(['open', 'in_progress', 'done'])
const priorityEnum = z.enum(['low', 'medium', 'high'])

export const getTasks = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      status: statusEnum.or(z.literal('all')).optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const filter = data?.status

    if (filter && filter !== 'all') {
      return db
        .select()
        .from(tasks)
        .where(eq(tasks.status, filter))
        .orderBy(asc(tasks.status), desc(tasks.priority), asc(tasks.dueDate))
    }

    return db
      .select()
      .from(tasks)
      .orderBy(asc(tasks.status), desc(tasks.priority), asc(tasks.dueDate))
  })

export const getTask = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, data.id))
      .limit(1)
    if (!task) throw new Error('Task not found')
    return task
  })

export const createTask = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      priority: priorityEnum.default('medium'),
      dueDate: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const [task] = await db.insert(tasks).values(data).returning()
    return task
  })

export const updateTask = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      status: statusEnum.optional(),
      priority: priorityEnum.optional(),
      dueDate: z.string().nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { id, ...fields } = data
    const now = new Date().toISOString()

    const [task] = await db
      .update(tasks)
      .set({
        ...fields,
        updatedAt: now,
        completedAt: fields.status === 'done' ? now : fields.status ? null : undefined,
      })
      .where(eq(tasks.id, id))
      .returning()

    if (!task) throw new Error('Task not found')
    return task
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await db.delete(tasks).where(eq(tasks.id, data.id))
    return { ok: true }
  })

export type Task = Awaited<ReturnType<typeof getTasks>>[number]
export type TaskStatus = z.infer<typeof statusEnum>
export type TaskPriority = z.infer<typeof priorityEnum>
