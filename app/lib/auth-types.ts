export interface SessionMetadata {
  id: string
  userId: string
  token?: string
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
  contributorState?: string | null
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
