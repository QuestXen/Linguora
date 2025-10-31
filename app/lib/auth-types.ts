const toOptionalISO = (value: Date | string | null | undefined): string | null => {
  if (value === null || value === undefined) return null
  return value instanceof Date ? value.toISOString() : value
}

export interface SessionMetadata {
  id: string
  userId: string
  token?: string | null
  expiresAt: string
  createdAt: string
  updatedAt: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface SessionUser {
  id: string
  name: string | null
  email: string
  image?: string | null
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  role?: string | null
  hasDashboardAccess?: boolean
  isBanned?: boolean
  bannedAt?: string | null
  banReason?: string | null
  lastSeenAt?: string | null
  contributorState?: string | null
  contributorCheckedAt?: string | null
  contributorExpiresAt?: string | null
  contributorLogin?: string | null
}

export interface SessionPermissions {
  dashboard?: boolean
  reason?: string | null
  isContributor?: boolean
}

export interface SessionEnvelope {
  session: SessionMetadata
  user: SessionUser
  permissions?: SessionPermissions
}

export const sessionDateToString = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : value

export const sessionFieldToNullableString = (
  value: Date | string | null | undefined,
): string | null => toOptionalISO(value)
