import { useTheme } from '@/lib/theme'

const themes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-1">
      {themes.map((t) => (
        <button
          key={t.value}
          className={`px-2 py-1 rounded text-xs transition-colors ${
            theme === t.value
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTheme(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
