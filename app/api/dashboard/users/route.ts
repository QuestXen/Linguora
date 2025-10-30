import { NextResponse } from 'next/server'

import { auth } from '@/app/lib/auth'
import { checkDashboardAccess } from '@/app/lib/permissions'
import { getUserById, listUsers } from '@/app/lib/users'

const ensureDashboardAccess = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers })
  const userId = session?.user?.id ?? null
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const user = await getUserById(userId)
  const access = await checkDashboardAccess(user ?? null)
  if (!access.allowed || !user) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user }
}

export async function GET(request: Request) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const url = new URL(request.url)
  const query = url.searchParams.get('q') ?? undefined
  const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10)
  const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20', 10)
  const currentPage = Math.max(page, 1)
  const providerParam = url.searchParams.get('provider') ?? 'all'
  const limit = Math.min(Math.max(pageSize, 1), 100)
  const offset = Math.max((currentPage - 1) * limit, 0)

  const result = await listUsers({
    query,
    limit,
    offset,
    provider: providerParam === 'github' || providerParam === 'google' ? providerParam : 'all',
  })

  return NextResponse.json({
    total: result.total,
    items: result.users.map(record => ({
      user: record.user,
      providers: record.providers,
    })),
    page: currentPage,
    pageSize: limit,
    totalPages: Math.max(Math.ceil(result.total / limit), 1),
  })
}
