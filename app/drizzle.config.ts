import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './src/server/db/migrations',
  schema: './src/server/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH || './data/rik.db',
  },
})
