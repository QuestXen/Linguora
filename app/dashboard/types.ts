import type { AuthUser } from '@/app/db/client'

export interface OverviewSnapshot {
  wordsInPool: number
  usedWords: number
  registeredUsers: number
  activeUsers: number
}

export interface WordCore {
  slug: string
  enWord: string
  deWord: string
  enDefinition: string
  enExample: string
  deDefinition: string
  deExample: string
  enIpa: string | null
  deIpa: string | null
}

export interface TodayWord {
  dateISO: string
  word: WordCore | null
}

export interface UpcomingWordEntry {
  dayKey: string
  dateISO: string
  isManual: boolean
  word: WordCore | null
}

export interface WordHistoryItem {
  id: number
  slug: string
  enWord: string
  deWord: string
  timesShown: number
  firstShownOn: string
  lastShownOn: string
}

export interface WordsBootstrap {
  today: TodayWord
  upcoming: UpcomingWordEntry[]
  history: WordHistoryItem[]
  poolSize: number
  exhausted: boolean
}

export interface WordListResponse {
  items: Array<{
    slug: string
    enWord: string
    deWord: string
    enDefinition: string
    enExample: string
    deDefinition: string
    deExample: string
    enIpa: string | null
    deIpa: string | null
    createdAt: string
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface DashboardUserListItem {
  user: AuthUser
  providers: string[]
}

export interface DashboardNavItem {
  href: string
  label: string
}
