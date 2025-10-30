import { NextResponse } from 'next/server'

import { wordImportSchema } from '@/app/dashboard/schemas'
import { auth } from '@/app/lib/auth'
import { checkDashboardAccess } from '@/app/lib/permissions'
import { getUserById } from '@/app/lib/users'
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

export async function POST(request: Request) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const rawPayload = await request.json().catch(() => null)
  let payload = rawPayload

  if (!Array.isArray(payload)) {
    if (payload && typeof payload === 'object') {
      const candidate = (payload as Record<string, unknown>).entries ?? (payload as Record<string, unknown>).words
      if (Array.isArray(candidate)) {
        payload = candidate
      } else {
        payload = [payload]
      }
    } else if (payload != null) {
      payload = [payload]
    }
  }

  const parsed = wordImportSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  let created = 0
  let updated = 0

  try {
    await db.transaction(async tx => {
      for (const entry of parsed.data) {
        const de = entry.de
        const now = new Date()
        const values = {
          slug: entry.slug,
          enWord: entry.en.word,
          enIpa: entry.en.ipa,
          enDefinition: entry.en.def,
          enExample: entry.en.ex,
          deWord: de.word,
          deIpa: de.ipa ?? null,
          deDefinition: de.def,
          deExample: de.ex ?? '',
          updatedAt: now,
        }

        const result = await tx
          .insert(words)
          .values({
            ...values,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: words.slug,
            set: values,
          })
          .returning({ updatedAt: words.updatedAt, createdAt: words.createdAt })

        if (result.length > 0) {
          const [row] = result
          if (row.createdAt.getTime() === row.updatedAt.getTime()) {
            created += 1
          } else {
            updated += 1
          }
        }
      }
    })
  } catch (error) {
    console.error('Failed to import words', error)
    return NextResponse.json(
      { error: 'Failed to import words' },
      { status: 500 },
    )
  }

  return NextResponse.json({ imported: parsed.data.length, created, updated })
}
