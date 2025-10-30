import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import {
  db,
  authUsers,
  authAccounts,
  authSessions,
  authVerifications,
} from '@/app/db/client'

const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`${key} is not defined`)
  }
  return value
}

export const auth = betterAuth({
  secret: requireEnv('BETTER_AUTH_SECRET'),
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authUsers,
      account: authAccounts,
      session: authSessions,
      verification: authVerifications,
    },
    transaction: false,
  }),
  session: {
    storeSessionInDatabase: true,
  },
  socialProviders: {
    github: {
      clientId: requireEnv('GITHUB_CLIENT_ID'),
      clientSecret: requireEnv('GITHUB_CLIENT_SECRET'),
    },
    google: {
      clientId: requireEnv('GOOGLE_CLIENT_ID'),
      clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    },
  },
})
