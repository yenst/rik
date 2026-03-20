import { createFileRoute } from '@tanstack/react-router'
import { chat } from '@/server/functions/chat'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { message, conversationId } = await request.json()

        if (!message || typeof message !== 'string') {
          return Response.json({ error: 'Missing "message" field' }, { status: 400 })
        }

        const result = await chat(message, conversationId)
        return Response.json(result)
      },
    },
  },
})
