import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getInvoice, updateInvoice, markInvoicePaid } from '@/server/functions/invoices'
import type { InvoiceStatus } from '@/server/functions/invoices'
import { getAttachmentUrl } from '@/server/functions/mail'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/invoices/$invoiceId')({
  loader: ({ params }) => getInvoice({ data: { id: params.invoiceId } }),
  component: InvoiceDetailPage,
})

function InvoiceDetailPage() {
  const invoice = Route.useLoaderData()
  const router = useRouter()
  const [vendor, setVendor] = useState(invoice.vendor || '')
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber || '')
  const [amount, setAmount] = useState(invoice.amount != null ? (invoice.amount / 100).toFixed(2) : '')
  const [currency, setCurrency] = useState(invoice.currency || 'EUR')
  const [issueDate, setIssueDate] = useState(invoice.issueDate || '')
  const [dueDate, setDueDate] = useState(invoice.dueDate || '')
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await updateInvoice({
      data: {
        id: invoice.id,
        vendor: vendor || null,
        invoiceNumber: invoiceNumber || null,
        amount: amount ? Math.round(parseFloat(amount) * 100) : null,
        currency: currency || null,
        issueDate: issueDate || null,
        dueDate: dueDate || null,
        status,
      },
    })
    setSaving(false)
    router.invalidate()
  }

  const handleMarkPaid = async () => {
    await markInvoicePaid({ data: { id: invoice.id } })
    router.invalidate()
  }

  const handleDownloadPdf = async () => {
    if (!invoice.attachmentKey) return
    const { url } = await getAttachmentUrl({ data: { key: invoice.attachmentKey } })
    window.open(url, '_blank')
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.navigate({ to: '/invoices' })}
        >
          &larr; Back
        </Button>
        <Badge variant="outline">{invoice.status}</Badge>
        {invoice.email && (
          <Link
            to="/mail/$emailId"
            params={{ emailId: invoice.email.id }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View email
          </Link>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Vendor</label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Invoice #</label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Amount</label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Currency</label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Issue Date</label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Due Date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {invoice.status === 'pending' && (
            <Button variant="secondary" onClick={handleMarkPaid}>
              Mark paid
            </Button>
          )}
          {invoice.attachmentKey && (
            <Button variant="outline" onClick={handleDownloadPdf}>
              View PDF
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Extracted {new Date(invoice.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
