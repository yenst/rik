import type { Job } from 'bullmq'
import ical from 'node-ical'
import { eq } from 'drizzle-orm'
import { db } from '../../src/server/db'
import { agendaEvents } from '../../src/server/db/schema'

export interface SyncAgendaData {
  icsUrl?: string
}

export async function syncAgendaJob(_job: Job<SyncAgendaData>) {
  const icsUrl = _job.data.icsUrl || process.env.GCAL_ICS_URL
  if (!icsUrl) return

  const events = await ical.async.fromURL(icsUrl)
  let synced = 0

  for (const [uid, event] of Object.entries(events)) {
    if (event.type !== 'VEVENT') continue

    const start = event.start
    const end = event.end
    if (!start) continue

    const startTime = start instanceof Date ? start.toISOString() : String(start)
    const endTime = end instanceof Date ? end.toISOString() : end ? String(end) : null
    const isAllDay = event.datetype === 'date'

    // Upsert by sourceId
    const existing = await db
      .select({ id: agendaEvents.id })
      .from(agendaEvents)
      .where(eq(agendaEvents.sourceId, uid))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(agendaEvents)
        .set({
          title: event.summary || '(no title)',
          description: event.description || null,
          startTime,
          endTime,
          location: event.location || null,
          isAllDay,
        })
        .where(eq(agendaEvents.sourceId, uid))
    } else {
      await db.insert(agendaEvents).values({
        title: event.summary || '(no title)',
        description: event.description || null,
        startTime,
        endTime,
        location: event.location || null,
        isAllDay,
        source: 'caldav',
        sourceId: uid,
      })
      synced++
    }
  }

  if (synced > 0) {
    console.log(`[sync-agenda] Synced ${synced} new events`)
  }
}
