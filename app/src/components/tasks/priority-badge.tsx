import { Badge } from '@/components/ui/badge'
import type { TaskPriority } from '@/server/functions/tasks'

const priorityVariant: Record<TaskPriority, 'destructive' | 'secondary' | 'outline'> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant={priorityVariant[priority]} className="text-xs">
      {priority}
    </Badge>
  )
}
