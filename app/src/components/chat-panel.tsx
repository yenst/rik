import { useState, useRef, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
      })
      const data = await res.json()

      setConversationId(data.conversationId)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
      }])

      // Invalidate router to refresh data if tools modified anything
      if (data.actions?.length > 0) {
        router.invalidate()
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        className="fixed bottom-4 right-4 bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
        onClick={() => setOpen(true)}
      >
        R
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-card border border-border rounded-lg shadow-xl flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-sm font-medium">Chat with Rik</span>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(false)}
        >
          close
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Ask Rik anything — create tasks, search emails, check invoices...
          </p>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="text-sm text-muted-foreground">Thinking...</div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Rik..."
            disabled={loading}
            autoFocus
          />
          <Button type="submit" disabled={loading || !input.trim()} size="sm">
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-foreground'
      }`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
