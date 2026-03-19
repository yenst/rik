import { createFileRoute } from '@tanstack/react-router'
import { enqueueMailProcessing } from '@/server/functions/webhooks'

export const Route = createFileRoute('/api/webhooks/mail')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text()
        if (!raw) {
          return Response.json({ error: 'Empty body' }, { status: 400 })
        }
        await enqueueMailProcessing(raw)
        return Response.json({ ok: true, queued: true })
      },
    },
  },
})
