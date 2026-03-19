import { Worker, Queue } from 'bullmq'
import { processMailJob } from './jobs/process-mail'
import { extractInvoiceJob } from './jobs/extract-invoice'
import { llmTaskJob } from './jobs/llm-task'
import { syncMailJob } from './jobs/sync-mail'
import { syncAgendaJob } from './jobs/sync-agenda'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
}

// Workers
new Worker('mail', processMailJob, { connection, concurrency: 2 })
new Worker('invoice', extractInvoiceJob, { connection, concurrency: 1 })
new Worker('llm', llmTaskJob, { connection, concurrency: 1 })
new Worker('sync-mail', syncMailJob, { connection, concurrency: 1 })
new Worker('agenda', syncAgendaJob, { connection, concurrency: 1 })

// Schedule repeating jobs
const syncMailQueue = new Queue('sync-mail', { connection })

async function scheduleRepeatingJobs() {
  await syncMailQueue.upsertJobScheduler(
    'sync-mail-poll',
    { every: parseInt(process.env.IMAP_POLL_INTERVAL || '300000') }, // default 5 min
    { data: {} },
  )
  console.log('Rik workers started (IMAP poll every ' + (parseInt(process.env.IMAP_POLL_INTERVAL || '300000') / 1000) + 's)')
}

scheduleRepeatingJobs().catch(console.error)
