import { NextResponse } from 'next/server'

import { auth } from '@/app/lib/auth'
import { loadOverviewSnapshot } from '@/app/dashboard/data'
import { checkDashboardAccess } from '@/app/lib/permissions'
import { getUserById } from '@/app/lib/users'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const userId = session?.user?.id ?? null
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await getUserById(userId)
  const access = await checkDashboardAccess(user ?? null)
  if (!access.allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data = await loadOverviewSnapshot()
  return NextResponse.json(data)
}
