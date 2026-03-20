import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getInvoices, markInvoicePaid } from '@/server/functions/invoices'
import type { Invoice, InvoiceStatus } from '@/server/functions/invoices'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const statusFilters = ['all', 'pending', 'paid', 'overdue'] as const
type StatusFilter = (typeof statusFilters)[number]

const statusVariant: Record<InvoiceStatus, 'destructive' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  paid: 'outline',
  overdue: 'destructive',
}

export const Route = createFileRoute('/invoices/')({
  loaderDeps: ({ search }) => ({
    status: ((search as Record<string, unknown>).status as StatusFilter) || 'all',
  }),
  loader: ({ deps }) => getInvoices({ data: { status: deps.status } }),
  component: InvoicesPage,
})

function InvoicesPage() {
  const invoiceList = Route.useLoaderData()
  const router = useRouter()
  const status = Route.useLoaderDeps().status

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Invoices</h2>

      <div className="flex gap-1 mb-4">
        {statusFilters.map((f) => (
          <Button
            key={f}
            variant={status === f ? 'default' : 'ghost'}
            size="sm"
            onClick={() => router.navigate({ search: { status: f } })}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {invoiceList.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No invoices yet. Forward invoice emails to get started.
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2 font-medium">Vendor</th>
                <th className="text-left px-4 py-2 font-medium">Invoice #</th>
                <th className="text-right px-4 py-2 font-medium">Amount</th>
                <th className="text-left px-4 py-2 font-medium">Due Date</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {invoiceList.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const router = useRouter()

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await markInvoicePaid({ data: { id: invoice.id } })
    router.invalidate()
  }

  return (
    <tr
      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
      onClick={() => router.navigate({ to: '/invoices/$invoiceId', params: { invoiceId: invoice.id } })}
    >
      <td className="px-4 py-2">{invoice.vendor || '—'}</td>
      <td className="px-4 py-2 text-muted-foreground">{invoice.invoiceNumber || '—'}</td>
      <td className="px-4 py-2 text-right font-mono">
        {invoice.amount != null
          ? `${(invoice.amount / 100).toFixed(2)} ${invoice.currency || ''}`
          : '—'}
      </td>
      <td className="px-4 py-2 text-muted-foreground">
        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
      </td>
      <td className="px-4 py-2">
        <Badge variant={statusVariant[invoice.status]} className="text-xs">
          {invoice.status}
        </Badge>
      </td>
      <td className="px-4 py-2">
        {invoice.status === 'pending' && (
          <Button variant="ghost" size="sm" className="h-7" onClick={handleMarkPaid}>
            Mark paid
          </Button>
        )}
      </td>
    </tr>
  )
}
