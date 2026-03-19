import { Worker } from 'bullmq'
import { processMailJob } from './jobs/process-mail'
import { extractInvoiceJob } from './jobs/extract-invoice'
import { llmTaskJob } from './jobs/llm-task'
import { syncAgendaJob } from './jobs/sync-agenda'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
}

new Worker('mail', processMailJob, { connection, concurrency: 2 })
new Worker('invoice', extractInvoiceJob, { connection, concurrency: 1 })
new Worker('llm', llmTaskJob, { connection, concurrency: 1 })
new Worker('agenda', syncAgendaJob, { connection, concurrency: 1 })

console.log('Rik workers started')
