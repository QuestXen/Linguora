import type { Metadata } from 'next'
import { poppins, domine, playfair, merriweather } from './fonts'
import './globals.css'

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
    <html lang="en" className={`${poppins.variable} ${domine.variable} ${playfair.variable} ${merriweather.variable}`}>
      <body className={poppins.className}>{children}</body>
    </html>
  )
}