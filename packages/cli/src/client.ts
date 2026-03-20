import { loadConfig } from './config'

interface ChatResponse {
  reply: string
  conversationId: string
  actions: Array<{ tool: string; args: unknown }>
}

export async function sendMessage(message: string, conversationId?: string): Promise<ChatResponse> {
  const { endpoint } = loadConfig()

  const res = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  })

  if (!res.ok) {
    throw new Error(`Rik responded with ${res.status}: ${await res.text()}`)
  }

  return res.json()
}
