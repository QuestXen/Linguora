import { NextResponse } from 'next/server'

import { loadWordsBootstrap } from '@/app/dashboard/data'
import {
  assignRandomManualWord,
  formatDateKey,
  parseDateKey,
  resetScheduleToAutomatic,
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

const isIsoDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

const resolveDayKey = async (
  context: { params: Promise<{ day: string }> },
  timeZone: string,
) => {
  const { day } = await context.params
  if (!isIsoDateKey(day)) {
    return { error: NextResponse.json({ error: 'Invalid day key' }, { status: 400 }) }
  }

  const todayKey = formatDateKey(new Date(), timeZone)
  if (day < todayKey) {
    return {
      error: NextResponse.json(
        { error: 'Cannot modify schedule for past dates' },
        { status: 400 },
      ),
    }
  }

  try {
    parseDateKey(day, timeZone)
  } catch {
    return { error: NextResponse.json({ error: 'Invalid date' }, { status: 400 }) }
  }

  return { dayKey: day }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ day: string }> },
) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const timeZone = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'
  const resolved = await resolveDayKey(context, timeZone)
  if ('error' in resolved) return resolved.error
  const { dayKey } = resolved

  const payload = await request.json().catch(() => null)
  const slug =
    payload && typeof payload.slug === 'string' ? payload.slug.trim() : null
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  try {
    await setManualWordForDate(dayKey, slug, {
      manual: true,
      userId: access.user.id,
      timeZone,
    })
    const bootstrap = await loadWordsBootstrap()
    return NextResponse.json(bootstrap)
  } catch (error) {
    console.error('Failed to update scheduled word', error)
    return NextResponse.json(
      { error: 'Failed to update scheduled word' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ day: string }> },
) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const timeZone = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'
  const resolved = await resolveDayKey(context, timeZone)
  if ('error' in resolved) return resolved.error
  const { dayKey } = resolved

  try {
    const result = await assignRandomManualWord(dayKey, {
      manual: true,
      userId: access.user.id,
      timeZone,
    })
    if (!result) {
      return NextResponse.json(
        { error: 'No available words to assign' },
        { status: 409 },
      )
    }
    const bootstrap = await loadWordsBootstrap()
    return NextResponse.json(bootstrap)
  } catch (error) {
    console.error('Failed to randomize scheduled word', error)
    return NextResponse.json(
      { error: 'Failed to randomize scheduled word' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ day: string }> },
) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const timeZone = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'
  const resolved = await resolveDayKey(context, timeZone)
  if ('error' in resolved) return resolved.error
  const { dayKey } = resolved

  try {
    await resetScheduleToAutomatic(dayKey, { timeZone })
    const bootstrap = await loadWordsBootstrap()
    return NextResponse.json(bootstrap)
  } catch (error) {
    console.error('Failed to reset scheduled word', error)
    return NextResponse.json(
      { error: 'Failed to reset scheduled word' },
      { status: 500 },
    )
  }
}
