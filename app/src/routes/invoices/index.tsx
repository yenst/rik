import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/invoices/')({
  component: InvoicesPage,
})

function InvoicesPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Invoices</h2>
      <p className="text-sm text-muted-foreground">Invoice extraction coming in Phase 6.</p>
    </div>
  )
}
