import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getTasks, createTask } from '@/server/functions/tasks'
import { getEmails } from '@/server/functions/mail'
import { getUpcomingEvents } from '@/server/functions/agenda'
import { PriorityBadge } from '@/components/tasks/priority-badge'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [tasks, emails, events] = await Promise.all([
      getTasks({ data: { status: 'open' } }),
      getEmails({ data: { classification: 'all' } }),
      getUpcomingEvents({ data: { days: 90 } }),
    ])
    return { tasks, emails, events }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { tasks, emails, events } = Route.useLoaderData()
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

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>

      <form onSubmit={handleQuickAdd}>
        <Input
          placeholder="Quick add task... (press enter)"
          value={quickTask}
          onChange={(e) => setQuickTask(e.target.value)}
        />
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TasksWidget tasks={tasks} />
        <MailWidget emails={emails} />
        <AgendaWidget events={events} />
      </div>
    </div>
  )
}

function TasksWidget({ tasks }: { tasks: Awaited<ReturnType<typeof getTasks>> }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Tasks</h3>
        <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground">
          View all &rarr;
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open tasks.</p>
      ) : (
        <div className="space-y-2">
          {tasks.slice(0, 5).map((task) => (
            <Link
              key={task.id}
              to="/tasks/$taskId"
              params={{ taskId: task.id }}
              className="flex items-center justify-between text-sm hover:bg-muted/50 rounded px-2 py-1 -mx-2"
            >
              <span className="truncate">{task.title}</span>
              <PriorityBadge priority={task.priority} />
            </Link>
          ))}
          {tasks.length > 5 && (
            <p className="text-xs text-muted-foreground">+{tasks.length - 5} more</p>
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
        <h3 className="font-semibold">Mail</h3>
        <Link to="/mail" className="text-xs text-muted-foreground hover:text-foreground">
          View all &rarr;
        </Link>
      </div>
      {emails.length === 0 ? (
        <p className="text-sm text-muted-foreground">No emails yet — set up forwarding to get started.</p>
      ) : (
        <div className="space-y-2">
          {emails.slice(0, 5).map((email) => (
            <Link
              key={email.id}
              to="/mail/$emailId"
              params={{ emailId: email.id }}
              className="flex items-center justify-between text-sm hover:bg-muted/50 rounded px-2 py-1 -mx-2"
            >
              <span className="truncate flex-1">{email.subject || '(no subject)'}</span>
              {email.classification && (
                <Badge variant="outline" className="text-xs ml-2 shrink-0">
                  {email.classification}
                </Badge>
              )}
            </Link>
          ))}
          {emails.length > 5 && (
            <p className="text-xs text-muted-foreground">+{emails.length - 5} more</p>
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
        <h3 className="font-semibold">Agenda</h3>
        <Link to="/agenda" className="text-xs text-muted-foreground hover:text-foreground">
          View all &rarr;
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming events.</p>
      ) : (
        <div className="space-y-2">
          {events.slice(0, 5).map((event) => {
            const start = new Date(event.startTime)
            return (
              <div
                key={event.id}
                className="flex items-center gap-2 text-sm px-2 py-1 -mx-2"
              >
                <span className="text-xs text-muted-foreground w-16 shrink-0">
                  {start.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                </span>
                <span className="truncate">{event.title}</span>
                {!event.isAllDay && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )
          })}
          {events.length > 5 && (
            <p className="text-xs text-muted-foreground">+{events.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  )
}
