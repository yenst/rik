import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  // Try .env in root (../), then current dir
  const paths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '.env'),
  ]

  for (const envPath of paths) {
    if (!existsSync(envPath)) continue

    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue

      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim()

      // Don't override existing env vars
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
    return
  }
}

loadEnv()
