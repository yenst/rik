import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { homedir } from 'os'

interface RikConfig {
  endpoint: string
}

export function loadConfig(): RikConfig {
  const configPath = resolve(homedir(), '.rikrc')

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, 'utf-8')
      const parsed = JSON.parse(raw)
      return { endpoint: parsed.endpoint || 'http://localhost:3124' }
    } catch {
      // ignore bad config
    }
  }

  return { endpoint: 'http://localhost:3124' }
}
