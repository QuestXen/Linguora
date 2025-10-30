import { APIError, betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { customSession } from 'better-auth/plugins/custom-session'
import { eq } from 'drizzle-orm'

import {
  db,
  authUsers,
  authAccounts,
  authSessions,
  authVerifications,
} from '@/app/db/client'
import { checkDashboardAccess } from '@/app/lib/permissions'

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
  plugins: [
    customSession(async ({ user, session }, _ctx) => {
      void _ctx
      if (!user) {
        return {
          session: null,
          user: null,
          permissions: {
            dashboard: false,
            reason: 'not-authenticated' as const,
            isContributor: false,
          },
        }
      }

      const dbUser = await db.query.authUsers.findFirst({
        where: eq(authUsers.id, user.id),
      })
      if (!dbUser) {
        return {
          session: null,
          user: null,
          permissions: {
            dashboard: false,
            reason: 'not-authenticated' as const,
            isContributor: false,
          },
        }
      }

      const access = await checkDashboardAccess(dbUser)
      const now = new Date()

      // update last seen asynchronously; ignore failures
      void db
        .update(authUsers)
        .set({
          lastSeenAt: now,
          updatedAt: now,
        })
        .where(eq(authUsers.id, user.id))
        .catch(error => {
          console.error('Failed to update lastSeenAt', error)
        })

      return {
        session: {
          id: session.id,
          userId: session.userId,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          expiresAt: session.expiresAt,
        },
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          image: dbUser.image ?? null,
          emailVerified: dbUser.emailVerified,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
          role: dbUser.role,
          hasDashboardAccess: dbUser.hasDashboardAccess,
          isBanned: dbUser.isBanned,
          bannedAt: dbUser.bannedAt,
          banReason: dbUser.banReason ?? null,
          lastSeenAt: dbUser.lastSeenAt,
          contributorState: dbUser.contributorState,
          contributorCheckedAt: dbUser.contributorCheckedAt,
          contributorExpiresAt: dbUser.contributorExpiresAt,
          contributorLogin: dbUser.contributorLogin ?? null,
        },
        permissions: {
          dashboard: access.allowed,
          reason: access.reason,
          isContributor: access.isContributor,
        },
      }
    }),
  ],
  databaseHooks: {
    session: {
      create: {
        async before(session) {
          const user = await db.query.authUsers.findFirst({
            where: eq(authUsers.id, session.userId),
          })
          if (!user) {
            throw new APIError('UNAUTHORIZED', { message: 'User not found' })
          }
          if (user.isBanned) {
            throw new APIError('UNAUTHORIZED', { message: 'Account is banned' })
          }
        },
        async after(session) {
          const now = new Date()
          try {
            await db
              .update(authUsers)
              .set({ lastSeenAt: now, updatedAt: now })
              .where(eq(authUsers.id, session.userId))
          } catch (error) {
            console.error('Failed to update lastSeenAt after session creation', error)
          }
        },
      },
    },
  },
})
