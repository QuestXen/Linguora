import { NextResponse } from 'next/server'
import { asc, desc, ilike, or, sql } from 'drizzle-orm'

import { auth } from '@/app/lib/auth'
import { checkDashboardAccess } from '@/app/lib/permissions'
import { getUserById } from '@/app/lib/users'
import { wordInputSchema } from '@/app/dashboard/schemas'
import { db, words } from '@/app/db/client'

const parsePagination = (url: URL) => {
  const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10)
  const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20', 10)
  const limit = Math.min(Math.max(pageSize, 1), 100)
  const currentPage = Math.max(page, 1)
  const offset = (currentPage - 1) * limit
  return { limit, offset, currentPage }
}

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
  const query = url.searchParams.get('q')
  const sort = url.searchParams.get('sort') ?? 'recent'
  const { limit, offset, currentPage } = parsePagination(url)

  const where =
    query && query.trim().length > 0
      ? or(
          ilike(words.slug, `%${query}%`),
          ilike(words.enWord, `%${query}%`),
          ilike(words.deWord, `%${query}%`),
        )
      : undefined

  const orderBy =
    sort === 'alphabetical'
      ? asc(words.slug)
      : sort === 'alphabetical-desc'
        ? desc(words.slug)
        : desc(words.createdAt)

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(words)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(words).where(where),
  ])

  const totalCount = Number(total ?? 0)
  return NextResponse.json({
    items: rows,
    page: currentPage,
    pageSize: limit,
    total: totalCount,
    totalPages: Math.max(Math.ceil(totalCount / limit), 1),
  })
}

export async function POST(request: Request) {
  const access = await ensureDashboardAccess(request)
  if ('error' in access) return access.error

  const payload = await request.json().catch(() => null)
  const parsed = wordInputSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const [created] = await db
      .insert(words)
      .values({
        slug: parsed.data.slug,
        enWord: parsed.data.enWord,
        enIpa: parsed.data.enIpa,
        enDefinition: parsed.data.enDefinition,
        enExample: parsed.data.enExample,
        deWord: parsed.data.deWord,
        deIpa: parsed.data.deIpa,
        deDefinition: parsed.data.deDefinition,
        deExample: parsed.data.deExample,
      })
      .returning()

    return NextResponse.json({ item: created })
  } catch (error) {
    console.error('Failed to create word', error)
    return NextResponse.json(
      { error: 'Failed to create word' },
      { status: 500 },
    )
  }
}
