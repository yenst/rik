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
import { CommandPalette } from '@/components/command-palette'
import { ChatPanel } from '@/components/chat-panel'

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
      <div className="flex h-screen bg-background text-foreground">
        <aside className="w-56 border-r border-border bg-muted/30 flex flex-col">
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-bold tracking-tight">Rik</h1>
            <p className="text-xs text-muted-foreground">Personal Assistant</p>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            <NavLink to="/" label="Dashboard" />
            <NavLink to="/tasks" label="Tasks" />
            <NavLink to="/mail" label="Mail" />
            <NavLink to="/invoices" label="Invoices" />
            <NavLink to="/agenda" label="Agenda" />
          </nav>
          <div className="p-3 border-t border-border">
            <kbd className="text-xs text-muted-foreground">⌘K</kbd>
            <span className="text-xs text-muted-foreground ml-1">Command</span>
          </div>
        </aside>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <ClientOnly>
          <CommandPalette />
          <ChatPanel />
        </ClientOnly>
      </div>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
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

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="block px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted [&.active]:bg-muted [&.active]:font-medium"
      activeOptions={{ exact: to === '/' }}
    >
      {label}
    </Link>
  )
}
