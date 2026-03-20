import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getTasks, createTask, updateTask } from '@/server/functions/tasks'
import type { Task } from '@/server/functions/tasks'
import { getEmails, markAsRead } from '@/server/functions/mail'
import type { Email } from '@/server/functions/mail'
import { getInvoices } from '@/server/functions/invoices'
import { getUpcomingEvents } from '@/server/functions/agenda'
import type { AgendaEvent } from '@/server/functions/agenda'
import { PriorityBadge } from '@/components/tasks/priority-badge'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { timeAgo } from '@/lib/time'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [openTasks, emails, pendingInvoices, events] = await Promise.all([
      getTasks({ data: { status: 'open' } }),
      getEmails({ data: { classification: 'all' } }),
      getInvoices({ data: { status: 'pending' } }),
      getUpcomingEvents({ data: { days: 90 } }),
    ])
    return { openTasks, emails, pendingInvoices, events }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { openTasks, emails, pendingInvoices, events } = Route.useLoaderData()
  const unreadEmails = emails.filter(e => !e.isRead)

  const focusText = buildFocusText(openTasks, unreadEmails, pendingInvoices, events)

  return (
    <div className="p-6 space-y-5">
      {/* Top: Avatar + AI focus */}
      <div className="flex items-center gap-4">
        {/* Bobblehead placeholder */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold font-mono text-primary">R</span>
        </div>
        <div className="flex-1">
          {focusText && (
            <p className="text-sm">{focusText}</p>
          )}
        </div>
      </div>

      {/* Invoice alert */}
      {pendingInvoices.length > 0 && (
        <Link
          to="/invoices"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-chart-2/20 bg-chart-2/5 text-sm hover:bg-chart-2/10 transition-colors"
        >
          <span className="font-medium">
            {pendingInvoices.length} unpaid invoice{pendingInvoices.length > 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground font-mono">
            {(pendingInvoices.reduce((s, i) => s + (i.amount || 0), 0) / 100).toFixed(2)} EUR
          </span>
        </Link>
      )}

      {/* Columns: tasks, mail, events */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <TasksCard tasks={openTasks} />
        <UnreadMailCard emails={unreadEmails} />
        <ComingUpCard events={events} />
      </div>
    </div>
  )
}

/* ── AI Focus ───────────────────────────────────────── */

function buildFocusText(
  tasks: Task[],
  unread: Email[],
  invoices: Awaited<ReturnType<typeof getInvoices>>,
  events: AgendaEvent[],
): string | null {
  const now = new Date()

  const soonEvent = events.find(e => {
    const diff = new Date(e.startTime).getTime() - now.getTime()
    return diff > 0 && diff < 2 * 60 * 60 * 1000
  })
  if (soonEvent) {
    const mins = Math.round((new Date(soonEvent.startTime).getTime() - now.getTime()) / 60000)
    const timeStr = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
    return `${soonEvent.title} starts in ${timeStr}${soonEvent.location ? ` @ ${soonEvent.location}` : ''}`
  }

  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now)
  if (overdue.length > 0) return `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}: ${overdue.map(t => t.title).join(', ')}`

  if (invoices.length > 0) {
    const total = (invoices.reduce((s, i) => s + (i.amount || 0), 0) / 100).toFixed(2)
    return `${invoices.length} invoice${invoices.length > 1 ? 's' : ''} pending — ${total} EUR`
  }

  if (unread.length > 0) return `${unread.length} unread email${unread.length > 1 ? 's' : ''}`

  if (tasks.length === 0) return 'All clear — nothing needs your attention.'

  return `${tasks.length} open task${tasks.length > 1 ? 's' : ''} to work through.`
}

/* ── Tasks ──────────────────────────────────────────── */

function TasksCard({ tasks }: { tasks: Task[] }) {
  const router = useRouter()
  const [newTitle, setNewTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    setSubmitting(true)
    await createTask({ data: { title } })
    setNewTitle('')
    setSubmitting(false)
    router.invalidate()
  }

  const handleToggle = async (id: string) => {
    await updateTask({ data: { id, status: 'done' } })
    router.invalidate()
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">{tasks.length} open tasks</h3>
        <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground">all tasks &rarr;</Link>
      </div>
      <form onSubmit={handleCreate} className="flex gap-2 px-4 py-2.5 border-b border-border">
        <Input placeholder="Add a task..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} disabled={submitting} className="h-8 text-sm" />
        <Button type="submit" disabled={submitting || !newTitle.trim()} size="sm" className="h-8">Add</Button>
      </form>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground px-4 py-6 text-center">All clear.</p>
      ) : (
        <div className="divide-y divide-border">
          {tasks.slice(0, 8).map(task => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
              <Checkbox checked={false} onCheckedChange={() => handleToggle(task.id)} />
              <span className="flex-1 text-sm truncate">{task.title}</span>
              <PriorityBadge priority={task.priority} />
            </div>
          ))}
          {tasks.length > 8 && <div className="px-4 py-2 text-xs text-muted-foreground">+{tasks.length - 8} more</div>}
        </div>
      )}
    </div>
  )
}

/* ── Unread Mail ────────────────────────────────────── */

function UnreadMailCard({ emails }: { emails: Email[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const router = useRouter()

  const handleClick = async (email: Email) => {
    if (expandedId === email.id) { setExpandedId(null); return }
    if (!email.isRead) {
      await markAsRead({ data: { id: email.id, isRead: true } })
      router.invalidate()
    }
    setExpandedId(email.id)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">{emails.length} unread</h3>
        <Link to="/mail" className="text-xs text-muted-foreground hover:text-foreground">inbox &rarr;</Link>
      </div>
      {emails.length === 0 ? (
        <p className="text-sm text-muted-foreground px-4 py-6 text-center">All caught up.</p>
      ) : (
        <div className="divide-y divide-border">
          {emails.slice(0, 4).map(email => {
            const isExpanded = expandedId === email.id
            const senderName = email.from.split('<')[0]?.trim() || email.from
            const senderInitial = senderName.charAt(0).toUpperCase()
            return (
              <div key={email.id}>
                <button
                  className={`w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors ${isExpanded ? 'bg-muted/20' : ''}`}
                  onClick={() => handleClick(email)}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/80 text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                    {senderInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{senderName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono ml-auto shrink-0">{timeAgo(email.receivedAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 pl-14">
                    <div className="rounded-md bg-muted/30 p-3">
                      <pre className="text-xs whitespace-pre-wrap font-sans text-muted-foreground">{email.bodyPreview}</pre>
                      <Link to="/mail/$emailId" params={{ emailId: email.id }} className="text-xs text-primary hover:underline mt-2 inline-block">
                        Open full email &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Coming Up ──────────────────────────────────────── */

function ComingUpCard({ events }: { events: AgendaEvent[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">Coming up</h3>
        <Link to="/agenda" className="text-xs text-muted-foreground hover:text-foreground">agenda &rarr;</Link>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground px-4 py-6 text-center">Nothing scheduled.</p>
      ) : (
        <div className="divide-y divide-border">
          {events.slice(0, 5).map(event => (
            <div key={event.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">
                {new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-sm truncate">{event.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
