import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import {
  authUsers,
  db,
  type AuthUser,
  type QueryableDb,
} from '@/app/db/client'
import { ensureContributorStatus } from '@/app/lib/contributor'

export type DashboardAccessReason =
  | 'not-authenticated'
  | 'banned'
  | 'missing-permission'

export interface DashboardAccessResult {
  allowed: boolean
  reason: DashboardAccessReason | null
  user: AuthUser | null
  isContributor: boolean
}

const hasRoleAccess = (user: AuthUser) =>
  user.role === 'admin' || user.hasDashboardAccess

const affirmsContributor = async (
  user: AuthUser,
  client: QueryableDb,
) => {
  const status = await ensureContributorStatus(user, {}, client)
  return status.isContributor
}

export const checkDashboardAccess = async (
  user: AuthUser | null,
  client: QueryableDb = db,
): Promise<DashboardAccessResult> => {
  if (!user) {
    return {
      allowed: false,
      reason: 'not-authenticated',
      user: null,
      isContributor: false,
    }
  }

  if (user.isBanned) {
    return {
      allowed: false,
      reason: 'banned',
      user,
      isContributor: false,
    }
  }

  if (hasRoleAccess(user)) {
    return {
      allowed: true,
      reason: null,
      user,
      isContributor: false,
    }
  }

  const isContributor = await affirmsContributor(user, client)
  if (isContributor) {
    return {
      allowed: true,
      reason: null,
      user,
      isContributor: true,
    }
  }

  return {
    allowed: false,
    reason: 'missing-permission',
    user,
    isContributor: false,
  }
}

export const requireDashboardAccess = async (
  userId: string | null,
  client: QueryableDb = db,
) => {
  if (!userId) {
    redirect('/')
  }

  const user = await client.query.authUsers.findFirst({
    where: eq(authUsers.id, userId),
  })

  if (!user) {
    redirect('/')
  }

  const access = await checkDashboardAccess(user, client)
  if (!access.allowed) {
    redirect('/')
  }

  return { user, isContributor: access.isContributor }
}
