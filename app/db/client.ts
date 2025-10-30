import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined')
}

neonConfig.fetchConnectionCache = true

const sql = neon(connectionString)

export const db = drizzle(sql, { schema })
export * from './schema'

export type DbClient = typeof db
export type DbTransaction =
  Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown
    ? T
    : never
export type QueryableDb = DbClient | DbTransaction
