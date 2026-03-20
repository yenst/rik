import { useState, useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useHotkeys } from '@/lib/hotkeys'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { createTask } from '@/server/functions/tasks'

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Tasks', to: '/tasks' },
  { label: 'Mail', to: '/mail' },
  { label: 'Invoices', to: '/invoices' },
  { label: 'Agenda', to: '/agenda' },
]

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useHotkeys()
  const [query, setQuery] = useState('')
  const router = useRouter()

  const close = useCallback(() => {
    setCommandPaletteOpen(false)
    setQuery('')
  }, [setCommandPaletteOpen])

  const navigate = useCallback(
    (to: string) => {
      close()
      router.navigate({ to })
    },
    [router, close],
  )

  const handleCreateTask = useCallback(async () => {
    const title = query.trim()
    if (!title) return

    await createTask({ data: { title } })
    close()
    router.invalidate()
    router.navigate({ to: '/tasks' })
  }, [query, router, close])

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput
        placeholder="Type a command or search..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {query.trim() ? (
            <button
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded"
              onClick={handleCreateTask}
            >
              Create task: &quot;{query.trim()}&quot;
            </button>
          ) : (
            'No results found.'
          )}
        </CommandEmpty>
        <CommandGroup heading="Navigation">
          {navItems.map((item) => (
            <CommandItem key={item.to} onSelect={() => navigate(item.to)}>
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {query.trim() && (
          <CommandGroup heading="Actions">
            <CommandItem onSelect={handleCreateTask}>
              Create task: &quot;{query.trim()}&quot;
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
