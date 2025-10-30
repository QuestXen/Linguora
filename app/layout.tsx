// app/layout.tsx
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { poppins, domine, playfair, merriweather } from './fonts'
import './globals.css'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'Linguora',
  description: 'Learn a new word every day',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${domine.variable} ${playfair.variable} ${merriweather.variable}`}
    >
      <body className={poppins.className}>
        <ClerkProvider
          appearance={{
            // globale Farben
            variables: {
              colorPrimary: '#1b9d89',
              colorBackground: '#ffffffff',
              borderRadius: '0.6rem',
            }
          }}
        >
          {children}
        </ClerkProvider>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
