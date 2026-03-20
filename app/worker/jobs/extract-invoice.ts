import type { Job } from 'bullmq'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { extractText } from 'unpdf'
import { db } from '../../src/server/db'
import { invoices } from '../../src/server/db/schema'
import { s3 } from '../../src/lib/minio'
import { complete } from '../../src/lib/llm'

export interface ExtractInvoiceData {
  emailId: string
  attachmentKey: string
}

const EXTRACTION_PROMPT = `Extract invoice data from the following text. Respond in JSON format only.

{text}

Required JSON fields:
{
  "vendor": "company name or null",
  "invoice_number": "string or null",
  "amount_cents": "number (total in smallest currency unit, e.g. cents) or null",
  "currency": "ISO 4217 code (e.g. EUR, USD) or null",
  "issue_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null"
}

If a field cannot be determined, use null. For amount, always convert to cents (multiply by 100).`

export async function extractInvoiceJob(job: Job<ExtractInvoiceData>) {
  const { emailId, attachmentKey } = job.data

  const text = await extractPdfText(attachmentKey)
  if (!text) return

  const parsed = await extractInvoiceData(text)
  if (!parsed) return

  await db
    .insert(invoices)
    .values({
      emailId,
      vendor: typeof parsed.vendor === 'string' ? parsed.vendor : null,
      invoiceNumber: typeof parsed.invoice_number === 'string' ? parsed.invoice_number : null,
      amount: typeof parsed.amount_cents === 'number' ? parsed.amount_cents : null,
      currency: typeof parsed.currency === 'string' ? parsed.currency : 'EUR',
      issueDate: typeof parsed.issue_date === 'string' ? parsed.issue_date : null,
      dueDate: typeof parsed.due_date === 'string' ? parsed.due_date : null,
      rawData: JSON.stringify(parsed),
      attachmentKey,
    })
    .returning()
}

async function extractPdfText(attachmentKey: string): Promise<string | null> {
  const response = await s3.send(
    new GetObjectCommand({ Bucket: 'attachments', Key: attachmentKey }),
  )
  const bytes = await response.Body?.transformToByteArray()
  if (!bytes) throw new Error('Empty attachment')

  const pdfResult = await extractText(new Uint8Array(bytes))
  const rawText = pdfResult.text
  const text = (Array.isArray(rawText) ? rawText.join('\n') : String(rawText || '')).slice(0, 3000)

  if (!text.trim()) return null
  return text
}

async function extractInvoiceData(text: string): Promise<Record<string, unknown> | null> {
  const prompt = EXTRACTION_PROMPT.replace('{text}', text)
  const result = await complete(prompt, { jsonMode: true })

  try {
    return JSON.parse(result)
  } catch {
    console.error('[extract-invoice] Failed to parse LLM response:', result)
    return null
  }
}
