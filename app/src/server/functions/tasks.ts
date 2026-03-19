import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { tasks } from '../db/schema'
import { eq, desc, asc } from 'drizzle-orm'
import { z } from 'zod'

export const getTasks = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      status: z.enum(['open', 'in_progress', 'done', 'all']).optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const filter = data?.status
    const query = db
      .select()
      .from(tasks)
      .orderBy(asc(tasks.status), desc(tasks.priority), asc(tasks.dueDate))

    if (filter && filter !== 'all') {
      return query.where(eq(tasks.status, filter))
    }
    return query
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
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
      dueDate: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const [task] = await db
      .insert(tasks)
      .values({
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate,
      })
      .returning()
    return task
  })

export const updateTask = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      status: z.enum(['open', 'in_progress', 'done']).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      dueDate: z.string().nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { id, ...updates } = data
    const values: Record<string, unknown> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    if (updates.status === 'done') {
      values.completedAt = new Date().toISOString()
    }
    if (updates.status && updates.status !== 'done') {
      values.completedAt = null
    }
    const [task] = await db
      .update(tasks)
      .set(values)
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
