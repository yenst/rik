import type { Job } from 'bullmq'
import { simpleParser } from 'mailparser'
import { convert } from 'html-to-text'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../src/server/db'
import { emails, emailAttachments } from '../../src/server/db/schema'
import { uploadFile } from '../../src/lib/minio'
import { complete } from '../../src/lib/llm'
import { invoiceQueue } from '../../src/lib/queues'

export interface ProcessMailData {
  raw: string
}

const VALID_CLASSIFICATIONS = ['invoice', 'actionable', 'newsletter', 'personal', 'spam', 'other'] as const

const CLASSIFICATION_PROMPT = `Classify the following email into exactly one category.

Categories:
- invoice: Contains a bill, invoice, or payment request, or has invoice/receipt attachments
- actionable: Requires a response or action from the recipient
- newsletter: Marketing email, digest, or subscription content
- personal: Personal communication from a known contact
- spam: Unsolicited, irrelevant, or promotional junk
- other: Doesn't fit any of the above

Email:
From: {from}
Subject: {subject}
Attachments: {attachments}
Body: {body}

Respond with only the category name, nothing else.`

export async function processMailJob(job: Job<ProcessMailData>) {
  const parsed = await simpleParser(job.data.raw)

  const from = parsed.from?.text || 'unknown'
  const to = parsed.to
    ? (Array.isArray(parsed.to) ? parsed.to[0]?.text : parsed.to.text) || ''
    : ''
  const subject = parsed.subject || '(no subject)'
  const textBody = parsed.text || (parsed.html ? convert(parsed.html, { wordwrap: false }) : '')
  const bodyPreview = textBody.slice(0, 500)

  const [email] = await db
    .insert(emails)
    .values({
      messageId: parsed.messageId || nanoid(),
      from,
      to,
      subject,
      bodyPreview,
      hasAttachments: (parsed.attachments?.length || 0) > 0,
      receivedAt: (parsed.date || new Date()).toISOString(),
    })
    .returning()

  if (!email) throw new Error('Failed to insert email')

  await storeAttachments(email.id, parsed.attachments || [])

  const attachmentNames = (parsed.attachments || []).map((a) => a.filename || 'unnamed').join(', ')
  const classification = await classifyEmail(from, subject, bodyPreview, attachmentNames)

  await db
    .update(emails)
    .set({ classification, processedAt: new Date().toISOString() })
    .where(eq(emails.id, email.id))

  console.log(`[process-mail] ${subject} -> ${classification}`)

  await enqueueInvoiceExtractionIfNeeded(email.id, classification, parsed.attachments || [])
}

async function storeAttachments(emailId: string, attachments: Awaited<ReturnType<typeof simpleParser>>['attachments']) {
  for (const attachment of attachments) {
    const key = `${emailId}/${nanoid()}-${attachment.filename || 'unnamed'}`
    await uploadFile(
      'attachments',
      key,
      attachment.content,
      attachment.contentType || 'application/octet-stream',
    )
    await db.insert(emailAttachments).values({
      emailId,
      filename: attachment.filename || 'unnamed',
      mimeType: attachment.contentType || 'application/octet-stream',
      size: attachment.size || attachment.content.length,
      minioKey: key,
    })
  }
}

async function enqueueInvoiceExtractionIfNeeded(
  emailId: string,
  classification: string,
  attachments: Awaited<ReturnType<typeof simpleParser>>['attachments'],
) {
  if (classification !== 'invoice') return

  const hasPdf = attachments.some((a) => a.contentType === 'application/pdf')
  if (!hasPdf) return

  const attachmentRecord = await db.query.emailAttachments.findFirst({
    where: and(
      eq(emailAttachments.emailId, emailId),
      eq(emailAttachments.mimeType, 'application/pdf'),
    ),
  })
  if (!attachmentRecord) return

  await invoiceQueue.add('extract-invoice', {
    emailId,
    attachmentKey: attachmentRecord.minioKey,
  })
}

async function classifyEmail(from: string, subject: string, body: string, attachments: string) {
  try {
    const prompt = CLASSIFICATION_PROMPT
      .replace('{from}', from)
      .replace('{subject}', subject)
      .replace('{attachments}', attachments || 'none')
      .replace('{body}', body)

    const result = await complete(prompt)
    const normalized = result.trim().toLowerCase()
    return VALID_CLASSIFICATIONS.find((v) => normalized.includes(v)) || 'other'
  } catch (err) {
    console.error('[process-mail] Classification failed:', err)
    return 'other' as const
  }
}
