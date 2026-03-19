import { createFileRoute, Link } from '@tanstack/react-router'
import { getTasks } from '@/server/functions/tasks'
import { PriorityBadge } from '@/components/tasks/priority-badge'

export const Route = createFileRoute('/')({
  loader: () => getTasks({ data: { status: 'open' } }),
  component: DashboardPage,
})

function DashboardPage() {
  const tasks = Route.useLoaderData()

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TasksWidget tasks={tasks} />

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold mb-2">Mail</h3>
          <p className="text-sm text-muted-foreground">No emails yet — set up forwarding to get started.</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold mb-2">Agenda</h3>
          <p className="text-sm text-muted-foreground">No upcoming events.</p>
        </div>
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
