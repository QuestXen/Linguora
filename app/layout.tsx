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

type AuthSessionResult = Awaited<ReturnType<typeof auth.api.getSession>>

const isSessionEnvelope = (
  payload: AuthSessionResult | null,
): payload is SessionEnvelope => Boolean(payload?.session)

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

  const session: SessionEnvelope | null = isSessionEnvelope(sessionResponse)
    ? sessionResponse
    : null

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
