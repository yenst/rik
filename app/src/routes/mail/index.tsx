import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getEmails, markAsRead } from '@/server/functions/mail'
import type { Email } from '@/server/functions/mail'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const classificationFilters = ['all', 'invoice', 'actionable', 'newsletter', 'personal', 'spam', 'other'] as const
type ClassificationFilter = (typeof classificationFilters)[number]

const classificationColors: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
  invoice: 'destructive',
  actionable: 'default',
  newsletter: 'secondary',
  personal: 'outline',
  spam: 'secondary',
  other: 'outline',
}

export const Route = createFileRoute('/mail/')({
  loaderDeps: ({ search }) => ({
    classification: ((search as Record<string, unknown>).classification as ClassificationFilter) || 'all',
  }),
  loader: ({ deps }) => getEmails({ data: { classification: deps.classification } }),
  component: MailPage,
})

function MailPage() {
  const emailList = Route.useLoaderData()
  const router = useRouter()
  const classification = Route.useLoaderDeps().classification

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Mail</h2>

      <div className="flex gap-1 mb-4 flex-wrap">
        {classificationFilters.map((f) => (
          <Button
            key={f}
            variant={classification === f ? 'default' : 'ghost'}
            size="sm"
            onClick={() => router.navigate({ search: { classification: f } })}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {emailList.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No emails yet. Set up forwarding to get started.
        </p>
      ) : (
        <div className="space-y-1">
          {emailList.map((email) => (
            <EmailRow key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmailRow({ email }: { email: Email }) {
  const router = useRouter()

  const handleClick = async () => {
    if (!email.isRead) {
      await markAsRead({ data: { id: email.id, isRead: true } })
    }
    router.navigate({ to: '/mail/$emailId', params: { emailId: email.id } })
  }

  return (
    <button
      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-left"
      onClick={handleClick}
    >
      {!email.isRead && (
        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm truncate ${email.isRead ? 'text-muted-foreground' : 'font-medium'}`}>
            {email.from}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(email.receivedAt).toLocaleDateString()}
          </span>
        </div>
        <p className={`text-sm truncate ${email.isRead ? 'text-muted-foreground' : ''}`}>
          {email.subject}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {email.hasAttachments && (
          <span className="text-xs text-muted-foreground">[att]</span>
        )}
        {email.classification && (
          <Badge variant={classificationColors[email.classification] || 'outline'} className="text-xs">
            {email.classification}
          </Badge>
        )}
      </div>
    </button>
  )
}
