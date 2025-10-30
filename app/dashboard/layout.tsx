import { headers } from 'next/headers'
import type { ReactNode } from 'react'

import { auth } from '@/app/lib/auth'
import { requireDashboardAccess } from '@/app/lib/permissions'
import { DashboardShell } from '@/app/dashboard/components/DashboardShell'

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const headerList = await headers()
  const requestHeaders = new Headers()
  headerList.forEach((value, key) => {
    requestHeaders.append(key, value)
  })

  const session = await auth.api.getSession({ headers: requestHeaders })
  const userId = session?.user?.id ?? null
  const { user, isContributor } = await requireDashboardAccess(userId)

  return <DashboardShell user={user} isContributor={isContributor}>{children}</DashboardShell>
}
