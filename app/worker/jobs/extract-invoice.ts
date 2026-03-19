import type { Job } from 'bullmq'

export interface ExtractInvoiceData {
  emailId: string
  attachmentKey: string
}

export async function extractInvoiceJob(job: Job<ExtractInvoiceData>) {
  console.log(`[extract-invoice] Extracting invoice from email: ${job.data.emailId}`)
  // TODO Phase 6: pull PDF from MinIO, extract via LLM, store in invoices table
}
