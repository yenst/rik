import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getTasks, createTask, updateTask, deleteTask } from '@/server/functions/tasks'
import type { Task } from '@/server/functions/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { PriorityBadge } from '@/components/tasks/priority-badge'

const statusFilters = ['all', 'open', 'in_progress', 'done'] as const
type StatusFilter = (typeof statusFilters)[number]

const filterLabels: Record<StatusFilter, string> = {
  all: 'All',
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
}

export const Route = createFileRoute('/tasks/')({
  loaderDeps: ({ search }) => ({
    status: ((search as Record<string, unknown>).status as StatusFilter) || 'all',
  }),
  loader: ({ deps }) => getTasks({ data: { status: deps.status } }),
  component: TasksPage,
})

function TasksPage() {
  const tasks = Route.useLoaderData()
  const router = useRouter()
  const status = Route.useLoaderDeps().status
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

  const handleToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'open' : 'done'
    await updateTask({ data: { id, status: newStatus } })
    router.invalidate()
  }

  const handleDelete = async (id: string) => {
    await deleteTask({ data: { id } })
    router.invalidate()
  }

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Tasks</h2>

      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <Input
          placeholder="Add a task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        <Button type="submit" disabled={submitting || !newTitle.trim()}>
          Add
        </Button>
      </form>

      <div className="flex gap-1 mb-4">
        {statusFilters.map((f) => (
          <Button
            key={f}
            variant={status === f ? 'default' : 'ghost'}
            size="sm"
            onClick={() => router.navigate({ search: { status: f } })}
          >
            {filterLabels[f]}
          </Button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No tasks yet. Type above to create one.
        </p>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task
  onToggle: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const isDone = task.status === 'done'

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 group">
      <Checkbox
        checked={isDone}
        onCheckedChange={() => onToggle(task.id, task.status)}
      />
      <button
        className="flex-1 text-left"
        onClick={() => router.navigate({ to: '/tasks/$taskId', params: { taskId: task.id } })}
      >
        <span className={isDone ? 'line-through text-muted-foreground' : ''}>
          {task.title}
        </span>
      </button>
      <div className="flex items-center gap-2">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className="text-xs text-muted-foreground">
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 text-destructive h-7 px-2"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(task.id)
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}
