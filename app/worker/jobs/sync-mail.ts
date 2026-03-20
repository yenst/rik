import type { Job } from 'bullmq'
import { ImapFlow } from 'imapflow'
import { eq } from 'drizzle-orm'
import { db } from '../../src/server/db'
import { emails } from '../../src/server/db/schema'
import { mailQueue } from '../../src/lib/queues'

export interface SyncMailData {
  folder?: string
}

export async function syncMailJob(job: Job<SyncMailData>) {
  const host = process.env.IMAP_HOST
  const user = process.env.IMAP_USER
  const pass = process.env.IMAP_PASS

  if (!host || !user || !pass) return

  const folder = job.data.folder || process.env.IMAP_FOLDER || 'INBOX'
  const port = parseInt(process.env.IMAP_PORT || '993')

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user, pass },
    logger: false,
    tls: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    const lock = await client.getMailboxLock(folder)

    try {
      const queued = await fetchAndQueueNewMessages(client, folder)
      if (queued > 0) {
        console.log(`[sync-mail] Queued ${queued} new messages`)
      }
    } finally {
      lock.release()
    }

    await client.logout()
  } catch (err) {
    console.error('[sync-mail] IMAP sync failed:', err)
    try { await client.logout() } catch { /* ignore */ }
    throw err
  }
}

async function fetchAndQueueNewMessages(client: ImapFlow, folder: string): Promise<number> {
  const status = await client.status(folder, { messages: true })
  const total = status.messages || 0
  if (total === 0) return 0

  const from = Math.max(1, total - 49)
  const messages = client.fetch(`${from}:*`, {
    envelope: true,
    source: true,
    uid: true,
  })

  let queued = 0
  for await (const msg of messages) {
    const messageId = msg.envelope?.messageId
    if (!messageId) continue

    const existing = await db
      .select({ id: emails.id })
      .from(emails)
      .where(eq(emails.messageId, messageId))
      .limit(1)

    if (existing.length > 0) continue

    const raw = msg.source?.toString()
    if (!raw) continue

    await mailQueue.add('process-mail', { raw })
    queued++
  }

  return queued
}
