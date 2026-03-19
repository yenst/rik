import type { Job } from 'bullmq'

export interface SyncAgendaData {
  caldavUrl?: string
}

export async function syncAgendaJob(job: Job<SyncAgendaData>) {
  console.log(`[sync-agenda] Syncing calendar events`)
  // TODO Phase 8: poll CalDAV, diff and sync events to SQLite
}
