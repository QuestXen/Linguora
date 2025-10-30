import { and, eq, gt, sql } from 'drizzle-orm'

import {
  db,
  type QueryableDb,
  wordSchedules,
  words,
  wordHistory,
  type Word,
  type WordSchedule,
  type WordHistory,
} from '@/app/db/client'

const DEFAULT_TIMEZONE = process.env.WORD_ROTATION_TZ || 'Europe/Berlin'

export interface EnsureOptions {
  manual?: boolean
  userId?: string | null
  timeZone?: string
  excludeSlugs?: string[]
}

export interface AssignmentResult {
  schedule: WordSchedule
  word: Word
}

export interface CurrentAndNextWord {
  current: AssignmentResult | null
  next: AssignmentResult | null
  exhausted: boolean
}

export interface WordHistoryEntry extends WordHistory {
  word: Word
}

export interface UpcomingScheduleEntry {
  dayKey: string
  date: Date
  assignment: AssignmentResult | null
}

const formatDateParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  const day = parts.find(part => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error(`Unable to derive date key for timezone ${timeZone}`)
  }

  return { year, month, day }
}

export const formatDateKey = (date: Date, timeZone = DEFAULT_TIMEZONE) => {
  const { year, month, day } = formatDateParts(date, timeZone)
  return `${year}-${month}-${day}`
}

export const parseDateKey = (dateKey: string, timeZone = DEFAULT_TIMEZONE) => {
  const [year, month, day] = dateKey.split('-').map(part => Number.parseInt(part, 10))
  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`)
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
  const formatted = formatter.formatToParts(date)
  const actualYear = formatted.find(part => part.type === 'year')?.value
  const actualMonth = formatted.find(part => part.type === 'month')?.value
  const actualDay = formatted.find(part => part.type === 'day')?.value

  return new Date(
    Number(actualYear),
    Number(actualMonth) - 1,
    Number(actualDay),
  )
}

const isTodayOrPast = (dateKey: string, timeZone = DEFAULT_TIMEZONE) => {
  const today = formatDateKey(new Date(), timeZone)
  return dateKey <= today
}

const fetchScheduleWithWord = async (client: QueryableDb, dayKey: string) =>
  client.query.wordSchedules.findFirst({
    where: eq(wordSchedules.scheduledFor, dayKey),
    with: { word: true },
  })

const recordWordUsage = async (
  client: QueryableDb,
  slug: string,
  dayKey: string,
) => {
  const existing = await client.query.wordHistory.findFirst({
    where: eq(wordHistory.slug, slug),
  })

  if (existing) {
    if (existing.lastShownOn === dayKey) {
      return
    }

    await client
      .update(wordHistory)
      .set({
        lastShownOn: dayKey,
        timesShown: existing.timesShown + 1,
        updatedAt: sql`now()`,
      })
      .where(eq(wordHistory.id, existing.id))
    return
  }

  await client
    .insert(wordHistory)
    .values({
      slug,
      firstShownOn: dayKey,
      lastShownOn: dayKey,
      timesShown: 1,
    })
}

const fetchPoolCandidates = async (
  client: QueryableDb,
  excludeSlugs: string[],
  dayKey: string,
) => {
  const [historySlugs, scheduleRows, wordRows] = await Promise.all([
    client.select({ slug: wordHistory.slug }).from(wordHistory),
    client
      .select({
        slug: wordSchedules.slug,
        scheduledFor: wordSchedules.scheduledFor,
      })
      .from(wordSchedules),
    client.select().from(words),
  ])

  const inHistory = new Set(historySlugs.map(entry => entry.slug))
  const futureScheduled = new Set(
    scheduleRows
      .filter(entry => entry.scheduledFor >= dayKey)
      .map(entry => entry.slug),
  )
  const excluded = new Set(excludeSlugs)

  return wordRows.filter(
    word =>
      !inHistory.has(word.slug) &&
      !futureScheduled.has(word.slug) &&
      !excluded.has(word.slug),
  )
}

const chooseRandomWord = (candidates: Word[]) => {
  if (candidates.length === 0) return null
  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index] ?? null
}

const insertSchedule = async (
  client: QueryableDb,
  slug: string,
  dayKey: string,
  options: EnsureOptions,
): Promise<WordSchedule | null> => {
  const [inserted] = await client
    .insert(wordSchedules)
    .values({
      slug,
      scheduledFor: dayKey,
      assignedByUserId: options.userId ?? null,
      isManual: Boolean(options.manual),
    })
    .onConflictDoUpdate({
      target: wordSchedules.scheduledFor,
      set: {
        slug,
        assignedByUserId: options.userId ?? null,
        isManual: Boolean(options.manual),
        updatedAt: sql`now()`,
      },
    })
    .returning()

  return inserted ?? null
}

export const ensureWordForDate = async (
  dayKey: string,
  options: EnsureOptions = {},
  client: QueryableDb = db,
): Promise<AssignmentResult | null> => {
  const timeZone = options.timeZone ?? DEFAULT_TIMEZONE
  const exclusion = new Set(options.excludeSlugs ?? [])
  const existing = await fetchScheduleWithWord(client, dayKey)
  if (existing?.word) {
    const shouldReassign = exclusion.has(existing.word.slug) && !existing.isManual
    if (!shouldReassign) {
      if (isTodayOrPast(dayKey, timeZone)) {
        await recordWordUsage(client, existing.word.slug, dayKey)
      }
      return { schedule: existing, word: existing.word }
    }
    exclusion.add(existing.word.slug)
    await client.delete(wordSchedules).where(eq(wordSchedules.id, existing.id))
  }

  if (options.manual && !options.userId) {
    throw new Error('Manual schedule updates require the acting user id')
  }

  const candidates = await fetchPoolCandidates(client, Array.from(exclusion), dayKey)
  const selected = chooseRandomWord(candidates)
  if (!selected) return null

  const schedule = await insertSchedule(client, selected.slug, dayKey, options)
  if (!schedule) return null

  if (isTodayOrPast(dayKey, timeZone)) {
    await recordWordUsage(client, selected.slug, dayKey)
  }

  return { schedule, word: selected }
}

export const ensureNextWord = async (
  options: EnsureOptions = {},
  client: QueryableDb = db,
): Promise<AssignmentResult | null> => {
  const timeZone = options.timeZone ?? DEFAULT_TIMEZONE
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowKey = formatDateKey(tomorrow, timeZone)
  return ensureWordForDate(tomorrowKey, options, client)
}

export const getUpcomingSchedule = async (
  days: number,
  options: EnsureOptions = {},
  client: QueryableDb = db,
): Promise<UpcomingScheduleEntry[]> => {
  if (days <= 0) return []
  const timeZone = options.timeZone ?? DEFAULT_TIMEZONE
  const today = new Date()
  const entries: UpcomingScheduleEntry[] = []
  const exclusion = new Set(options.excludeSlugs ?? [])

  for (let offset = 1; offset <= days; offset += 1) {
    const target = new Date(today)
    target.setDate(today.getDate() + offset)
    const dayKey = formatDateKey(target, timeZone)
    const assignment = await ensureWordForDate(
      dayKey,
      { ...options, manual: false, timeZone, excludeSlugs: Array.from(exclusion) },
      client,
    )
    if (assignment?.word) {
      exclusion.add(assignment.word.slug)
    }
    entries.push({
      dayKey,
      date: parseDateKey(dayKey, timeZone),
      assignment,
    })
  }

  return entries
}

export const countWordPool = async (
  _options: { timeZone?: string } = {},
  client: QueryableDb = db,
) => {
  void _options
  const [historyRows, wordRows] = await Promise.all([
    client.select({ slug: wordHistory.slug }).from(wordHistory),
    client.select({ slug: words.slug }).from(words),
  ])

  const served = new Set(historyRows.map(entry => entry.slug))
  return wordRows.reduce((acc, { slug }) => (served.has(slug) ? acc : acc + 1), 0)
}

export const setManualWordForDate = async (
  dayKey: string,
  slug: string,
  options: EnsureOptions,
  client: QueryableDb = db,
): Promise<AssignmentResult> => {
  const word = await client.query.words.findFirst({
    where: eq(words.slug, slug),
  })

  if (!word) {
    throw new Error(`Word with slug "${slug}" not found`)
  }

  const schedule = await insertSchedule(client, slug, dayKey, {
    ...options,
    manual: true,
  })

  if (!schedule) {
    throw new Error('Failed to store manual schedule')
  }

  if (isTodayOrPast(dayKey, options.timeZone ?? DEFAULT_TIMEZONE)) {
    await recordWordUsage(client, slug, dayKey)
  }

  return { schedule, word }
}

export const assignRandomManualWord = async (
  dayKey: string,
  options: EnsureOptions,
  client: QueryableDb = db,
): Promise<AssignmentResult | null> => {
  if (!options.userId) {
    throw new Error('Random schedule updates require the acting user id')
  }

  const timeZone = options.timeZone ?? DEFAULT_TIMEZONE
  const exclusion = new Set(options.excludeSlugs ?? [])
  const existing = await fetchScheduleWithWord(client, dayKey)
  if (existing?.word) {
    exclusion.add(existing.word.slug)
  }

  const candidates = await fetchPoolCandidates(client, Array.from(exclusion), dayKey)
  const selected = chooseRandomWord(candidates)

  const targetSlug =
    selected?.slug ??
    (existing?.word ? existing.word.slug : null)

  if (!targetSlug) {
    return null
  }

  const schedule = await insertSchedule(client, targetSlug, dayKey, {
    ...options,
    manual: true,
  })

  if (!schedule) {
    throw new Error('Failed to store manual schedule')
  }

  if (isTodayOrPast(dayKey, timeZone)) {
    await recordWordUsage(client, targetSlug, dayKey)
  }

  const word =
    selected ??
    (existing?.word && existing.word.slug === targetSlug ? existing.word : null)

  if (!word) {
    const refreshed = await fetchScheduleWithWord(client, dayKey)
    if (!refreshed?.word) {
      throw new Error('Failed to resolve scheduled word after update')
    }
    return { schedule: refreshed, word: refreshed.word }
  }

  return { schedule, word }
}

export const resetScheduleToAutomatic = async (
  dayKey: string,
  options: EnsureOptions = {},
  client: QueryableDb = db,
): Promise<AssignmentResult | null> => {
  const exclusion = new Set(options.excludeSlugs ?? [])
  const existing = await fetchScheduleWithWord(client, dayKey)
  if (existing?.word && existing.isManual) {
    exclusion.add(existing.word.slug)
    await client.delete(wordSchedules).where(eq(wordSchedules.id, existing.id))
  }

  return ensureWordForDate(
    dayKey,
    {
      timeZone: options.timeZone ?? DEFAULT_TIMEZONE,
      excludeSlugs: Array.from(exclusion),
    },
    client,
  )
}

export const removeFromHistory = async (
  slug: string,
  client: QueryableDb = db,
) => {
  await client.delete(wordHistory).where(eq(wordHistory.slug, slug))
}

export const getHistoryEntries = async (
  client: QueryableDb = db,
): Promise<WordHistoryEntry[]> => {
  const entries = await client.query.wordHistory.findMany({
    orderBy: (history, { desc }) => desc(history.lastShownOn),
    with: { word: true },
  })

  return entries.map(entry => ({
    ...entry,
    word: entry.word,
  }))
}

export const clearFutureAssignmentsForSlug = async (
  slug: string,
  dayKey: string,
  client: QueryableDb = db,
) => {
  await client
    .delete(wordSchedules)
    .where(
      and(
        eq(wordSchedules.slug, slug),
        gt(wordSchedules.scheduledFor, dayKey),
      ),
    )
}

export const getCurrentAndNextWord = async (
  timeZone = DEFAULT_TIMEZONE,
  client: QueryableDb = db,
): Promise<CurrentAndNextWord> => {
  const todayKey = formatDateKey(new Date(), timeZone)
  const todayAssignment = await ensureWordForDate(todayKey, { timeZone }, client)
  const nextAssignment = await ensureNextWord({ timeZone }, client)
  const exhausted = !nextAssignment

  return {
    current: todayAssignment,
    next: nextAssignment,
    exhausted,
  }
}
