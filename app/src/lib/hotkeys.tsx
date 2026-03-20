import { createContext, useContext, useState } from 'react'
import { useHotkey } from '@tanstack/react-hotkeys'

interface HotkeyState {
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
}

const HotkeyContext = createContext<HotkeyState>({
  commandPaletteOpen: false,
  setCommandPaletteOpen: () => {},
  chatOpen: false,
  setChatOpen: () => {},
})

export function HotkeyProvider({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  useHotkey('Mod+K', () => setCommandPaletteOpen(prev => !prev))
  useHotkey('Mod+J', () => setChatOpen(prev => !prev))
  useHotkey('Escape', () => {
    if (chatOpen) setChatOpen(false)
  })

  return (
    <HotkeyContext.Provider value={{ commandPaletteOpen, setCommandPaletteOpen, chatOpen, setChatOpen }}>
      {children}
    </HotkeyContext.Provider>
  )
}

export function useHotkeys() {
  return useContext(HotkeyContext)
}
