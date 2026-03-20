import { useState, useRef, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useHotkeys } from '@/lib/hotkeys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function ChatPanel() {
  const { chatOpen, setChatOpen } = useHotkeys()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  useEffect(() => {
    if (chatOpen) inputRef.current?.focus()
  }, [chatOpen])

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
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])

      if (data.actions?.length > 0) {
        router.invalidate()
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {chatOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setChatOpen(false)}
        />
      )}
      <div className={`fixed top-0 right-0 h-full w-[400px] bg-card border-l border-border shadow-xl z-50 flex flex-col transition-transform duration-200 ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold">Chat with Rik</h3>
            <p className="text-xs text-muted-foreground font-mono">Mod+J to toggle</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)}>
            Close
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              Ask Rik anything — create tasks, search emails, check invoices...
            </p>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground font-mono">
                thinking...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Rik..."
              disabled={loading}
              className="font-mono text-sm"
            />
            <Button type="submit" disabled={loading || !input.trim()} size="sm">
              Send
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-foreground'
      }`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
