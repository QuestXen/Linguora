// app/layout.tsx
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { poppins, domine, playfair, merriweather } from './fonts'
import './globals.css'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

import { SessionProvider } from '@/app/components/SessionProvider'
import { auth } from '@/app/lib/auth'
import type { SessionEnvelope } from '@/app/lib/auth-types'
import {
  sessionDateToString,
  sessionFieldToNullableString,
} from '@/app/lib/auth-types'

type AuthSessionResult = Awaited<ReturnType<typeof auth.api.getSession>>

const normalizeSession = (
  payload: AuthSessionResult | null,
): SessionEnvelope | null => {
  if (!payload || !payload.session || !payload.user) {
    return null
  }

  const { session, user, permissions } = payload

  return {
    session: {
      id: session.id,
      userId: session.userId,
      token: session.token ?? null,
      expiresAt: sessionDateToString(session.expiresAt),
      createdAt: sessionDateToString(session.createdAt),
      updatedAt: sessionDateToString(session.updatedAt),
      ipAddress: session.ipAddress ?? null,
      userAgent: session.userAgent ?? null,
    },
    user: {
      id: user.id,
      name: user.name ?? null,
      email: user.email,
      image: user.image ?? null,
      emailVerified: user.emailVerified,
      createdAt: sessionDateToString(user.createdAt),
      updatedAt: sessionDateToString(user.updatedAt),
      role: user.role ?? null,
      hasDashboardAccess: user.hasDashboardAccess,
      isBanned: user.isBanned,
      bannedAt: sessionFieldToNullableString(user.bannedAt),
      banReason: user.banReason ?? null,
      lastSeenAt: sessionFieldToNullableString(user.lastSeenAt),
      contributorState: user.contributorState ?? null,
      contributorCheckedAt: sessionFieldToNullableString(user.contributorCheckedAt),
      contributorExpiresAt: sessionFieldToNullableString(user.contributorExpiresAt),
      contributorLogin: user.contributorLogin ?? null,
    },
    permissions,
  }
}

export const metadata: Metadata = {
  title: 'Linguora',
  description: 'Learn a new word every day',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headerList = await headers()
  const requestHeaders = new Headers()
  for (const key of headerList.keys()) {
    const value = headerList.get(key)
    if (value !== null) {
      requestHeaders.append(key, value)
    }
  }

  const sessionResponse = await auth.api
    .getSession({ headers: requestHeaders })
    .catch(error => {
      console.error('Failed to resolve session in RootLayout', error)
      return null
    })

  const session = normalizeSession(sessionResponse)

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${domine.variable} ${playfair.variable} ${merriweather.variable}`}
    >
      <body className={poppins.className}>
        <SessionProvider initialSession={session}>{children}</SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
