import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getEmail, markAsRead, getAttachmentUrl } from '@/server/functions/mail'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/mail/$emailId')({
  loader: async ({ params }) => {
    const email = await getEmail({ data: { id: params.emailId } })
    if (!email.isRead) {
      await markAsRead({ data: { id: email.id, isRead: true } })
    }
    return email
  },
  component: EmailDetailPage,
})

function EmailDetailPage() {
  const email = Route.useLoaderData()
  const router = useRouter()

  const handleDownload = async (key: string, filename: string) => {
    const { url } = await getAttachmentUrl({ data: { key } })
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.navigate({ to: '/mail' })}
        >
          &larr; Back
        </Button>
        {email.classification && (
          <Badge variant="outline">{email.classification}</Badge>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">{email.subject}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>From: {email.from}</span>
            <span>&middot;</span>
            <span>To: {email.to}</span>
            <span>&middot;</span>
            <span>{new Date(email.receivedAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <pre className="text-sm whitespace-pre-wrap font-sans">{email.bodyPreview}</pre>
        </div>

        {email.attachments.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">
              Attachments ({email.attachments.length})
            </h3>
            <div className="space-y-1">
              {email.attachments.map((att) => (
                <button
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 text-sm w-full text-left"
                  onClick={() => handleDownload(att.minioKey, att.filename)}
                >
                  <span className="text-muted-foreground">[file]</span>
                  <span className="flex-1 truncate">{att.filename}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(att.size)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Received {new Date(email.receivedAt).toLocaleString()}
          {email.processedAt && ` · Processed ${new Date(email.processedAt).toLocaleString()}`}
        </p>
      </div>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
