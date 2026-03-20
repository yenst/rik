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

const workers = {
  mail: new Worker('mail', processMailJob, { connection, concurrency: 2 }),
  invoice: new Worker('invoice', extractInvoiceJob, { connection, concurrency: 1 }),
  llm: new Worker('llm', llmTaskJob, { connection, concurrency: 1 }),
  'sync-mail': new Worker('sync-mail', syncMailJob, { connection, concurrency: 1 }),
  agenda: new Worker('agenda', syncAgendaJob, { connection, concurrency: 1 }),
}

for (const [name, worker] of Object.entries(workers)) {
  worker.on('failed', (job, err) => console.error(`[${name}] Job ${job?.name} failed:`, err.message))
}

const syncMailQueue = new Queue('sync-mail', { connection })

async function scheduleRepeatingJobs() {
  const pollInterval = parseInt(process.env.IMAP_POLL_INTERVAL || '300000')
  await syncMailQueue.upsertJobScheduler(
    'sync-mail-poll',
    { every: pollInterval },
    { data: {} },
  )
  console.log(`Rik workers started`)
}

scheduleRepeatingJobs().catch(console.error)
