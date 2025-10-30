import { and, eq } from 'drizzle-orm'

import {
  authAccounts,
  authUsers,
  db,
  type AuthUser,
  type QueryableDb,
} from '@/app/db/client'

const OWNER = 'QuestXen'
const REPO = 'Linguora'

const DEFAULT_CACHE_MINUTES = Number.parseInt(
  process.env.GITHUB_CONTRIBUTOR_CACHE_MINUTES ?? '',
  10,
) || 360

const RETRY_MINUTES_ON_FAILURE = 15

const ttlToDate = (minutes: number) => {
  const date = new Date()
  date.setMinutes(date.getMinutes() + minutes)
  return date
}

const resolveGitHubLogin = async (
  accountId: string,
  token: string | null,
) => {
  const url = `https://api.github.com/user/${accountId}`
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, { headers, cache: 'no-store' })
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error(`GitHub user lookup failed with status ${response.status}`)
  }

  const body = (await response.json()) as { login?: string | null }
  const login = body.login ?? null
  return login
}

const checkContributorViaCollaborators = async (
  login: string,
  token: string | null,
) => {
  if (!token) return null
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/collaborators/${login}`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  if (response.status === 204) return true
  if (response.status === 404) return false
  if (response.status === 403) return null
  return null
}

const checkContributorViaContributorsList = async (
  login: string,
  token: string | null,
) => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const normalized = login.toLowerCase()
  const maxPages = 5
  for (let page = 1; page <= maxPages; page += 1) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contributors?per_page=100&page=${page}`
    const response = await fetch(url, { headers, cache: 'no-store' })
    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as Array<{ login?: string }>
    const found = payload.some(
      entry => (entry.login ?? '').toLowerCase() === normalized,
    )
    if (found) return true
    if (payload.length < 100) break
  }
  return false
}

const determineContributor = async (login: string, token: string | null) => {
  const collaboratorResult = await checkContributorViaCollaborators(login, token)
  if (collaboratorResult !== null) {
    return collaboratorResult
  }

  const contributorsResult = await checkContributorViaContributorsList(
    login,
    token,
  )
  if (contributorsResult !== null) {
    return contributorsResult
  }

  return null
}

const loadGithubAccount = async (userId: string, client: QueryableDb) =>
  client.query.authAccounts.findFirst({
    where: and(
      eq(authAccounts.userId, userId),
      eq(authAccounts.providerId, 'github'),
    ),
  })

export interface ContributorStatus {
  isContributor: boolean
  login: string | null
  source: 'cache' | 'network' | 'unknown'
  checkedAt: Date | null
  expiresAt: Date | null
}

export const ensureContributorStatus = async (
  user: AuthUser,
  options: { force?: boolean } = {},
  client: QueryableDb = db,
): Promise<ContributorStatus> => {
  const now = new Date()
  if (!options.force && user.contributorExpiresAt) {
    const expiry = new Date(user.contributorExpiresAt)
    if (expiry > now && user.contributorState !== 'unknown') {
      return {
        isContributor: user.contributorState === 'verified',
        login: user.contributorLogin ?? null,
        source: 'cache',
        checkedAt: user.contributorCheckedAt
          ? new Date(user.contributorCheckedAt)
          : null,
        expiresAt: expiry,
      }
    }
  }

  const token = process.env.GITHUB_TOKEN ?? null
  const githubAccount = await loadGithubAccount(user.id, client)
  if (!githubAccount) {
    const expiresAt = ttlToDate(DEFAULT_CACHE_MINUTES)
    await client
      .update(authUsers)
      .set({
        contributorState: 'not_contributor',
        contributorCheckedAt: now,
        contributorExpiresAt: expiresAt,
        contributorLogin: null,
        updatedAt: now,
      })
      .where(eq(authUsers.id, user.id))

    return {
      isContributor: false,
      login: null,
      source: 'network',
      checkedAt: now,
      expiresAt,
    }
  }

  let login = user.contributorLogin ?? null
  if (!login) {
    try {
      login = await resolveGitHubLogin(githubAccount.accountId, token)
    } catch (error) {
      console.error('Failed to resolve GitHub login', error)
      const expiresAt = ttlToDate(RETRY_MINUTES_ON_FAILURE)
      await client
        .update(authUsers)
        .set({
          contributorState: 'unknown',
          contributorCheckedAt: now,
          contributorExpiresAt: expiresAt,
          updatedAt: now,
        })
        .where(eq(authUsers.id, user.id))
      return {
        isContributor: false,
        login: null,
        source: 'unknown',
        checkedAt: now,
        expiresAt,
      }
    }
  }

  if (!login) {
    const expiresAt = ttlToDate(DEFAULT_CACHE_MINUTES)
    await client
      .update(authUsers)
      .set({
        contributorState: 'not_contributor',
        contributorCheckedAt: now,
        contributorExpiresAt: expiresAt,
        contributorLogin: null,
        updatedAt: now,
      })
      .where(eq(authUsers.id, user.id))
    return {
      isContributor: false,
      login: null,
      source: 'network',
      checkedAt: now,
      expiresAt,
    }
  }

  let isContributor = false
  try {
    const determination = await determineContributor(login, token)
    if (determination === null) {
      const expiresAt = ttlToDate(RETRY_MINUTES_ON_FAILURE)
      await client
        .update(authUsers)
        .set({
          contributorState: 'unknown',
          contributorCheckedAt: now,
          contributorExpiresAt: expiresAt,
          contributorLogin: login,
          updatedAt: now,
        })
        .where(eq(authUsers.id, user.id))
      return {
        isContributor: false,
        login,
        source: 'unknown',
        checkedAt: now,
        expiresAt,
      }
    }
    isContributor = determination
  } catch (error) {
    console.error('GitHub contributor lookup failed', error)
    const expiresAt = ttlToDate(RETRY_MINUTES_ON_FAILURE)
    await client
      .update(authUsers)
      .set({
        contributorState: 'unknown',
        contributorCheckedAt: now,
        contributorExpiresAt: expiresAt,
        contributorLogin: login,
        updatedAt: now,
      })
      .where(eq(authUsers.id, user.id))
    return {
      isContributor: false,
      login,
      source: 'unknown',
      checkedAt: now,
      expiresAt,
    }
  }

  const expiresAt = ttlToDate(DEFAULT_CACHE_MINUTES)
  await client
    .update(authUsers)
    .set({
      contributorState: isContributor ? 'verified' : 'not_contributor',
      contributorCheckedAt: now,
      contributorExpiresAt: expiresAt,
      contributorLogin: login,
      updatedAt: now,
    })
    .where(eq(authUsers.id, user.id))

  return {
    isContributor,
    login,
    source: 'network',
    checkedAt: now,
    expiresAt,
  }
}
