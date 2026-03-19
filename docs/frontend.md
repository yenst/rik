# Frontend — TanStack Start + shadcn/ui

## Framework

The frontend is part of the TanStack Start application — not a separate SPA. TanStack Start handles both the UI rendering and the server-side logic in one process.

### Routing

Uses TanStack Router with file-based routing. Route files live in `app/src/routes/`.

```
routes/
├── __root.tsx          # Root layout (sidebar, nav, global providers)
├── index.tsx           # Dashboard (agenda, tasks, recent emails)
├── mail/
│   ├── index.tsx       # Email inbox list
│   └── $emailId.tsx    # Single email view
├── tasks/
│   ├── index.tsx       # Task list
│   └── $taskId.tsx     # Single task view
└── invoices/
    ├── index.tsx       # Invoice list
    └── $invoiceId.tsx  # Single invoice detail
```

### Data Fetching

TanStack Query is integrated into TanStack Start. Server functions are called directly from route loaders and components.

Pattern for route-level data loading:

```tsx
// routes/tasks/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { getTasks } from '../../server/functions/tasks'

export const Route = createFileRoute('/tasks/')({
  loader: () => getTasks(),
  component: TasksPage,
})

function TasksPage() {
  const tasks = Route.useLoaderData()
  // render tasks...
}
```

Pattern for mutations with cache invalidation:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTask } from '../../server/functions/tasks'

function CreateTaskForm() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
  // form UI...
}
```

## UI Components — shadcn/ui

Components are installed via the shadcn CLI into `app/src/components/ui/`. They are not a dependency — they're source code we own.

### Core components needed

- **Layout**: `sidebar`, `card`, `tabs`, `separator`
- **Data display**: `table`, `badge`, `avatar`, `calendar`
- **Forms**: `input`, `textarea`, `button`, `select`, `checkbox`, `form`
- **Feedback**: `toast`, `alert`, `skeleton`, `dialog`
- **Navigation**: `command` (for command palette / quick actions)

### Dashboard Layout

The dashboard (`routes/index.tsx`) is the main screen. It shows:

1. **Agenda widget** — Upcoming events for today/this week. Uses a card layout with time + title.
2. **Task list widget** — Open tasks sorted by priority/due date. Quick-add input at the top.
3. **Recent emails widget** — Latest processed emails with classification badges (invoice, actionable, newsletter, etc.).
4. **Quick actions** — Command palette (⌘K) for creating tasks, searching emails, etc.

### Design Notes

- Dark mode support via Tailwind's `dark:` classes. Respect system preference.
- Responsive but optimized for desktop (this is a local tool, most likely used on a laptop/desktop).
- Keep the UI dense — this is a productivity tool, not a marketing site. Show information, not whitespace.
- Keyboard-first where possible. The command palette should be the fastest way to do anything.
