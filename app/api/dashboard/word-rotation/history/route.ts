import { NextResponse } from 'next/server'

import {
  clearFutureAssignmentsForSlug,
  formatDateKey,
  getCurrentAndNextWord,
  removeFromHistory,
} from '@/app/lib/word-rotation'
import { auth } from '@/app/lib/auth'
import { checkDashboardAccess } from '@/app/lib/permissions'
import { getUserById } from '@/app/lib/users'

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

export async function DELETE(request: Request) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  try {
    await removeFromHistory(slug)
    const tz = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'
    const todayKey = formatDateKey(new Date(), tz)
    await clearFutureAssignmentsForSlug(slug, todayKey)
    const rotation = await getCurrentAndNextWord(tz)
    return NextResponse.json(rotation)
  } catch (error) {
    console.error('Failed to remove history entry', error)
    return NextResponse.json(
      { error: 'Failed to update history' },
      { status: 500 },
    )
  }
}
