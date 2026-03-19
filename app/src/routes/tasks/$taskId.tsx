import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getTask, updateTask, deleteTask } from '@/server/functions/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/tasks/$taskId')({
  loader: ({ params }) => getTask({ data: { id: params.taskId } }),
  component: TaskDetailPage,
})

function TaskDetailPage() {
  const task = Route.useLoaderData()
  const router = useRouter()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState(task.priority)
  const [status, setStatus] = useState(task.status)
  const [dueDate, setDueDate] = useState(task.dueDate || '')
  const [saving, setSaving] = useState(false)

  const hasChanges =
    title !== task.title ||
    description !== (task.description || '') ||
    priority !== task.priority ||
    status !== task.status ||
    dueDate !== (task.dueDate || '')

  const handleSave = async () => {
    setSaving(true)
    await updateTask({
      data: {
        id: task.id,
        title,
        description: description || null,
        priority: priority as 'low' | 'medium' | 'high',
        status: status as 'open' | 'in_progress' | 'done',
        dueDate: dueDate || null,
      },
    })
    setSaving(false)
    router.invalidate()
  }

  const handleDelete = async () => {
    await deleteTask({ data: { id: task.id } })
    router.navigate({ to: '/tasks' })
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.navigate({ to: '/tasks' })}
        >
          &larr; Back
        </Button>
        <Badge variant="outline">{task.status}</Badge>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={4}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Created {new Date(task.createdAt).toLocaleString()}
          {task.completedAt && ` · Completed ${new Date(task.completedAt).toLocaleString()}`}
        </p>
      </div>
    </div>
  )
}
