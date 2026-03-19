import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { emails, emailAttachments } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { getPresignedUrl } from '../../lib/minio'

const classificationEnum = z.enum(['invoice', 'actionable', 'newsletter', 'personal', 'spam', 'other'])

export const getEmails = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      classification: classificationEnum.or(z.literal('all')).optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const filter = data?.classification

    if (filter && filter !== 'all') {
      return db
        .select()
        .from(emails)
        .where(eq(emails.classification, filter))
        .orderBy(desc(emails.receivedAt))
    }

    return db.select().from(emails).orderBy(desc(emails.receivedAt))
  })

export const getEmail = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const [email] = await db
      .select()
      .from(emails)
      .where(eq(emails.id, data.id))
      .limit(1)
    if (!email) throw new Error('Email not found')

    const attachments = await db
      .select()
      .from(emailAttachments)
      .where(eq(emailAttachments.emailId, email.id))

    return { ...email, attachments }
  })

export const markAsRead = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), isRead: z.boolean() }))
  .handler(async ({ data }) => {
    const [email] = await db
      .update(emails)
      .set({ isRead: data.isRead })
      .where(eq(emails.id, data.id))
      .returning()
    if (!email) throw new Error('Email not found')
    return email
  })

export const getAttachmentUrl = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ key: z.string() }))
  .handler(async ({ data }) => {
    const url = await getPresignedUrl('attachments', data.key)
    return { url }
  })

export type Email = Awaited<ReturnType<typeof getEmails>>[number]
export type EmailDetail = Awaited<ReturnType<typeof getEmail>>
