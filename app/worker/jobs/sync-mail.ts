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

  if (!host || !user || !pass) {
    console.log('[sync-mail] IMAP not configured, skipping')
    return
  }

  const folder = job.data.folder || process.env.IMAP_FOLDER || 'INBOX'
  const port = parseInt(process.env.IMAP_PORT || '993')

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user, pass },
    logger: false,
  })

  try {
    await client.connect()
    const lock = await client.getMailboxLock(folder)

    try {
      // Fetch unseen messages
      const messages = client.fetch({ seen: false }, {
        envelope: true,
        source: true,
        uid: true,
      })

      for await (const msg of messages) {
        const messageId = msg.envelope?.messageId
        if (!messageId) continue

        // Skip if already processed
        const existing = await db
          .select({ id: emails.id })
          .from(emails)
          .where(eq(emails.messageId, messageId))
          .limit(1)

        if (existing.length > 0) continue

        // Enqueue for processing (reuses the same process-mail worker)
        const raw = msg.source?.toString()
        if (!raw) continue

        await mailQueue.add('process-mail', { raw })
        console.log(`[sync-mail] Queued: ${msg.envelope?.subject || '(no subject)'}`)

        // Mark as seen in IMAP so we don't process it again
        await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'], { uid: true })
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
