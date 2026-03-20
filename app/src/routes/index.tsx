import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getTasks, createTask, updateTask } from '@/server/functions/tasks'
import type { Task } from '@/server/functions/tasks'
import { getEmails, markAsRead } from '@/server/functions/mail'
import type { Email } from '@/server/functions/mail'
import { getInvoices } from '@/server/functions/invoices'
import type { Invoice } from '@/server/functions/invoices'
import { getUpcomingEvents } from '@/server/functions/agenda'
import type { AgendaEvent } from '@/server/functions/agenda'
import { PriorityBadge } from '@/components/tasks/priority-badge'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { RikAvatar } from '@/components/rik-avatar'
import { HugeiconsIcon } from '@hugeicons/react'
import { Task01Icon, CheckListIcon, Layers01Icon } from '@hugeicons/core-free-icons'
import { InboxUnreadIcon, Mail01Icon, MailOpen01Icon } from '@hugeicons/core-free-icons'
import { timeAgo } from '@/lib/time'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [openTasks, doneTasks, emails, pendingInvoices, events] = await Promise.all([
      getTasks({ data: { status: 'open' } }),
      getTasks({ data: { status: 'done' } }),
      getEmails({ data: { classification: 'all' } }),
      getInvoices({ data: { status: 'pending' } }),
      getUpcomingEvents({ data: { days: 90 } }),
    ])
    return { openTasks, doneTasks, emails, pendingInvoices, events }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { openTasks, doneTasks, emails, pendingInvoices, events } = Route.useLoaderData()
  const unreadEmails = emails.filter(e => !e.isRead)
  const focusText = buildFocusText(openTasks, unreadEmails, pendingInvoices, events)

  return (
    <div className="p-4 h-[calc(100vh-2rem)] flex flex-col gap-4">
      {/* Avatar + AI focus */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-4 shrink-0">
        <RikAvatar />
        <div className="flex-1">
          <p className="text-sm font-medium">Rik</p>
          {focusText && <p className="text-xs text-muted-foreground mt-1">{focusText}</p>}
        </div>
      </div>

      {/* Cards grid — fills remaining height */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Tasks */}
        <div className="min-h-0 overflow-hidden">
          <TasksCard openTasks={openTasks} doneTasks={doneTasks} />
        </div>

        {/* Mail + Events stacked */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="shrink-0">
            <MailCard emails={emails} />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ComingUpCard events={events} />
          </div>
        </div>

        {/* Invoices */}
        {pendingInvoices.length > 0 && (
          <div className="min-h-0 overflow-hidden">
            <InvoicesCard invoices={pendingInvoices} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── AI Focus ───────────────────────────────────────── */

function buildFocusText(
  tasks: Task[],
  unread: Email[],
  invoices: Invoice[],
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
  if (overdue.length > 0) return `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`

  if (unread.length > 0) return `${unread.length} unread email${unread.length > 1 ? 's' : ''} waiting`

  if (tasks.length === 0 && invoices.length === 0) return 'All clear — nothing needs your attention.'

  return `${tasks.length} open task${tasks.length > 1 ? 's' : ''}`
}

/* ── Tasks ──────────────────────────────────────────── */

type TaskFilter = 'open' | 'done' | 'all'

function TasksCard({ openTasks, doneTasks }: { openTasks: Task[]; doneTasks: Task[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<TaskFilter>('open')
  const [newTitle, setNewTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const allTasks = [...openTasks, ...doneTasks]
  const tasks = filter === 'open' ? openTasks : filter === 'done' ? doneTasks : allTasks

  const filterLabel = filter === 'open' ? 'open' : filter === 'done' ? 'completed' : 'tasks'

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

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'open' : 'done'
    await updateTask({ data: { id: task.id, status: newStatus } })
    router.invalidate()
  }

  return (
    <div className="rounded-lg border border-border bg-card h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">{tasks.length} {filterLabel}</h3>
        <div className="flex items-center gap-1">
          <FilterIcon active={filter === 'open'} icon={Task01Icon} title="Open" onClick={() => setFilter('open')} />
          <FilterIcon active={filter === 'done'} icon={CheckListIcon} title="Completed" onClick={() => setFilter('done')} />
          <FilterIcon active={filter === 'all'} icon={Layers01Icon} title="All" onClick={() => setFilter('all')} />
          <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground ml-1">all &rarr;</Link>
        </div>
      </div>
      {filter !== 'done' && (
        <form onSubmit={handleCreate} className="flex gap-2 px-4 py-2.5 border-b border-border">
          <Input placeholder="Add a task..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} disabled={submitting} className="h-8 text-sm" />
          <Button type="submit" disabled={submitting || !newTitle.trim()} size="sm" className="h-8">Add</Button>
        </form>
      )}
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground px-4 py-6 text-center flex-1 flex items-center justify-center">
          {filter === 'done' ? 'No completed tasks.' : 'All clear.'}
        </p>
      ) : (
        <div className="divide-y divide-border flex-1 overflow-y-auto">
          {tasks.slice(0, 10).map(task => {
            const isDone = task.status === 'done'
            return (
              <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <Checkbox checked={isDone} onCheckedChange={() => handleToggle(task)} />
                <span className={`flex-1 text-sm truncate ${isDone ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                <PriorityBadge priority={task.priority} />
              </div>
            )
          })}
          {tasks.length > 10 && <div className="px-4 py-2 text-xs text-muted-foreground">+{tasks.length - 10} more</div>}
        </div>
      )}
    </div>
  )
}

/* ── Mail ───────────────────────────────────────────── */

type MailFilter = 'unread' | 'read' | 'all'

function MailCard({ emails }: { emails: Email[] }) {
  const [filter, setFilter] = useState<MailFilter>('unread')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const isEmailRead = (e: Email) => e.isRead || readIds.has(e.id)
  const unread = emails.filter(e => !isEmailRead(e))
  const read = emails.filter(e => isEmailRead(e))
  const filtered = filter === 'unread' ? unread : filter === 'read' ? read : emails
  const displayEmails = filtered.slice(0, 5)
  const filterLabel = filter === 'unread' ? `${unread.length} unread` : filter === 'read' ? `${read.length} read` : `${emails.length} emails`

  const handleClick = async (email: Email) => {
    if (expandedId === email.id) { setExpandedId(null); return }
    if (!isEmailRead(email)) {
      setReadIds(prev => new Set(prev).add(email.id))
      markAsRead({ data: { id: email.id, isRead: true } })
    }
    setExpandedId(email.id)
  }

  return (
    <div className="rounded-lg border border-border bg-card h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">{filterLabel}</h3>
        <div className="flex items-center gap-1">
          <FilterIcon active={filter === 'unread'} icon={InboxUnreadIcon} title="Unread" onClick={() => { setFilter('unread'); setExpandedId(null) }} />
          <FilterIcon active={filter === 'read'} icon={MailOpen01Icon} title="Read" onClick={() => { setFilter('read'); setExpandedId(null) }} />
          <FilterIcon active={filter === 'all'} icon={Layers01Icon} title="All" onClick={() => { setFilter('all'); setExpandedId(null) }} />
          <Link to="/mail" className="text-xs text-muted-foreground hover:text-foreground ml-1">inbox &rarr;</Link>
        </div>
      </div>
      {displayEmails.length === 0 ? (
        <p className="text-sm text-muted-foreground px-4 py-4 text-center">
          {filter === 'unread' ? 'All caught up.' : filter === 'read' ? 'No read emails.' : 'No emails.'}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {displayEmails.map(email => {
            const isExpanded = expandedId === email.id
            const isRead = email.isRead || readIds.has(email.id)
            const senderName = email.from.split('<')[0]?.trim() || email.from
            const senderInitial = senderName.charAt(0).toUpperCase()
            return (
              <div key={email.id}>
                <button
                  className={`w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors ${isExpanded ? 'bg-muted/20' : ''}`}
                  onClick={() => handleClick(email)}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5 ${!isRead ? 'bg-primary/80 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {senderInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm truncate ${!isRead ? 'font-medium' : 'text-muted-foreground'}`}>{senderName}</span>
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
    <div className="rounded-lg border border-border bg-card h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">Coming up</h3>
        <Link to="/agenda" className="text-xs text-muted-foreground hover:text-foreground">agenda &rarr;</Link>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground px-4 py-4 text-center flex-1 flex items-center justify-center">Nothing scheduled.</p>
      ) : (
        <div className="divide-y divide-border flex-1">
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

/* ── Invoices ───────────────────────────────────────── */

function InvoicesCard({ invoices }: { invoices: Invoice[] }) {
  const total = invoices.reduce((s, i) => s + (i.amount || 0), 0)

  return (
    <div className="rounded-lg border border-border bg-card h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">{invoices.length} pending</h3>
        <Link to="/invoices" className="text-xs text-muted-foreground hover:text-foreground">invoices &rarr;</Link>
      </div>
      <div className="divide-y divide-border">
        {invoices.slice(0, 4).map(inv => (
          <Link
            key={inv.id}
            to="/invoices/$invoiceId"
            params={{ invoiceId: inv.id }}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm truncate">{inv.vendor || 'Unknown'}</span>
            <span className="text-sm font-mono text-muted-foreground">
              {inv.amount != null ? `${(inv.amount / 100).toFixed(2)}` : '—'} {inv.currency || ''}
            </span>
          </Link>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>Total pending</span>
        <span className="font-mono font-medium text-foreground">{(total / 100).toFixed(2)} EUR</span>
      </div>
    </div>
  )
}

/* ── Shared ─────────────────────────────────────────── */

function FilterIcon({ active, icon, title, onClick }: { active: boolean; icon: unknown; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`p-1 rounded transition-colors ${active ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'}`}
      title={title}
    >
      <HugeiconsIcon icon={icon as never} size={14} />
    </button>
  )
}
