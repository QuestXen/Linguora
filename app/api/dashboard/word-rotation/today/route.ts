import { NextResponse } from 'next/server'

import { loadWordsBootstrap } from '@/app/dashboard/data'
import {
  formatDateKey,
  setManualWordForDate,
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

export async function POST(request: Request) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const payload = await request.json().catch(() => null)
  const slug =
    payload && typeof payload.slug === 'string' ? payload.slug.trim() : null

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const timeZone = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'
  const todayKey = formatDateKey(new Date(), timeZone)

  try {
    await setManualWordForDate(todayKey, slug, {
      manual: true,
      userId: access.user.id,
      timeZone,
    })
    const bootstrap = await loadWordsBootstrap()
    return NextResponse.json(bootstrap)
  } catch (error) {
    console.error('Failed to update today word', error)
    return NextResponse.json(
      { error: 'Failed to update today word' },
      { status: 500 },
    )
  }
}
