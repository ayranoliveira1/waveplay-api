import 'dotenv/config'
import { beforeAll, afterAll } from 'vitest'
import { Pool } from 'pg'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const schemaId = randomUUID()

function generateUniqueDatabaseUrl(schemaId: string) {
  if (!process.env.DATABASE_URL) {
    throw new Error('Please provide a DATABASE_URL environment variable')
  }

  const url = new URL(process.env.DATABASE_URL)
  url.searchParams.set('schema', schemaId)

  return url.toString()
}

beforeAll(async () => {
  const databaseUrl = generateUniqueDatabaseUrl(schemaId)
  process.env.DATABASE_URL = databaseUrl

  execSync('pnpm prisma migrate deploy', { stdio: 'inherit' })
})

afterAll(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL?.split('?')[0],
  })

  await pool.query(`DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`)
  await pool.end()
})
