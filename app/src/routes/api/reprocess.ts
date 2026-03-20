import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/server/db'
import { emails } from '@/server/db/schema'
import { desc, eq } from 'drizzle-orm'
import { complete } from '@/lib/llm'

const VALID_CLASSIFICATIONS = ['invoice', 'actionable', 'newsletter', 'personal', 'spam', 'other'] as const

export const Route = createFileRoute('/api/reprocess')({
  server: {
    handlers: {
      POST: async () => {
        const [email] = await db
          .select()
          .from(emails)
          .orderBy(desc(emails.createdAt))
          .limit(1)

        if (!email) {
          return Response.json({ error: 'No emails found' }, { status: 404 })
        }

        const prompt = `Classify the following email into exactly one category.

Categories:
- invoice: Contains a bill, invoice, or payment request, or has invoice/receipt attachments
- actionable: Requires a response or action from the recipient
- newsletter: Marketing email, digest, or subscription content
- personal: Personal communication from a known contact
- spam: Unsolicited, irrelevant, or promotional junk
- other: Doesn't fit any of the above

Email:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.bodyPreview || ''}

Respond with only the category name, nothing else.`

        const result = await complete(prompt)
        const normalized = result.trim().toLowerCase()
        const classification = VALID_CLASSIFICATIONS.find((v) => normalized.includes(v)) || 'other'

        await db
          .update(emails)
          .set({ classification, processedAt: new Date().toISOString() })
          .where(eq(emails.id, email.id))

        return Response.json({
          ok: true,
          email: email.subject,
          classification,
        })
      },
    },
  },
})
