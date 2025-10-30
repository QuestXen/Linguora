import { NextResponse } from 'next/server'

import {
  formatDateKey,
  getCurrentAndNextWord,
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

const determineTargetDay = () => {
  const tz = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dayKey = formatDateKey(tomorrow, tz)
  return { dayKey, timeZone: tz }
}

export async function POST(request: Request) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const payload = await request.json().catch(() => null)
  const slug = payload && typeof payload.slug === 'string' ? payload.slug : null
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const { dayKey, timeZone } = determineTargetDay()

  try {
    await setManualWordForDate(
      dayKey,
      slug,
      { manual: true, userId: access.user.id, timeZone },
    )
    const rotation = await getCurrentAndNextWord(timeZone)
    return NextResponse.json(rotation)
  } catch (error) {
    console.error('Failed to override next word', error)
    return NextResponse.json(
      { error: 'Failed to override next word' },
      { status: 500 },
    )
  }
}
