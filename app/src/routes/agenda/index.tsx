import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getUpcomingEvents, createEvent, deleteEvent } from '@/server/functions/agenda'
import type { AgendaEvent } from '@/server/functions/agenda'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/agenda/')({
  loader: () => getUpcomingEvents({ data: { days: 90 } }),
  component: AgendaPage,
})

function AgendaPage() {
  const events = Route.useLoaderData()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Agenda</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add event'}
        </Button>
      </div>

      {showForm && (
        <CreateEventForm
          onCreated={() => {
            setShowForm(false)
            router.invalidate()
          }}
        />
      )}

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No upcoming events. Add one or tell Rik to create one via chat.
        </p>
      ) : (
        <div className="space-y-1">
          {events.map(event => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventRow({ event }: { event: AgendaEvent }) {
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteEvent({ data: { id: event.id } })
    router.invalidate()
  }

  const startDate = new Date(event.startTime)
  const dateStr = startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = event.isAllDay ? 'All day' : startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 group">
      <div className="w-24 shrink-0">
        <div className="text-sm font-medium">{dateStr}</div>
        <div className="text-xs text-muted-foreground">{timeStr}</div>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm">{event.title}</span>
        {event.location && (
          <span className="text-xs text-muted-foreground ml-2">{event.location}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {event.source !== 'manual' && (
          <Badge variant="outline" className="text-xs">{event.source}</Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 text-destructive h-7 px-2"
          onClick={handleDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}

function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !date) return

    setSubmitting(true)
    const startTime = isAllDay
      ? `${date}T00:00:00`
      : `${date}T${time || '09:00'}:00`
    const end = endTime ? `${date}T${endTime}:00` : undefined

    await createEvent({ data: { title, startTime, endTime: end, location: location || undefined, isAllDay } })
    setSubmitting(false)
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border p-4 mb-6 space-y-3">
      <Input
        placeholder="Event title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <div className="grid grid-cols-3 gap-3">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {!isAllDay && (
          <>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="Start" />
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="End" />
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
        <label className="flex items-center gap-2 text-sm shrink-0">
          <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
          All day
        </label>
      </div>
      <Button type="submit" disabled={submitting || !title || !date} size="sm">
        {submitting ? 'Creating...' : 'Create event'}
      </Button>
    </form>
  )
}
