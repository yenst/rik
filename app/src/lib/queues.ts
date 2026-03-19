import { Queue } from 'bullmq'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
}

export const mailQueue = new Queue('mail', { connection })
export const invoiceQueue = new Queue('invoice', { connection })
export const llmQueue = new Queue('llm', { connection })
export const agendaQueue = new Queue('agenda', { connection })
