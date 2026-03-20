import type { ReactNode } from 'react'
import { useState, useRef, useEffect } from 'react'
import {
  ClientOnly,
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Home01Icon } from '@hugeicons/core-free-icons'
import { Task01Icon } from '@hugeicons/core-free-icons'
import { Mail01Icon } from '@hugeicons/core-free-icons'
import { Invoice01Icon } from '@hugeicons/core-free-icons'
import { Calendar01Icon } from '@hugeicons/core-free-icons'
import globalsCss from '@/styles/globals.css?url'
import { ThemeProvider } from '@/lib/theme'
import { HotkeyProvider } from '@/lib/hotkeys'
import { CommandPalette } from '@/components/command-palette'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Input } from '@/components/ui/input'

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'stylesheet', href: globalsCss }],
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Rik — Personal Assistant' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <ClientOnly fallback={<StaticShell />}>
        <ThemeProvider>
          <HotkeyProvider>
            <AppShell />
          </HotkeyProvider>
        </ThemeProvider>
      </ClientOnly>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  )
}

function AppShell() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Collapsed icon sidebar */}
      <aside className="w-14 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col items-center py-3 gap-1 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
          <span className="text-sm font-bold font-mono text-primary">R</span>
        </div>
        <IconNavLink to="/" icon={Home01Icon} label="Dashboard" />
        <IconNavLink to="/tasks" icon={Task01Icon} label="Tasks" />
        <IconNavLink to="/mail" icon={Mail01Icon} label="Mail" />
        <IconNavLink to="/invoices" icon={Invoice01Icon} label="Invoices" />
        <IconNavLink to="/agenda" icon={Calendar01Icon} label="Agenda" />
        <div className="flex-1" />
        <div className="mb-1">
          <ThemeSwitcherCompact />
        </div>
      </aside>

      {/* Chat panel */}
      <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
        <SidebarChat />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <CommandPalette />
    </div>
  )
}

/* ── Icon Nav ────────────────────────────────────────── */

function IconNavLink({ to, icon, label }: { to: string; icon: unknown; label: string }) {
  return (
    <Link
      to={to}
      className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
      activeOptions={{ exact: to === '/' }}
      title={label}
    >
      <HugeiconsIcon icon={icon as never} size={20} />
    </Link>
  )
}

/* ── Compact Theme Switcher ──────────────────────────── */

function ThemeSwitcherCompact() {
  const [cycleIndex, setCycleIndex] = useState(0)
  const themes = ['dark', 'light', 'system'] as const

  return (
    <button
      className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors text-[10px] font-mono"
      onClick={() => {
        const next = (cycleIndex + 1) % 3
        setCycleIndex(next)
        // Access theme context
        document.documentElement.classList.toggle('dark', themes[next] === 'dark' || (themes[next] === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
        localStorage.setItem('rik-theme', themes[next]!)
      }}
      title="Toggle theme"
    >
      {['D', 'L', 'S'][cycleIndex]}
    </button>
  )
}

/* ── Sidebar Chat ───────────────────────────────────── */

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

function SidebarChat() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([])
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
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      if (data.actions?.length > 0) router.invalidate()
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/60 to-primary/20 border border-primary/30 flex items-center justify-center">
          <span className="text-[10px] font-bold font-mono text-primary-foreground">R</span>
        </div>
        <span className="text-sm font-medium">Rik</span>
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">Mod+J</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Ask me anything...
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-lg px-3 py-1.5 text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-foreground'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/50 rounded-lg px-3 py-1.5 text-xs text-muted-foreground font-mono">
              thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-3 py-3 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Rik..."
          disabled={loading}
          className="h-8 text-sm"
        />
      </form>
    </>
  )
}

/* ── Static Shell (SSR) ──────────────────────────────── */

function StaticShell() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-14 border-r border-border bg-sidebar" />
      <div className="w-72 border-r border-border bg-card" />
      <main className="flex-1" />
    </div>
  )
}
