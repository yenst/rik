import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mail/')({
  component: MailPage,
})

function MailPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Mail</h2>
      <p className="text-sm text-muted-foreground">Email processing coming in Phase 5.</p>
    </div>
  )
}
