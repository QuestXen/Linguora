import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from 'drizzle-orm'

import {
  authAccounts,
  authSessions,
  authUsers,
  db,
  type AuthAccount,
  type AuthUser,
  type QueryableDb,
} from '@/app/db/client'

const PROVIDERS_ORDER = ['github', 'google'] as const

export type AuthProvider = typeof PROVIDERS_ORDER[number]

export interface DashboardUserRecord {
  user: AuthUser
  providers: AuthProvider[]
}

export interface UserListOptions {
  query?: string
  limit?: number
  offset?: number
  provider?: AuthProvider | 'all'
}

export interface UserListResult {
  total: number
  users: DashboardUserRecord[]
}

const normalizeProviders = (accounts: AuthAccount[]) => {
  const set = new Set<AuthProvider>()
  accounts.forEach(account => {
    if (account.providerId === 'github' || account.providerId === 'google') {
      set.add(account.providerId)
    }
  })
  return PROVIDERS_ORDER.filter(provider => set.has(provider))
}

export const getUserById = async (
  userId: string,
  client: QueryableDb = db,
) =>
  client.query.authUsers.findFirst({
    where: eq(authUsers.id, userId),
  })

const buildUserFilters = (filters: UserListOptions) => {
  const predicates = []
  if (filters.query) {
    const term = `%${filters.query}%`
    predicates.push(
      or(ilike(authUsers.name, term), ilike(authUsers.email, term)),
    )
  }
  if (filters.provider && filters.provider !== 'all') {
    predicates.push(
      sql`exists (select 1 from ${authAccounts} where ${authAccounts.userId} = ${authUsers.id} and ${authAccounts.providerId} = ${filters.provider})`,
    )
  }
  if (predicates.length === 0) return undefined
  if (predicates.length === 1) return predicates[0]
  return and(...predicates)
}

export const listUsers = async (
  options: UserListOptions = {},
  client: QueryableDb = db,
): Promise<UserListResult> => {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100)
  const offset = Math.max(options.offset ?? 0, 0)
  const where = buildUserFilters(options)

  const [rows, [{ total }]] = await Promise.all([
    client
      .select()
      .from(authUsers)
      .where(where)
      .orderBy(desc(authUsers.createdAt))
      .limit(limit)
      .offset(offset),
    client
      .select({ total: sql<number>`count(*)` })
      .from(authUsers)
      .where(where),
  ])

  if (rows.length === 0) {
    return { total: Number(total ?? 0), users: [] }
  }

  const userIds = rows.map(row => row.id)
  const accounts = await client
    .select()
    .from(authAccounts)
    .where(inArray(authAccounts.userId, userIds))

  const accountMap = new Map<string, AuthAccount[]>()
  accounts.forEach(account => {
    const entry = accountMap.get(account.userId) ?? []
    entry.push(account)
    accountMap.set(account.userId, entry)
  })

  return {
    total: Number(total ?? 0),
    users: rows.map(row => ({
      user: row,
      providers: normalizeProviders(accountMap.get(row.id) ?? []),
    })),
  }
}

export const banUser = async (
  userId: string,
  reason: string | null,
  client: QueryableDb = db,
) => {
  const now = new Date()
  const [updated] = await client
    .update(authUsers)
    .set({
      isBanned: true,
      banReason: reason,
      bannedAt: now,
      updatedAt: now,
    })
    .where(eq(authUsers.id, userId))
    .returning()

  if (!updated) {
    throw new Error('User not found')
  }

  await client.delete(authSessions).where(eq(authSessions.userId, userId))
  return updated
}

export const unbanUser = async (
  userId: string,
  client: QueryableDb = db,
) => {
  const now = new Date()
  const [updated] = await client
    .update(authUsers)
    .set({
      isBanned: false,
      banReason: null,
      bannedAt: null,
      updatedAt: now,
    })
    .where(eq(authUsers.id, userId))
    .returning()

  if (!updated) {
    throw new Error('User not found')
  }

  return updated
}

export const deleteUser = async (
  userId: string,
  client: QueryableDb = db,
) => {
  await client.delete(authUsers).where(eq(authUsers.id, userId))
}
