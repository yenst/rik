import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { invoices, emails } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const statusEnum = z.enum(['pending', 'paid', 'overdue'])

export const getInvoices = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      status: statusEnum.or(z.literal('all')).optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const filter = data?.status

    if (filter && filter !== 'all') {
      return db
        .select()
        .from(invoices)
        .where(eq(invoices.status, filter))
        .orderBy(desc(invoices.createdAt))
    }

    return db.select().from(invoices).orderBy(desc(invoices.createdAt))
  })

export const getInvoice = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, data.id))
      .limit(1)
    if (!invoice) throw new Error('Invoice not found')

    const linkedEmail = invoice.emailId
      ? await db.select().from(emails).where(eq(emails.id, invoice.emailId)).limit(1).then(r => r[0])
      : null

    return { ...invoice, email: linkedEmail }
  })

export const updateInvoice = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      vendor: z.string().nullable().optional(),
      invoiceNumber: z.string().nullable().optional(),
      amount: z.number().nullable().optional(),
      currency: z.string().nullable().optional(),
      issueDate: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      status: statusEnum.optional(),
    })
  )
  .handler(async ({ data }) => {
    const { id, ...fields } = data
    const [invoice] = await db
      .update(invoices)
      .set(fields)
      .where(eq(invoices.id, id))
      .returning()
    if (!invoice) throw new Error('Invoice not found')
    return invoice
  })

export const markInvoicePaid = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const [invoice] = await db
      .update(invoices)
      .set({ status: 'paid' })
      .where(eq(invoices.id, data.id))
      .returning()
    if (!invoice) throw new Error('Invoice not found')
    return invoice
  })

export type Invoice = Awaited<ReturnType<typeof getInvoices>>[number]
export type InvoiceDetail = Awaited<ReturnType<typeof getInvoice>>
export type InvoiceStatus = z.infer<typeof statusEnum>
