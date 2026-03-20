import type { Job } from 'bullmq'

export interface SyncAgendaData {
  caldavUrl?: string
}

export async function syncAgendaJob(_job: Job<SyncAgendaData>) {
  // TODO Phase 8: poll CalDAV, diff and sync events to SQLite
}
