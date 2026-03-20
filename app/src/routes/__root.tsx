import type { ReactNode } from 'react'
import {
  ClientOnly,
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import globalsCss from '@/styles/globals.css?url'
import { ThemeProvider } from '@/lib/theme'
import { HotkeyProvider } from '@/lib/hotkeys'
import { CommandPalette } from '@/components/command-palette'
import { ChatPanel } from '@/components/chat-panel'
import { ThemeSwitcher } from '@/components/theme-switcher'

export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: 'stylesheet', href: globalsCss },
    ],
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
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function AppShell() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-56 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="text-lg font-bold tracking-tight font-mono">rik</h1>
          <p className="text-xs text-muted-foreground">personal assistant</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <NavLink to="/" label="Dashboard" />
          <NavLink to="/tasks" label="Tasks" />
          <NavLink to="/mail" label="Mail" />
          <NavLink to="/invoices" label="Invoices" />
          <NavLink to="/agenda" label="Agenda" />
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <ThemeSwitcher />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span><kbd className="font-mono">Mod+K</kbd> search</span>
            <span><kbd className="font-mono">Mod+J</kbd> chat</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <CommandPalette />
      <ChatPanel />
    </div>
  )
}

function StaticShell() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-56 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold tracking-tight font-mono">rik</h1>
        </div>
      </aside>
      <main className="flex-1" />
    </div>
  )
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="block px-3 py-2 rounded-md text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground [&.active]:font-medium"
      activeOptions={{ exact: to === '/' }}
    >
      {label}
    </Link>
  )
}
