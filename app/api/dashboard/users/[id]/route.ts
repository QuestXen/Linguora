import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { auth } from '@/app/lib/auth'
import { checkDashboardAccess } from '@/app/lib/permissions'
import {
  banUser,
  deleteUser,
  getUserById,
  unbanUser,
} from '@/app/lib/users'
import { userUpdateSchema } from '@/app/dashboard/schemas'
import { authUsers, db } from '@/app/db/client'

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const { id: targetId } = await context.params
  const payload = await request.json().catch(() => null)
  const parsed = userUpdateSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  if (targetId === access.user.id && parsed.data.isBanned === true) {
    return NextResponse.json(
      { error: 'You cannot ban your own account.' },
      { status: 400 },
    )
  }

  let target = await getUserById(targetId)
  if (!target) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (parsed.data.isBanned !== undefined) {
    if (parsed.data.isBanned) {
      target = await banUser(targetId, parsed.data.banReason ?? null)
    } else {
      target = await unbanUser(targetId)
    }
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.hasDashboardAccess !== undefined) {
    updates.hasDashboardAccess = parsed.data.hasDashboardAccess
  }
  if (parsed.data.role) {
    if (targetId === access.user.id && parsed.data.role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot demote your own role.' },
        { status: 400 },
      )
    }
    updates.role = parsed.data.role
  }

  if (Object.keys(updates).length > 0) {
    const now = new Date()
    const [updated] = await db
      .update(authUsers)
      .set({
        ...updates,
        updatedAt: now,
      })
      .where(eq(authUsers.id, targetId))
      .returning()
    if (updated) {
      target = updated
    }
  }

  return NextResponse.json({ user: target })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const { id: targetId } = await context.params
  if (targetId === access.user.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account.' },
      { status: 400 },
    )
  }

  const target = await getUserById(targetId)
  if (!target) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteUser(targetId)
  return NextResponse.json({ ok: true })
}
