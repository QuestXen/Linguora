import { count, gt, sql } from 'drizzle-orm'

import {
  countWordPool,
  getCurrentAndNextWord,
  getHistoryEntries,
  getUpcomingSchedule,
} from '@/app/lib/word-rotation'
import {
  authUsers,
  db,
  wordHistory,
  type Word,
} from '@/app/db/client'
import type {
  OverviewSnapshot,
  WordCore,
  WordHistoryItem,
  WordsBootstrap,
} from '@/app/dashboard/types'

const toWordCore = (word: Word | null): WordCore | null => {
  if (!word) return null
  return {
    slug: word.slug,
    enWord: word.enWord,
    deWord: word.deWord,
    enDefinition: word.enDefinition,
    enExample: word.enExample,
    deDefinition: word.deDefinition,
    deExample: word.deExample,
    enIpa: word.enIpa ?? null,
    deIpa: word.deIpa ?? null,
  }
}

const toIsoString = (value: string | Date | null | undefined) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

const ACTIVE_WINDOW_DAYS = 7

export const loadOverviewSnapshot = async (): Promise<OverviewSnapshot> => {
  const timeZone = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const [poolSize, usedRows, registeredRows, activeRows] = await Promise.all([
    countWordPool({ timeZone }),
    db.select({ usedWords: count() }).from(wordHistory),
    db.select({ registeredUsers: count() }).from(authUsers),
    db
      .select({
        activeUsers: sql<number>`count(*)`,
      })
      .from(authUsers)
      .where(gt(authUsers.lastSeenAt, cutoff)),
  ])

  const usedWords = Number(usedRows[0]?.usedWords ?? 0)
  const registeredUsers = Number(registeredRows[0]?.registeredUsers ?? 0)
  const activeUsers = Number(activeRows[0]?.activeUsers ?? 0)

  return {
    wordsInPool: poolSize,
    usedWords,
    registeredUsers,
    activeUsers,
  }
}

export const loadWordsBootstrap = async (): Promise<WordsBootstrap> => {
  const timeZone = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'

  const [rotation, upcoming, history, poolSize] = await Promise.all([
    getCurrentAndNextWord(timeZone),
    getUpcomingSchedule(7, { timeZone }),
    getHistoryEntries(),
    countWordPool({ timeZone }),
  ])

  const todayAssignment = rotation.current
  const todayDate =
    todayAssignment?.schedule.scheduledFor ?? new Date().toISOString()

  const historyItems: WordHistoryItem[] = history.map(entry => ({
    id: entry.id,
    slug: entry.slug,
    enWord: entry.word.enWord,
    deWord: entry.word.deWord,
    timesShown: entry.timesShown,
    firstShownOn: toIsoString(entry.firstShownOn) ?? '',
    lastShownOn: toIsoString(entry.lastShownOn) ?? '',
  }))

  return {
    today: {
      dateISO: toIsoString(todayDate) ?? new Date().toISOString(),
      word: toWordCore(todayAssignment?.word ?? null),
    },
    upcoming: upcoming.map(item => ({
      dayKey: item.dayKey,
      dateISO: toIsoString(item.date) ?? new Date(item.dayKey).toISOString(),
      isManual: Boolean(item.assignment?.schedule.isManual),
      word: toWordCore(item.assignment?.word ?? null),
    })),
    history: historyItems,
    poolSize,
    exhausted: rotation.exhausted,
  }
}
