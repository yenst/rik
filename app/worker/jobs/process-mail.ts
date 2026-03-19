import type { Job } from 'bullmq'

export interface ProcessMailData {
  messageId: string
  from: string
  to: string
  subject: string
  rawPath: string
}

export async function processMailJob(job: Job<ProcessMailData>) {
  console.log(`[process-mail] Processing email: ${job.data.subject}`)
  // TODO Phase 5: parse email, store attachments, classify via LLM
}
