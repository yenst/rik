import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getTasks, createTask, updateTask } from '@/server/functions/tasks'
import type { Task } from '@/server/functions/tasks'
import { getEmails } from '@/server/functions/mail'
import { getInvoices } from '@/server/functions/invoices'
import { getUpcomingEvents } from '@/server/functions/agenda'
import { PriorityBadge } from '@/components/tasks/priority-badge'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [openTasks, allTasks, emails, invoices, events] = await Promise.all([
      getTasks({ data: { status: 'open' } }),
      getTasks({ data: { status: 'all' } }),
      getEmails({ data: { classification: 'all' } }),
      getInvoices({ data: { status: 'all' } }),
      getUpcomingEvents({ data: { days: 90 } }),
    ])
    return { openTasks, allTasks, emails, invoices, events }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { openTasks, allTasks, emails, invoices, events } = Route.useLoaderData()
  const router = useRouter()
  const [quickTask, setQuickTask] = useState('')

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = quickTask.trim()
    if (!title) return

    await createTask({ data: { title } })
    setQuickTask('')
    router.invalidate()
  }

  const doneTasks = allTasks.filter(t => t.status === 'done').length
  const pendingInvoices = invoices.filter(i => i.status === 'pending')
  const unreadEmails = emails.filter(e => !e.isRead).length
  const totalInvoiceAmount = pendingInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Open tasks" value={openTasks.length} />
        <StatCard label="Unread emails" value={unreadEmails} />
        <StatCard label="Pending invoices" value={`${(totalInvoiceAmount / 100).toFixed(2)}`} sub={`${pendingInvoices.length} unpaid`} />
        <StatCard label="Upcoming events" value={events.length} sub="next 90 days" />
      </div>

      <form onSubmit={handleQuickAdd}>
        <Input
          placeholder="Quick add task... (press enter)"
          value={quickTask}
          onChange={(e) => setQuickTask(e.target.value)}
          className="font-mono text-sm"
        />
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TasksWidget tasks={openTasks} />
        <MailWidget emails={emails} />
        <AgendaWidget events={events} />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold font-mono mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function TasksWidget({ tasks }: { tasks: Task[] }) {
  const router = useRouter()

  const handleToggle = async (id: string) => {
    await updateTask({ data: { id, status: 'done' } })
    router.invalidate()
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Tasks</h3>
        <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground">
          View all &rarr;
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open tasks.</p>
      ) : (
        <div className="space-y-1">
          {tasks.slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-2 py-1.5 -mx-2">
              <Checkbox
                checked={false}
                onCheckedChange={() => handleToggle(task.id)}
              />
              <Link
                to="/tasks/$taskId"
                params={{ taskId: task.id }}
                className="flex-1 truncate"
              >
                {task.title}
              </Link>
              <PriorityBadge priority={task.priority} />
            </div>
          ))}
          {tasks.length > 5 && (
            <p className="text-xs text-muted-foreground px-2">+{tasks.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  )
}

function MailWidget({ emails }: { emails: Awaited<ReturnType<typeof getEmails>> }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Mail</h3>
        <Link to="/mail" className="text-xs text-muted-foreground hover:text-foreground">
          View all &rarr;
        </Link>
      </div>
      {emails.length === 0 ? (
        <p className="text-sm text-muted-foreground">No emails yet.</p>
      ) : (
        <div className="space-y-1">
          {emails.slice(0, 5).map((email) => (
            <Link
              key={email.id}
              to="/mail/$emailId"
              params={{ emailId: email.id }}
              className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-2 py-1.5 -mx-2"
            >
              {!email.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              <span className="truncate flex-1">{email.subject || '(no subject)'}</span>
              {email.classification && (
                <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                  {email.classification}
                </Badge>
              )}
            </Link>
          ))}
          {emails.length > 5 && (
            <p className="text-xs text-muted-foreground px-2">+{emails.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  )
}

function AgendaWidget({ events }: { events: Awaited<ReturnType<typeof getUpcomingEvents>> }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Agenda</h3>
        <Link to="/agenda" className="text-xs text-muted-foreground hover:text-foreground">
          View all &rarr;
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming events.</p>
      ) : (
        <div className="space-y-1">
          {events.slice(0, 5).map((event) => {
            const start = new Date(event.startTime)
            return (
              <div key={event.id} className="flex items-center gap-2 text-sm px-2 py-1.5 -mx-2">
                <span className="text-xs text-muted-foreground font-mono w-14 shrink-0">
                  {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <span className="truncate">{event.title}</span>
                {!event.isAllDay && (
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )
          })}
          {events.length > 5 && (
            <p className="text-xs text-muted-foreground px-2">+{events.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  )
}
