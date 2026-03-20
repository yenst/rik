import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { agendaEvents } from '../db/schema'
import { eq, gte, lte, and, asc, desc } from 'drizzle-orm'
import { z } from 'zod'

export const getUpcomingEvents = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      days: z.number().default(7),
    }).optional()
  )
  .handler(async ({ data }) => {
    const days = data?.days ?? 7
    const now = new Date().toISOString()
    const future = new Date(Date.now() + days * 86400000).toISOString()

    return db
      .select()
      .from(agendaEvents)
      .where(and(gte(agendaEvents.startTime, now), lte(agendaEvents.startTime, future)))
      .orderBy(asc(agendaEvents.startTime))
  })

export const getEvents = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    if (data?.from && data?.to) {
      return db
        .select()
        .from(agendaEvents)
        .where(and(gte(agendaEvents.startTime, data.from), lte(agendaEvents.startTime, data.to)))
        .orderBy(asc(agendaEvents.startTime))
    }

    return db.select().from(agendaEvents).orderBy(asc(agendaEvents.startTime)).limit(50)
  })

export const getEvent = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const [event] = await db
      .select()
      .from(agendaEvents)
      .where(eq(agendaEvents.id, data.id))
      .limit(1)
    if (!event) throw new Error('Event not found')
    return event
  })

export const createEvent = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      title: z.string().min(1),
      startTime: z.string(),
      endTime: z.string().optional(),
      location: z.string().optional(),
      description: z.string().optional(),
      isAllDay: z.boolean().default(false),
    })
  )
  .handler(async ({ data }) => {
    const [event] = await db.insert(agendaEvents).values(data).returning()
    return event
  })

export const updateEvent = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      startTime: z.string().optional(),
      endTime: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      isAllDay: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { id, ...fields } = data
    const [event] = await db
      .update(agendaEvents)
      .set(fields)
      .where(eq(agendaEvents.id, id))
      .returning()
    if (!event) throw new Error('Event not found')
    return event
  })

export const deleteEvent = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await db.delete(agendaEvents).where(eq(agendaEvents.id, data.id))
    return { ok: true }
  })

export type AgendaEvent = Awaited<ReturnType<typeof getEvents>>[number]
