import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { auth } from '@/app/lib/auth'
import { checkDashboardAccess } from '@/app/lib/permissions'
import { getUserById } from '@/app/lib/users'
import { wordUpdateSchema } from '@/app/dashboard/schemas'
import { db, words } from '@/app/db/client'

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
  context: { params: Promise<{ slug: string }> },
) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const { slug } = await context.params
  const payload = await request.json().catch(() => null)
  const parsed = wordUpdateSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const updateData = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  )

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const [updated] = await db
    .update(words)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(words.slug, slug))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ item: updated })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const { slug } = await context.params
  const [deleted] = await db
    .delete(words)
    .where(eq(words.slug, slug))
    .returning()

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
